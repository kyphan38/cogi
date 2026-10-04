import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, clickMainNavLink, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { choosePracticeLevel } from "./helpers/exercise-flow";

async function start(page: Page, level: "Guided" | "Standard" | "Expert") {
  await gotoAuthenticated(page, "/exercise/reframe");
  await expect(page.getByRole("heading", { name: "Reframe" })).toBeVisible();
  await choosePracticeLevel(page, level);
  await page.getByTestId("reframe-areas").getByRole("button", { name: "Work" }).click();
  await page.getByRole("button", { name: "Generate exercise" }).click();
  await expect(page.getByText("A comment in the meeting")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Part 1 of 3 · Learn first")).toBeVisible();
  await page.getByRole("radio", { name: "I missed the deadline by a day" }).click();
  await page.getByRole("button", { name: "Start the exercise" }).click();
  await expect(page.getByText("Part 2 of 3 · Spot the traps")).toBeVisible();
}

async function nameFeeling(page: Page) {
  await page.getByRole("radiogroup", { name: "Main feeling" }).getByRole("radio", { name: "Embarrassed" }).click();
}

test.describe("Reframe", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("guided: name the feeling, one thought at a time, choose the balanced thought, feedback, History", async ({ page }) => {
    await start(page, "Guided");
    await expect(page.getByTestId("count-hint")).toContainText("3 of these thoughts are traps and 1 is realistic");
    await nameFeeling(page);
    for (const [answer, next] of [
      [/^Mind reading/, "Next thought"],
      [/^All-or-nothing/, "Next thought"], // wrong: catastrophizing
      [/^Should statements/, "Next thought"],
      [/^Realistic/, "Reframe a thought"],
    ] as const) {
      await page.getByTestId("thought-question").getByRole("radio", { name: answer }).click();
      await expect(page.getByTestId("thought-feedback")).toBeVisible();
      await page.getByRole("button", { name: next }).click();
    }

    await expect(page.getByText("Part 3 of 3 · Reframe")).toBeVisible();
    await expect(page.getByTestId("rewrite-target")).toContainText("I will lose my job over this.");
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    await expect(page.getByText("Pick the most balanced thought.")).toBeVisible();
    await page.getByRole("radio", { name: /people rarely lose a job over one/ }).click();
    await page.getByRole("button", { name: "Get AI feedback" }).click();

    const key = page.getByTestId("reframe-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("Traps found")).toBeVisible();
    await expect(key.getByText("You picked the balanced thought")).toBeVisible();
    await expect(key.getByText("Mock why: one comment does not end a job.")).toBeVisible();
    await expect(key.getByText("Embarrassed, before → after")).toBeVisible();
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

    await clickMainNavLink(page, "History", /\/exercise\/history/);
    await page.getByRole("button", { name: /A comment in the meeting/ }).first().click();
    await expect(page.getByTestId("reframe-answer-key")).toBeVisible();
  });

  test("standard: all thoughts on one screen, write a balanced thought, My situation available", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/reframe");
    await choosePracticeLevel(page, "Standard");
    await page.getByRole("button", { name: "My situation" }).click();
    await expect(page.getByLabel("My situation")).toBeVisible();
    await page.getByRole("button", { name: "A new situation" }).click();
    await start(page, "Standard");

    await expect(page.getByTestId("count-hint")).toContainText("4 of these 6 thoughts are traps.");
    await expect(page.getByTestId("thought-question")).toHaveCount(6);
    const next = page.getByRole("button", { name: "Reframe a thought" });
    await expect(next).toBeDisabled();
    await nameFeeling(page);
    for (const q of await page.getByTestId("thought-question").all()) {
      await q.getByRole("radio", { name: "Realistic" }).click();
    }
    await next.click();
    await page.getByLabel("Your balanced thought").fill("I made one mistake, and I can fix it today.");
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    const key = page.getByTestId("reframe-answer-key");
    await expect(key.getByText("What you wrote")).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("A reference version:")).toBeVisible();
  });

  test("expert: tap thoughts in a monologue, write evidence; guided hides My situation", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/reframe");
    await choosePracticeLevel(page, "Guided");
    await expect(page.getByRole("button", { name: "My situation" })).toHaveCount(0);

    await start(page, "Expert");
    await nameFeeling(page);
    const monologue = page.getByTestId("monologue");
    await monologue.getByRole("button", { name: "I will lose my job over this." }).click();
    await page.getByTestId("thought-question").getByRole("radio", { name: "Catastrophizing" }).click();
    await expect(monologue).toContainText("[Catastrophizing]");
    await page.getByRole("button", { name: "Reframe a thought" }).click();
    await page.getByLabel("What facts support this thought?").fill("I made a mistake in front of the team.");
    await page.getByLabel("What facts do not fit it?").fill("Nobody has lost a job for one number.");
    await page.getByLabel("Your balanced thought").fill("It was a real mistake, and I can fix it today.");
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    const key = page.getByTestId("reframe-answer-key");
    await expect(key.getByText("Evidence against: Nobody has lost a job for one number.")).toBeVisible({ timeout: 15_000 });
  });

  test("my situation: a situation that needs real support shows a support message, not an exercise", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/reframe");
    await choosePracticeLevel(page, "Standard");
    await page.getByRole("button", { name: "My situation" }).click();
    await page.getByLabel("My situation").fill("I feel hopeless and I want to give up on everything after losing my job.");
    await page.getByRole("button", { name: "Generate exercise" }).click();
    await expect(page.getByTestId("reframe-support")).toContainText("This needs more than an exercise");
    await expect(page.getByTestId("reframe-setup")).toBeVisible();
  });
});
