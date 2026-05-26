import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import {
  addPassageHighlight,
  generateExercise,
  fillExerciseDomain,
  advanceSystemsToCanvas,
} from "./helpers/exercise-flow";

test.describe("State preservation - Analytical", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("shows Continue existing exercise button after clicking Back from step 1", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    // Click Back to return to step 0
    await page.getByRole("button", { name: "Back" }).click();

    // Should see both Generate and Continue buttons
    await expect(
      page.getByRole("button", { name: "Generate exercise" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue existing exercise" }),
    ).toBeVisible();
  });

  test("Continue existing exercise returns to the exercise without regenerating", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    // Click Back
    await page.getByRole("button", { name: "Back" }).click();

    // Click Continue existing exercise
    await page.getByRole("button", { name: "Continue existing exercise" }).click();

    // Should be back at the exercise (passage visible again)
    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible();
  });

  test("highlights are preserved after clicking Back and Continue", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    // Add a highlight
    await addPassageHighlight(page);
    const highlightCount = await page.getByTestId("highlight-chip").count();
    expect(highlightCount).toBeGreaterThan(0);

    // Click Back
    await page.getByRole("button", { name: "Back" }).click();

    // Click Continue
    await page.getByRole("button", { name: "Continue existing exercise" }).click();

    // Highlights should still be present
    await expect(page.getByTestId("highlight-chip").first()).toBeVisible();
  });
});

test.describe("State preservation - Sequential", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("shows Continue existing exercise button after clicking Back from step 1", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await generateExercise(page, "DevOps");

    // Wait for the drag-and-drop step
    await expect(
      page.getByText("Incident Response Sequence"),
    ).toBeVisible({ timeout: 15_000 });

    // Click Back
    await page.getByRole("button", { name: "Back" }).click();

    await expect(
      page.getByRole("button", { name: "Continue existing exercise" }),
    ).toBeVisible();
  });

  test("Continue existing exercise returns to the exercise", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByText("Incident Response Sequence"),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Continue existing exercise" }).click();

    await expect(
      page.getByText("Incident Response Sequence"),
    ).toBeVisible();
  });
});

test.describe("State preservation - Systems", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("shows Continue existing exercise button after clicking Back from step 1", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByText("Cloud Infrastructure Dependencies"),
    ).toBeVisible({ timeout: 15_000 });

    // Step 1 has decompose phase. Click Back
    await page.getByRole("button", { name: "Back" }).click();

    await expect(
      page.getByRole("button", { name: "Continue existing exercise" }),
    ).toBeVisible();
  });
});

test.describe("State preservation - Evaluative", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("shows Continue existing exercise button after clicking Back from step 1", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByText("Technology Stack Decision"),
    ).toBeVisible({ timeout: 15_000 });

    // Evaluative step 1 has criteria input phase with a Back button
    await page.getByRole("button", { name: "Back" }).click();

    await expect(
      page.getByRole("button", { name: "Continue existing exercise" }),
    ).toBeVisible();
  });
});

test.describe("State preservation - Generative", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("shows Continue existing exercise button after clicking Back from step 1", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/generative");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByText("AI Ethics Policy Framework"),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Back" }).click();

    await expect(
      page.getByRole("button", { name: "Continue existing exercise" }),
    ).toBeVisible();
  });

  test("Continue existing exercise returns to the exercise", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/generative");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByText("AI Ethics Policy Framework"),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Continue existing exercise" }).click();

    await expect(
      page.getByText("AI Ethics Policy Framework"),
    ).toBeVisible();
  });
});
