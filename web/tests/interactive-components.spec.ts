import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { generateExercise } from "./helpers/exercise-flow";

test.describe("ConfidenceSlider interaction", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("confidence slider renders with default percentage label", async ({
    page,
  }) => {
    // Confidence is part of the work step in the 3-step loop (PLAN-simplify.md),
    // so the slider shows as soon as an analytical passage is generated.
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "DevOps");
    await expect(page.getByText("Structural reasoning passage")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("slider")).toBeVisible();
    await expect(page.getByText(/\(50%\)/)).toBeVisible();
  });
});
