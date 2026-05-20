import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, stubFirestoreReads } from "../helpers/auth-setup";
import { GUIDE_SECTIONS } from "@/lib/guide/guide-sections";

test.describe("Guide page", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders heading, table of contents, and exercise deep links", async ({
    page,
  }) => {
    await page.goto("/guide");

    await expect(
      page.getByRole("heading", { name: /Cogi guide/i, level: 1 }),
    ).toBeVisible();

    const tocNav = page.getByRole("navigation", { name: "Guide contents" });
    await expect(tocNav.first()).toBeVisible();

    const tocLinks = tocNav.first().getByRole("link");
    await expect(tocLinks).toHaveCount(GUIDE_SECTIONS.length);

    const analyticalLink = page.getByRole("link", { name: /Analytical/i }).first();
    await expect(analyticalLink).toHaveAttribute("href", "/exercise/analytical");
  });
});
