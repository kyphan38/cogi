import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { choosePracticeLevel } from "./helpers/exercise-flow";

async function start(page: Page, level: "Guided" | "Standard" | "Expert") {
  await gotoAuthenticated(page, "/exercise/strategy");
  await expect(page.getByRole("heading", { name: "Strategic situations" })).toBeVisible();
  await choosePracticeLevel(page, level);
  await page.getByRole("button", { name: "Generate exercise" }).click();
  await expect(page.getByText("Food truck price war")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("radio", { name: "Your best choice given the other's choice" }).click();
  await page.getByRole("button", { name: "Start the exercise" }).click();
  await expect(page.getByText("Part 2 of 3 · Read the game")).toBeVisible();
}

test.describe("Strategic situations", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("guided: four best replies with numbers, then predict and see the underline method", async ({ page }) => {
    await start(page, "Guided");
    await expect(page.getByTestId("payoff-matrix")).toContainText("10");
    for (let i = 0; i < 4; i++) {
      const q = page.getByTestId("best-reply-question");
      await q.getByRole("radio", { name: "Cut price" }).click();
      await expect(page.getByTestId("best-reply-feedback")).toContainText("Right.");
      await page.getByRole("button", { name: i < 3 ? "Next question" : "Predict the outcome" }).click();
    }
    await expect(page.getByText("Part 3 of 3 · Predict the outcome")).toBeVisible();
    await page.getByTestId("prediction-matrix").getByRole("button", { name: /Outcome 4/ }).click();
    await page.getByLabel(/Why do they end up there/).fill("Cutting is best whatever the other does.");
    await page.getByRole("button", { name: "Get AI feedback" }).click();

    const key = page.getByTestId("strategy-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("Best replies right")).toBeVisible();
    await expect(key.getByTestId("answer-matrix")).toContainText("Equilibrium");
    await expect(key.getByText("Mock why: cutting is each side's best reply.")).toBeVisible();
    // "Take with you": game theory idea cards (fixed guide plus the AI's examples).
    await expect(key.getByTestId("answer-key-takeaways")).toHaveCount(0);
    const cards = key.getByTestId("trap-card");
    await expect(cards.first()).toContainText("Spot it");
    await expect(cards.first()).toContainText("Mock reply: maybe. What would they do if we kept our price?");
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("standard: no numbers; rank outcomes for both sides, then predict", async ({ page }) => {
    await start(page, "Standard");
    await expect(page.getByTestId("rank-outcomes")).toContainText("How good is each outcome for Taco Town?");
    await expect(page.getByTestId("rank-item")).toHaveCount(4);
    await page.getByRole("button", { name: "Next: Burrito Bar" }).click();
    await expect(page.getByTestId("rank-outcomes")).toContainText("Burrito Bar");
    await page.getByRole("button", { name: "Predict the outcome" }).click();
    await expect(page.getByTestId("prediction-matrix")).not.toContainText("10");
    await page.getByTestId("prediction-matrix").getByRole("button", { name: /Outcome 4/ }).click();
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    await expect(page.getByTestId("strategy-answer-key").getByText("Preferences close")).toBeVisible({ timeout: 15_000 });
  });

  test("expert: three choices, dominant and better-for-both questions", async ({ page }) => {
    await start(page, "Expert");
    await expect(page.getByTestId("rank-item")).toHaveCount(6);
    await page.getByRole("button", { name: "Next: Burrito Bar" }).click();
    await page.getByRole("button", { name: "Predict the outcome" }).click();
    await expect(page.getByTestId("dominant-question")).toHaveCount(2);
    await page.getByTestId("prediction-matrix").getByRole("button", { name: /Outcome 4/ }).click();
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    await expect(page.getByText("Answer the dominant choice question for both sides.")).toBeVisible();
    const [dA, dB] = await page.getByTestId("dominant-question").all();
    await dA!.getByRole("button", { name: "Cut price" }).click();
    await dB!.getByRole("button", { name: "Cut price" }).click();
    await page.getByTestId("better-matrix").getByRole("button", { name: /Outcome 1/ }).click();
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    const key = page.getByTestId("strategy-answer-key");
    await expect(key.getByText("Dominant choices")).toBeVisible({ timeout: 15_000 });
    await expect(key.getByRole("heading", { name: "Better for both" })).toBeVisible();
  });
});
