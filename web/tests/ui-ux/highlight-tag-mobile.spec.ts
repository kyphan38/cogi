import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoLayoutFixtures } from "../helpers/auth-setup";
import {
  MOBILE,
  confirmPassageSelection,
  stageTextInPassage,
  selectTextInPassage,
} from "../helpers/layout-metrics";

test.describe("HighlightTag - mobile text selection", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await page.setViewportSize(MOBILE);
    await gotoLayoutFixtures(page);
  });

  test("staging alone does not show tag picker", async ({ page }) => {
    await stageTextInPassage(page);

    await expect(page.getByTestId("tag-picker-region")).not.toBeVisible();
    await expect(page.getByTestId("tag-selection-hint")).toBeVisible({
      timeout: 5000,
    });
  });

  test("confirm tap opens floating Pick a tag on mobile", async ({ page }) => {
    await selectTextInPassage(page);

    const picker = page.getByTestId("tag-picker-region");
    await expect(picker).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("pick-tag-prompt")).toHaveText(/Pick a tag/i);
    await expect(
      page.getByRole("toolbar", { name: "Apply tag to selection" }),
    ).toBeVisible();

    const position = await picker.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe("fixed");
  });

  test("two-step pointer flow opens picker", async ({ page }) => {
    const passage = page.getByTestId("text-passage");
    await stageTextInPassage(page);
    await expect(page.getByTestId("tag-picker-region")).not.toBeVisible();

    await confirmPassageSelection(page);

    await expect(page.getByTestId("tag-picker-region")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("pick-tag-prompt")).toBeVisible();
  });
});
