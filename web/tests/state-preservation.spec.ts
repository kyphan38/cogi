import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import {
  addPassageHighlight,
  generateExercise,
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
    await page.getByRole("button", { name: "Back", exact: true }).click();

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
    await page.getByRole("button", { name: "Back", exact: true }).click();

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
    await page.getByRole("button", { name: "Back", exact: true }).click();

    // Click Continue
    await page.getByRole("button", { name: "Continue existing exercise" }).click();

    // Highlights should still be present
    await expect(page.getByTestId("highlight-chip").first()).toBeVisible();
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
    await page.getByRole("button", { name: "Back", exact: true }).click();

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
    await page.getByRole("button", { name: "Back", exact: true }).click();

    await expect(
      page.getByRole("button", { name: "Continue existing exercise" }),
    ).toBeVisible();
  });
});

test.describe("State preservation - leaving an exercise", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("Back, Forward and reload return to the exercise; opening the topic again offers Continue or Start over", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/reasoning");
    await page.getByTestId("topic-generate").click();
    const list = page.getByTestId("topic-list").getByTestId("topic-row");
    await list.first().click();
    await page.waitForURL(/\/exercise\/judgment\?domain=/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Generate exercise" }).click();
    await expect(page.getByTestId("concept-list")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/exercise\/judgment\?resumeId=/);

    await page.goBack();
    await expect(list).toHaveCount(10);
    await page.goForward();
    await expect(page.getByTestId("concept-list")).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await expect(page.getByTestId("concept-list")).toBeVisible({ timeout: 15_000 });

    await page.goBack();
    await expect(list).toHaveCount(10);
    await list.first().click();
    await expect(page.getByTestId("unfinished-topic")).toBeVisible();
    await page.getByTestId("unfinished-continue").click();
    await expect(page.getByTestId("concept-list")).toBeVisible({ timeout: 15_000 });

    await page.goBack();
    await expect(page.getByTestId("unfinished-topic")).toBeVisible();
    page.once("dialog", (d) => void d.accept());
    await page.getByTestId("unfinished-start-over").click();
    await expect(page.getByTestId("unfinished-topic")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Generate exercise" })).toBeVisible();
  });
});
