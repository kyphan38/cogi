import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoLayoutFixtures } from "../helpers/auth-setup";
import { MOBILE, selectTextInPassage } from "../helpers/layout-metrics";

test.describe("HighlightTag — mobile text selection", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await page.setViewportSize(MOBILE);
    await gotoLayoutFixtures(page);
  });

  test("selecting passage text shows Pick a tag on mobile", async ({ page }) => {
    await selectTextInPassage(page);

    await expect(page.getByTestId("tag-picker-region")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("pick-tag-prompt")).toHaveText(/Pick a tag/i);
    await expect(
      page.getByRole("toolbar", { name: "Apply tag to selection" }),
    ).toBeVisible();
  });

  test("touch pointerup on passage shows tag picker after programmatic selection", async ({
    page,
  }) => {
    const passage = page.getByTestId("text-passage");
    await passage.evaluate((el) => {
      const range = document.createRange();
      const textNode = el.firstChild;
      if (textNode?.nodeType === Node.TEXT_NODE) {
        const end = Math.min(32, (textNode.textContent ?? "").length);
        range.setStart(textNode, 0);
        range.setEnd(textNode, end);
      } else {
        range.selectNodeContents(el);
      }
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });

    await passage.dispatchEvent("pointerup");

    await expect(page.getByTestId("tag-picker-region")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("pick-tag-prompt")).toBeVisible();
  });
});
