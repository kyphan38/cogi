import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, clickMainNavLink, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { choosePracticeLevel } from "./helpers/exercise-flow";

async function start(page: Page, level: "Guided" | "Standard" | "Expert", topic = "Mixed") {
  await gotoAuthenticated(page, "/exercise/calibration");
  await expect(page.getByRole("heading", { name: "Calibration" })).toBeVisible();
  await choosePracticeLevel(page, level);
  await page.getByTestId("calibration-topics").getByRole("button", { name: topic, exact: true }).click();
  await page.getByRole("button", { name: "Start exercise" }).click();
  await expect(page.getByText("Part 1 of 2 · Learn first")).toBeVisible();
  await expect(page.getByTestId("concept-list")).toContainText("Base rate");
  await page.getByRole("radio", { name: "About 9" }).click();
  await page.getByRole("button", { name: "Start the exercise" }).click();
  await expect(page.getByText("Part 2 of 2 · Answer and say how sure")).toBeVisible();
}

/** Answer every question: first option at 80%, ranges 1 to 1,000,000, base rates 50%. */
async function answerAll(page: Page) {
  for (const card of await page.getByTestId("calibration-item").all()) {
    const radios = card.getByRole("radiogroup");
    if ((await radios.count()) === 2) {
      await radios.nth(0).getByRole("radio").first().click();
      await radios.nth(1).getByRole("radio", { name: "80%" }).click();
    } else if ((await card.getByLabel("Low").count()) > 0) {
      await card.getByLabel("Low").fill("1");
      await card.getByLabel("High").fill("1,000,000");
    } else {
      await card.getByLabel("Your answer").fill("50");
    }
  }
}

test.describe("Calibration", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("guided: 8 two-answer questions and a base rate with a table; answer key; History", async ({ page }) => {
    await start(page, "Guided", "Science");
    await expect(page.getByTestId("calibration-item")).toHaveCount(9);
    await expect(page.getByTestId("frequency-table")).toContainText("Out of 10,000");
    await page.getByRole("button", { name: "Check my answers" }).click();
    await expect(page.getByText("Answer every question first (9 left)")).toBeVisible();
    await answerAll(page);
    await expect(page.getByTestId("answered-count")).toHaveText("9 of 9 answered");
    await page.getByRole("button", { name: "Check my answers" }).click();

    const key = page.getByTestId("calibration-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("Two-answer questions right")).toBeVisible();
    await expect(key.getByTestId("confidence-table")).toContainText("80%");
    await expect(key.getByText("Mock why: in this set you were a little overconfident.")).toBeVisible();
    await expect(key.getByText(/^Source:/).first()).toBeVisible();
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

    await clickMainNavLink(page, "History", /\/exercise\/history/);
    await page.getByRole("button", { name: /How sure are you\? Science/ }).first().click();
    await expect(page.getByTestId("calibration-answer-key")).toBeVisible();
    // One exercise is far below the 30 answers the summary needs.
    await expect(page.getByTestId("calibration-history")).toHaveCount(0);
  });

  test("standard: ranges at 80%, tips and tables behind a button", async ({ page }) => {
    await start(page, "Standard");
    await expect(page.getByTestId("calibration-item")).toHaveCount(10);
    await expect(page.getByText("Give a range you are 80% sure holds the answer").first()).toBeVisible();
    await expect(page.getByTestId("frequency-table")).toHaveCount(0);
    await page.getByRole("button", { name: "Show the table for 10,000" }).first().click();
    await expect(page.getByTestId("frequency-table")).toHaveCount(1);
    await answerAll(page);
    await page.getByRole("button", { name: "Check my answers" }).click();
    const key = page.getByTestId("calibration-answer-key");
    await expect(key.getByText("Ranges that held the answer (aim: 80%)")).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("Very wide: the high end is more than 10 times the low end.").first()).toBeVisible();
  });

  test("expert: 90% ranges, no tips or tables, one two-test problem", async ({ page }) => {
    await start(page, "Expert");
    await expect(page.getByTestId("calibration-item")).toHaveCount(10);
    await expect(page.getByText("Give a range you are 90% sure holds the answer").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Show the table|Show a tip/ })).toHaveCount(0);
    await expect(page.getByText(/positive again|flagged again|marks it as a scam too|goes off too|passes again|beeps again/)).toHaveCount(1);
  });
});
