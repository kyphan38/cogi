import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, clickMainNavLink, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { choosePracticeLevel } from "./helpers/exercise-flow";

async function start(page: Page, level: "Guided" | "Standard" | "Expert") {
  await gotoAuthenticated(page, "/exercise/tricky");
  await expect(page.getByRole("heading", { name: "Tricky questions" })).toBeVisible();
  await choosePracticeLevel(page, level);
  await page.getByTestId("tricky-askers").getByRole("button", { name: "Your boss" }).click();
  await page.getByRole("button", { name: "Generate exercise" }).click();
  await expect(page.getByText("Pick one of two colleagues")).toBeVisible({ timeout: 15_000 });
}

async function learnFirst(page: Page) {
  await expect(page.getByText("Part 1 of 2 · Learn first")).toBeVisible();
  await page.getByRole("button", { name: "Check yourself" }).click();
  await page.getByRole("radio", { name: "Name what the work needs first" }).click();
  await page.getByRole("button", { name: "Start the exercise" }).click();
  await expect(page.getByText("Part 2 of 2 · Answer")).toBeVisible();
}

test.describe("Tricky questions", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("guided: pick the best answer twice, results, saved, in History", async ({ page }) => {
    await start(page, "Guided");
    await learnFirst(page);
    await expect(page.getByTestId("tricky-steps")).toBeVisible();

    await page.getByRole("radio", { name: /Mock best 1/ }).click();
    await page.getByRole("button", { name: "Next question" }).click();
    await expect(page.getByText("I hear you, but if you had to pick one right now?")).toBeVisible();
    await page.getByRole("radio", { name: /Mock ok 2/ }).click();
    await page.getByRole("button", { name: "Done" }).click();
    await page.getByRole("button", { name: "See results" }).click();

    const key = page.getByTestId("tricky-answer-key");
    await expect(key).toBeVisible();
    await expect(key.getByText("75%")).toBeVisible();
    await expect(key.getByText("1/2")).toBeVisible();
    await expect(key.getByText("Forced choice", { exact: false }).first()).toBeVisible();

    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

    await clickMainNavLink(page, "Memory", /\/exercise\/history/);
    await page.getByRole("button", { name: /Pick one of two colleagues/ }).first().click();
    await expect(page.getByTestId("tricky-answer-key")).toBeVisible();
  });

  test("expert: write three answers, no step hints, AI feedback per step", async ({ page }) => {
    await start(page, "Expert");
    await learnFirst(page);
    await expect(page.getByTestId("tricky-steps")).toHaveCount(0);

    const answers = [
      "It depends on what the project needs most. Can I ask what matters here?",
      "If speed matters most, I lean to Minh. Lan is better with clients.",
      "I would rather not compare people. For this task, your call is best.",
    ];
    for (let i = 0; i < 3; i++) {
      const box = page.getByLabel("What do you say?");
      // Too short: not an answer yet.
      if (i === 0) {
        await box.fill("Minh.");
        await page.getByRole("button", { name: "Answer" }).click();
        await expect(page.getByText("Write what you would say")).toBeVisible();
      }
      await box.fill(answers[i]!);
      await page.getByRole("button", { name: "Answer" }).click();
    }
    await expect(page.getByTestId("tricky-round")).toHaveCount(3);
    await page.getByRole("button", { name: "Get AI feedback" }).click();

    const key = page.getByTestId("tricky-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("The four steps")).toBeVisible();
    await expect(key.getByText("Hand the decision back", { exact: true })).toBeVisible();
    await expect(key.getByText("Mock overall: you stay fair; hand the decision back more often.")).toBeVisible();
    await expect(key.getByText(answers[1]!, { exact: false })).toBeVisible();
  });

  test("standard: My situation is available", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/tricky");
    await choosePracticeLevel(page, "Standard");
    await page.getByRole("button", { name: "My situation" }).click();
    await expect(page.getByLabel("My situation")).toBeVisible();
    await choosePracticeLevel(page, "Guided");
    await expect(page.getByRole("button", { name: "My situation" })).toHaveCount(0);
  });
});
