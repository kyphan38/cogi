import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import {
  addPassageHighlight,
  addSystemsConnection,
  advanceEvaluativeToMatrix,
  advanceSystemsToCanvas,
  choosePracticeLevel,
  generateExercise,
  selectEvaluativeTaskType,
} from "./helpers/exercise-flow";

/**
 * Safety net for the flow refactor (PLAN-refactor.md): for every exercise type, an edit
 * is autosaved without leaving the page, and a reload resumes on the same step with it.
 */

type Row = Record<string, unknown>;

/** The one exercise row in the E2E store (each test starts with an empty store). */
async function savedExercise(page: Page): Promise<Row | null> {
  return page.evaluate(() => {
    const raw = window.sessionStorage.getItem("cogi:e2e-firestore");
    if (!raw) return null;
    const stores = JSON.parse(raw) as Record<string, Record<string, Record<string, Row>>>;
    const rows = Object.values(stores).flatMap((cols) => Object.values(cols.exercises ?? {}));
    return rows[0] ?? null;
  });
}

/** Wait until the autosave wrote what `pick` reads. Fails if the save never lands. */
async function expectSaved(page: Page, pick: (row: Row) => unknown, expected: unknown): Promise<void> {
  await expect
    .poll(async () => {
      const row = await savedExercise(page);
      return row ? pick(row) : undefined;
    }, { timeout: 8_000 })
    .toEqual(expected);
}

const count = (v: unknown) => (Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : 0);

async function reloadExercise(page: Page): Promise<void> {
  await expect(page).toHaveURL(/resumeId=/);
  await page.reload();
}

test.describe("Resume and autosave", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("analytical: highlights autosave and come back after reload", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "DevOps");
    await expect(page.getByText("Structural reasoning passage")).toBeVisible({ timeout: 15_000 });

    await addPassageHighlight(page);
    await expectSaved(page, (r) => count(r.userHighlights) > 0, true);

    await reloadExercise(page);
    await expect(page.getByText("Structural reasoning passage")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("highlight-chip").first()).toBeVisible();
  });

  test("systems: a connection autosaves and comes back after reload", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await generateExercise(page, "DevOps");
    await expect(page.getByText("Cloud Infrastructure Dependencies")).toBeVisible({ timeout: 15_000 });
    await advanceSystemsToCanvas(page);

    await addSystemsConnection(page);
    await expectSaved(page, (r) => count(r.userEdges), 1);

    await reloadExercise(page);
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  });

  test("evaluative: a score autosaves and comes back after reload", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await selectEvaluativeTaskType(page, "Dealbreaker check");
    await generateExercise(page, "Vendor Selection");
    await expect(page.getByText("Amazon Cloud")).toBeVisible({ timeout: 15_000 });
    await advanceEvaluativeToMatrix(page);

    await expectSaved(page, (r) => r.currentStep, 2);
    const scoring = (r: Row) => JSON.stringify([r.scores ?? {}, r.criterionWeights ?? {}]);
    const savedBefore = scoring((await savedExercise(page))!);

    // Scoring the deal-breaker criterion low disqualifies the option (same move as the dealbreaker spec).
    await expect(page.getByText("Budget Cloud Co disqualified")).toHaveCount(0);
    await page.getByRole("row", { name: /Budget Cloud Co/ }).getByRole("slider").first().focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("Budget Cloud Co disqualified")).toBeVisible();
    await expect
      .poll(async () => scoring((await savedExercise(page)) ?? {}), { timeout: 8_000 })
      .not.toBe(savedBefore);

    await reloadExercise(page);
    await expect(page.getByText("Budget Cloud Co disqualified")).toBeVisible({ timeout: 15_000 });
  });

  test("strategy: the reason autosaves and comes back after reload", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/strategy");
    await choosePracticeLevel(page, "Guided");
    await page.getByRole("button", { name: "Generate exercise" }).click();
    await expect(page.getByText("Food truck price war")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Check yourself" }).click();
    await page.getByRole("radio", { name: "Your best choice given the other's choice" }).click();
    await page.getByRole("button", { name: "Start the exercise" }).click();
    for (let i = 0; i < 4; i++) {
      await page.getByTestId("best-reply-question").getByRole("radio", { name: "Cut price" }).click();
      await page.getByRole("button", { name: i < 3 ? "Next question" : "Predict the outcome" }).click();
    }
    await expect(page.getByText("Part 3 of 3 · Predict the outcome")).toBeVisible();

    const why = "Cutting is best whatever the other does.";
    await page.getByLabel(/Why do they end up there/).fill(why);
    await expectSaved(page, (r) => [r.part, r.userWhy], ["predict", why]);

    await reloadExercise(page);
    await expect(page.getByText("Part 3 of 3 · Predict the outcome")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel(/Why do they end up there/)).toHaveValue(why);
  });

  test("judgment: a lens answer autosaves and comes back after reload", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/judgment");
    await choosePracticeLevel(page, "Guided");
    await page.getByTestId("life-areas").getByRole("button", { name: "Work" }).click();
    await page.getByRole("button", { name: "Generate exercise" }).click();
    await expect(page.getByText("Criticized in a meeting")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Check yourself" }).click();
    await page.getByRole("radio", { name: "To keep respect on both sides" }).click();
    await page.getByRole("button", { name: "Start the exercise" }).click();
    await expect(page.getByText("Part 2 of 3 · Three lenses")).toBeVisible();

    await page.getByRole("radio", { name: "The wrong number" }).click();
    await expectSaved(page, (r) => [r.part, count(r.lensAnswers)], ["lenses", 1]);

    await reloadExercise(page);
    await expect(page.getByText("Part 2 of 3 · Three lenses")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("radio", { name: "The wrong number" })).toBeChecked();
  });

  test("reframe: the feeling autosaves and comes back after reload", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/reframe");
    await choosePracticeLevel(page, "Guided");
    await page.getByTestId("reframe-areas").getByRole("button", { name: "Work" }).click();
    await page.getByRole("button", { name: "Generate exercise" }).click();
    await expect(page.getByText("A comment in the meeting")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Check yourself" }).click();
    await page.getByRole("radio", { name: "I missed the deadline by a day" }).click();
    await page.getByRole("button", { name: "Start the exercise" }).click();
    await expect(page.getByText("Part 2 of 3 · Spot the traps")).toBeVisible();

    const feeling = page.getByRole("radiogroup", { name: "Main feeling" }).getByRole("radio", { name: "Embarrassed" });
    await feeling.click();
    await expectSaved(page, (r) => [r.part, typeof r.feeling === "string" && r.feeling.length > 0], ["spot", true]);

    await reloadExercise(page);
    await expect(page.getByText("Part 2 of 3 · Spot the traps")).toBeVisible({ timeout: 15_000 });
    await expect(feeling).toBeChecked();
  });

  test("tricky: a written answer autosaves and comes back after reload", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/tricky");
    await choosePracticeLevel(page, "Standard");
    await page.getByRole("button", { name: "Generate exercise" }).click();
    await expect(page.getByText("Pick one of two colleagues")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Check yourself" }).click();
    await page.getByRole("radio", { name: "Name what the work needs first" }).click();
    await page.getByRole("button", { name: "Start the exercise" }).click();
    await expect(page.getByText("Part 2 of 2 · Answer")).toBeVisible();

    const answer = "It depends on what the project needs most.";
    await page.getByLabel("What do you say?").fill(answer);
    await expectSaved(page, (r) => [r.part, Array.isArray(r.answers) ? r.answers[0] : null], ["rounds", answer]);

    await reloadExercise(page);
    await expect(page.getByText("Part 2 of 2 · Answer")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("What do you say?")).toHaveValue(answer);
  });

  test("humor: a picked reply autosaves and comes back after reload", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/humor");
    await choosePracticeLevel(page, "Guided");
    await page.getByRole("button", { name: "Generate exercise" }).click();
    await expect(page.getByText("Camera on the ceiling")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Check yourself" }).click();
    await page.getByRole("radio", { name: "Laughing at yourself" }).click();
    await page.getByRole("button", { name: "Start the exercise" }).click();
    await expect(page.getByText("Part 2 of 2 · Reply")).toBeVisible();

    await page.getByRole("radio", { name: /Mock best 1/ }).click();
    await page.getByRole("button", { name: "Next moment" }).click();
    await expectSaved(page, (r) => [r.part, r.roundsDone, count(r.picks)], ["rounds", 1, 1]);

    await reloadExercise(page);
    await expect(page.getByText("Part 2 of 2 · Reply")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Moment 2 of 3")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Mock best 1/ })).toBeChecked();
  });

  test("calibration: answers autosave and come back after reload", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/calibration");
    await choosePracticeLevel(page, "Guided");
    await page.getByTestId("calibration-topics").getByRole("button", { name: "Science", exact: true }).click();
    await page.getByRole("button", { name: "Start exercise" }).click();
    await page.getByRole("button", { name: "Check yourself" }).click();
    await page.getByRole("radio", { name: "About 9" }).click();
    await page.getByRole("button", { name: "Start the exercise" }).click();
    await expect(page.getByText("Part 2 of 2 · Answer and say how sure")).toBeVisible();

    const first = page.getByTestId("calibration-item").first().getByRole("radiogroup");
    await first.nth(0).getByRole("radio").first().click();
    await first.nth(1).getByRole("radio", { name: "80%" }).click();
    await expect(page.getByTestId("answered-count")).toHaveText("1 of 9 answered");
    await expectSaved(page, (r) => [r.part, count(r.answers)], ["answer", 1]);

    await reloadExercise(page);
    await expect(page.getByText("Part 2 of 2 · Answer and say how sure")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("answered-count")).toHaveText("1 of 9 answered");
  });
});
