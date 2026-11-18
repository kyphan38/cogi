import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, clickMainNavLink, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { choosePracticeLevel } from "./helpers/exercise-flow";

async function start(page: Page, level: "Guided" | "Standard" | "Expert") {
  await gotoAuthenticated(page, "/exercise/humor");
  await expect(page.getByRole("heading", { name: "Light replies" })).toBeVisible();
  await choosePracticeLevel(page, level);
  await page.getByTestId("humor-places").getByRole("button", { name: "At work" }).click();
  await page.getByRole("button", { name: "Generate exercise" }).click();
  await expect(page.getByText("Camera on the ceiling")).toBeVisible({ timeout: 15_000 });
}

async function learnFirst(page: Page) {
  await expect(page.getByText("Part 1 of 2 · Learn first")).toBeVisible();
  await page.getByRole("button", { name: "Check yourself" }).click();
  await page.getByRole("radio", { name: "Laughing at yourself" }).click();
  await page.getByRole("button", { name: "Start the exercise" }).click();
  await expect(page.getByText("Part 2 of 2 · Reply")).toBeVisible();
}

test.describe("Light replies", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("guided: pick three replies, results, saved, in History", async ({ page }) => {
    await start(page, "Guided");
    await learnFirst(page);
    await expect(page.getByTestId("humor-steps")).toBeVisible();

    await page.getByRole("radio", { name: /Mock best 1/ }).click();
    await page.getByRole("button", { name: "Next moment" }).click();
    await expect(page.getByText("Did you lose a bet?", { exact: false })).toBeVisible();
    await page.getByRole("radio", { name: /Mock ok 2/ }).click();
    await page.getByRole("button", { name: "Next moment" }).click();
    await page.getByRole("radio", { name: /Mock best 3/ }).click();
    await page.getByRole("button", { name: "Done" }).click();
    await page.getByRole("button", { name: "See results" }).click();

    const key = page.getByTestId("humor-answer-key");
    await expect(key).toBeVisible();
    await expect(key.getByText("83%")).toBeVisible();
    await expect(key.getByText("2/3")).toBeVisible();
    await expect(key.getByText("Over-explaining", { exact: false }).first()).toBeVisible();

    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

    await clickMainNavLink(page, "History", /\/exercise\/history/);
    await page.getByRole("button", { name: /Camera on the ceiling/ }).first().click();
    await expect(page.getByTestId("humor-answer-key")).toBeVisible();
  });

  test("expert: write four replies, no hints, a serious moment, AI feedback per check", async ({ page }) => {
    await start(page, "Expert");
    await learnFirst(page);
    await expect(page.getByTestId("humor-steps")).toHaveCount(0);

    const replies = [
      "The ceiling wanted to join the standup.",
      "Yes, and I lost two of them.",
      "I am sorry to hear that. Tell me what I can take off your plate.",
      "Tough crowd. I will stick to code.",
    ];
    for (let i = 0; i < 4; i++) {
      const box = page.getByLabel("What do you say?");
      if (i === 0) {
        await box.fill("ok");
        await page.getByRole("button", { name: "Answer" }).click();
        await expect(page.getByText("Write what you would say")).toBeVisible();
      }
      await box.fill(replies[i]!);
      await page.getByRole("button", { name: "Answer" }).click();
    }
    await expect(page.getByTestId("humor-round")).toHaveCount(4);
    await page.getByRole("button", { name: "Get AI feedback" }).click();

    const key = page.getByTestId("humor-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("The four checks")).toBeVisible();
    await expect(key.getByText("Light twist", { exact: true })).toBeVisible();
    await expect(key.getByText("Serious moment: no joke here.")).toBeVisible();
    await expect(key.getByText("Mock overall: kind and short; add a small twist more often.")).toBeVisible();
    await expect(key.getByText(replies[2]!, { exact: false })).toBeVisible();
  });

  test("standard: My situation is available", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/humor");
    await choosePracticeLevel(page, "Standard");
    await page.getByRole("button", { name: "My situation" }).click();
    await expect(page.getByLabel("My situation")).toBeVisible();
    await choosePracticeLevel(page, "Guided");
    await expect(page.getByRole("button", { name: "My situation" })).toHaveCount(0);
  });
});
