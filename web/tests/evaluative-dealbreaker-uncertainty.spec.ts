import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import {
  advanceEvaluativeToMatrix,
  advanceEvaluativeUncertaintyToEstimate,
  generateExercise,
  selectEvaluativeTaskType,
} from "./helpers/exercise-flow";

test.describe("Evaluative exercise - task type setup", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("task type selector offers auto, dealbreaker, and uncertainty", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await page.getByText("Task type", { exact: true }).locator("..").getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "Surprise me" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Dealbreaker check" })).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Uncertainty & expected value" }),
    ).toBeVisible();
  });
});

test.describe("Evaluative exercise - dealbreaker task type", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("generating with dealbreaker task type shows scenario and dealbreaker criterion", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await selectEvaluativeTaskType(page, "Dealbreaker check");
    await generateExercise(page, "Vendor Selection");

    await expect(
      page.getByRole("heading", { name: "Vendor Contract Renewal" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/must choose a cloud vendor/)).toBeVisible();
    await expect(page.getByText("Amazon Cloud")).toBeVisible();
    await expect(page.getByText("Budget Cloud Co")).toBeVisible();
  });

  test("scoring table renders weight and score sliders per criterion", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await selectEvaluativeTaskType(page, "Dealbreaker check");
    await generateExercise(page, "Vendor Selection");

    await expect(
      page.getByRole("heading", { name: "Vendor Contract Renewal" }),
    ).toBeVisible({ timeout: 15_000 });

    await advanceEvaluativeToMatrix(page);

    await expect(page.getByText("Data Security Compliance")).toBeVisible();
    await expect(page.getByText("Total Cost of Ownership")).toBeVisible();
    await expect(page.getByText("Weighted avg")).toBeVisible();
    await expect(page.getByRole("slider").first()).toBeVisible();
  });

  test("scoring a dealbreaker criterion below threshold shows disqualification alert", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await selectEvaluativeTaskType(page, "Dealbreaker check");
    await generateExercise(page, "Vendor Selection");

    await expect(
      page.getByRole("heading", { name: "Vendor Contract Renewal" }),
    ).toBeVisible({ timeout: 15_000 });

    await advanceEvaluativeToMatrix(page);

    await expect(
      page.getByRole("button", { name: "Continue to confidence" }),
    ).toBeVisible();
    await expect(page.getByText("Deal-breaker disqualifications")).not.toBeVisible();

    const budgetRow = page.getByRole("row", { name: /Budget Cloud Co/ });
    const dealbreakerSlider = budgetRow.getByRole("slider").first();
    await dealbreakerSlider.focus();
    await page.keyboard.press("ArrowLeft");

    await expect(page.getByText("Deal-breaker disqualifications")).toBeVisible();
    await expect(page.getByText("Budget Cloud Co disqualified")).toBeVisible();
  });
});

test.describe("Evaluative exercise - uncertainty task type", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("generating with uncertainty task type shows scenario and outcome options", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await selectEvaluativeTaskType(page, "Uncertainty & expected value");
    await generateExercise(page, "Market Expansion");

    await expect(
      page.getByRole("heading", { name: "Market Expansion Bet" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/deciding whether to enter a new international market/)).toBeVisible();
    await expect(page.getByText("Enter Market Now")).toBeVisible();
    await expect(page.getByText("Wait 6 Months")).toBeVisible();
    await expect(
      page.getByText(/gut read on which option is/),
    ).toBeVisible();
  });

  test("estimate step renders outcome rows with probability and payoff inputs", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await selectEvaluativeTaskType(page, "Uncertainty & expected value");
    await generateExercise(page, "Market Expansion");

    await expect(
      page.getByRole("heading", { name: "Market Expansion Bet" }),
    ).toBeVisible({ timeout: 15_000 });

    await advanceEvaluativeUncertaintyToEstimate(page);

    await expect(page.getByText("Strong adoption")).toBeVisible();
    await expect(page.getByText("Weak adoption")).toBeVisible();
    await expect(page.getByText("Improved product-market fit")).toBeVisible();
    await expect(page.getByText("Competitor claims the market")).toBeVisible();
    await expect(page.getByText(/Your probability/).first()).toBeVisible();
    await expect(page.getByText("Your payoff").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue to confidence" }),
    ).toBeDisabled();
  });
});
