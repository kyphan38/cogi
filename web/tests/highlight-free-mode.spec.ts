import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoLayoutFixtures } from "./helpers/auth-setup";
import { selectTextInPassage } from "./helpers/layout-metrics";

test.describe("HighlightTag - free selection", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await gotoLayoutFixtures(page);
  });

  test("a tagged selection shows in the passage and can be retagged by tapping it", async ({ page }) => {
    await selectTextInPassage(page);
    const picker = page.getByTestId("tag-picker-region");
    await picker.getByRole("button", { name: /Framing Bias/i }).click();

    const mark = page.getByTestId("text-passage").locator("mark");
    await expect(mark).toHaveCount(1);
    // The passage text itself is unchanged by the mark.
    const text = await page.getByTestId("text-passage").textContent();
    expect(text).toContain("Regional powers are rebalancing alliances");

    await mark.click();
    await expect(picker.getByTestId("pick-tag-prompt")).toHaveText("Change the tag:");
    await picker.getByRole("button", { name: /Missing Actor/i }).click();
    await expect(page.getByTestId("highlight-chip")).toContainText("Missing Actor");

    await mark.click();
    await picker.getByRole("button", { name: "Remove" }).click();
    await expect(mark).toHaveCount(0);
  });
});
