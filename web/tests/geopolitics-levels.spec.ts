import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { addPassageHighlight, addSystemsConnection, advanceSystemsToCanvas, generateExercise } from "./helpers/exercise-flow";

const GEO = "US-China strategic competition";

async function learnFirst(page: Page) {
  await expect(page.getByText("Part 1 of 3 · Learn first")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("radio", { name: "Keeping ties with both rivals" }).click();
  await page.getByRole("button", { name: "Start the exercise" }).click();
  await expect(page.getByText("Part 2 of 3 · Highlight & tag")).toBeVisible();
}

async function pickLenses(page: Page) {
  for (const answer of [
    "A contest for control of sea lanes",
    "Room for a rules-based forum",
    "How each side's story of the past shapes trust",
    "Who gains from trade routes and who pays",
  ]) {
    await page.getByTestId("lens-step").getByRole("radio", { name: answer }).click();
  }
}

test.describe("Geopolitics levels (PLAN-geopolitics.md G1)", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("analytical guided: learn first, 2 issues and 1 trap, pick viewpoint, actors and lenses, scored reveal", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, GEO, { level: "Guided" });
    await learnFirst(page);

    await expect(page.getByTestId("issue-count-hint")).toContainText("2 issues and 1 trap");
    await expect(page.getByTestId("fiction-label")).toBeVisible();
    await expect(page.getByTestId("check-questions")).toContainText("Who is affected but never mentioned?");

    await page.getByTestId("passage-sentence").filter({ hasText: "neutral regional forum" }).click();
    await page.getByTestId("tag-picker-region").getByRole("button", { name: /Framing Bias/ }).click();
    await page.getByRole("button", { name: "Continue to perspective guess" }).click();

    await expect(page.getByText("Part 3 of 3 · Viewpoint & lenses")).toBeVisible();
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    await expect(page.getByText("Pick whose viewpoint the passage is written from.")).toBeVisible();

    await page.getByTestId("perspective-options").getByRole("radio", { name: "ASEAN neutral broker framing" }).click();
    await page.getByTestId("actor-options").getByRole("button", { name: "Fishing communities" }).click();
    await expect(page.getByTestId("lens-question")).toHaveCount(4);
    await pickLenses(page);
    await page.getByRole("button", { name: "Get AI feedback" }).click();

    const reveal = page.getByTestId("geo-reveal");
    await expect(reveal).toBeVisible({ timeout: 15_000 });
    await expect(reveal).toContainText("Right viewpoint");
    await expect(reveal).toContainText("1/1");
    await expect(reveal).toContainText("100");
    await expect(reveal.getByTestId("lens-reveal")).toHaveCount(4);
    await expect(page.getByTestId("analytical-answer-key")).toBeVisible();
  });

  test("analytical expert: write the viewpoint first, then pick; write each lens", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, GEO, { level: "Expert" });
    await learnFirst(page);
    await expect(page.getByTestId("issue-count-hint")).toHaveCount(0);
    await addPassageHighlight(page);
    await page.getByRole("button", { name: "Continue to perspective guess" }).click();

    await page.getByTestId("perspective-options").getByRole("radio", { name: "US-aligned think tank" }).click();
    await page.getByTestId("actor-options").getByRole("button", { name: "Large powers" }).click();
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    await expect(page.getByText("Write whose viewpoint you think it is, before you pick.")).toBeVisible();

    await page.getByLabel("Your guess in your own words").fill("A small regional state that wants both powers kept at arm's length.");
    for (const box of await page.getByTestId("lens-step").getByRole("textbox").all()) await box.fill("One sentence through this lens.");
    await page.getByRole("button", { name: "Get AI feedback" }).click();

    const reveal = page.getByTestId("geo-reveal");
    await expect(reveal).toBeVisible({ timeout: 15_000 });
    await expect(reveal).toContainText("(you picked: US-aligned think tank)");
    await expect(reveal).toContainText("You also picked 1 actor");
  });

  test("systems standard: predict the other side's view before seeing it", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await generateExercise(page, GEO, { level: "Standard" });
    await advanceSystemsToCanvas(page);
    await addSystemsConnection(page);
    await page.getByRole("button", { name: "Done connecting" }).click();
    await page.locator(".react-flow__node").nth(0).click();
    await page.getByRole("button", { name: "Continue to perspective comparison" }).click();

    const predict = page.getByTestId("predict-b");
    await expect(predict).toContainText("Country B");
    await expect(page.getByLabel(/What structural differences matter most/)).toHaveCount(0);
    const show = predict.getByRole("button", { name: "Show Country B's view" });
    await expect(show).toBeDisabled();
    await predict.getByRole("button", { name: "Auth Service" }).click();
    await show.click();

    await expect(page.getByTestId("predict-b-result")).toContainText("1 of 2");
    await page
      .getByLabel(/What structural differences matter most/)
      .fill("Country B relies on the cache and auth paths far more than Country A does.");
    await page.getByRole("button", { name: "Submit and get AI reflection" }).click();
    await expect(page.getByTestId("systems-answer-key")).toBeVisible({ timeout: 15_000 });
  });

  test("systems guided: one perspective, straight to feedback", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await generateExercise(page, GEO, { level: "Guided" });
    await advanceSystemsToCanvas(page);
    await addSystemsConnection(page);
    await page.getByRole("button", { name: "Done connecting" }).click();
    await page.locator(".react-flow__node").nth(0).click();
    await page.getByRole("button", { name: "Submit impact and get AI reflection" }).click();
    await expect(page.getByTestId("systems-answer-key")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("predict-b")).toHaveCount(0);
  });
});
