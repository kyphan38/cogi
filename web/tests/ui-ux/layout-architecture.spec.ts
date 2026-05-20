import { test, expect } from "@playwright/test";
import {
  bypassFirebaseAuth,
  stubFirestoreReads,
  gotoLayoutFixtures,
} from "../helpers/auth-setup";
import {
  DESKTOP,
  MOBILE,
  TABLET,
  VIEWPORTS,
  assertBorderRadiusPx,
  assertBorderWidthPx,
  assertFontWeightAtLeast,
  assertMinLineHeightPx,
  assertMinPaddingPx,
  assertNoHorizontalOverflow,
  assertVerticalCenterAligned,
  parsePx,
  selectTextInPassage,
  getComputed,
} from "../helpers/layout-metrics";

test.describe("Nordic Mono layout architecture", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test.describe("Unit 1 - bounding boxes and corner radii", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await gotoLayoutFixtures(page);
    });

    test("progression minimal container has 16px radius and 1px border", async ({
      page,
    }) => {
      const panel = page.getByTestId("geopolitics-progression-card");
      await expect(panel).toBeVisible();
      await assertBorderRadiusPx(panel, 16);
      await assertBorderWidthPx(panel, 1);
    });

    test("reference minimal container has 16px radius and 1px border", async ({
      page,
    }) => {
      const panel = page.getByTestId("layout-fixture-container");
      await assertBorderRadiusPx(panel, 16);
      await assertBorderWidthPx(panel, 1);
    });

    test("text passage panel has 16px radius and 1px border", async ({ page }) => {
      const passage = page.getByTestId("text-passage");
      await assertBorderRadiusPx(passage, 16);
      await assertBorderWidthPx(passage, 1);
    });
  });

  test.describe("Unit 2 - whitespace and line-height", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await gotoLayoutFixtures(page);
    });

    test("text passage meets line-height and padding thresholds", async ({
      page,
    }) => {
      const passage = page.getByTestId("text-passage");
      await assertMinLineHeightPx(passage, 20);
      await assertMinPaddingPx(passage, 16);
    });

    test("minimal container body meets 24px padding on desktop", async ({
      page,
    }) => {
      const body = page.getByTestId("geopolitics-progression-card-body");
      await assertMinPaddingPx(body, 24);
    });

    test("progression title uses semibold structural weight", async ({ page }) => {
      const title = page
        .getByTestId("geopolitics-progression-card")
        .getByRole("heading", { level: 2 });
      await assertFontWeightAtLeast(title, 600);
    });
  });

  test.describe("Unit 3 - semantic tag button anatomy", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await gotoLayoutFixtures(page);
      await selectTextInPassage(page);
      await expect(page.getByTestId("tag-picker-region")).toBeVisible();
    });

    test("framing bias button has indicator dot aligned with label", async ({
      page,
    }) => {
      const button = page.getByRole("button", { name: /Framing Bias/i });
      await expect(button).toBeVisible();
      const dot = button.getByTestId("semantic-tag-dot");
      await expect(dot).toBeVisible();
      const box = await dot.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(7);
      expect(box!.width).toBeLessThanOrEqual(10);
      expect(box!.height).toBeGreaterThanOrEqual(7);
      expect(box!.height).toBeLessThanOrEqual(10);
      const label = button.locator("span").nth(1);
      await assertVerticalCenterAligned(button, dot, label);
    });

    test("missing actor button has indicator dot aligned with label", async ({
      page,
    }) => {
      const button = page.getByRole("button", {
        name: /Missing Actor/i,
      });
      const dot = button.getByTestId("semantic-tag-dot");
      const label = button.locator("span").nth(1);
      await assertVerticalCenterAligned(button, dot, label);
    });

    test("semantic tag toolbar uses grid layout at desktop", async ({ page }) => {
      const toolbar = page.getByRole("toolbar", {
        name: "Apply tag to selection",
      });
      const display = await getComputed(toolbar, "display");
      expect(display).toBe("grid");
    });
  });

  test.describe("Unit 4 - responsive structural flow", () => {
    for (const { name, size } of VIEWPORTS) {
      test(`domain suggestions do not overflow horizontally on ${name}`, async ({
        page,
      }) => {
        await page.setViewportSize(size);
        await page.goto("/exercise/analytical");
        const domain = page.getByLabel(/^Domain/i);
        await domain.fill("US-China strategic competition");
        await expect(page.getByTestId("domain-suggestions-list")).toBeVisible({
          timeout: 10_000,
        });
        await assertNoHorizontalOverflow(page);
        const list = page.getByTestId("domain-suggestions-list");
        const listBox = await list.boundingBox();
        expect(listBox).not.toBeNull();
        expect(listBox!.width).toBeLessThanOrEqual(size.width + 2);
      });
    }

    test("tag picker and fixture actions stay within viewport on mobile", async ({
      page,
    }) => {
      await page.setViewportSize(MOBILE);
      await gotoLayoutFixtures(page);
      await selectTextInPassage(page);
      await expect(page.getByTestId("tag-picker-region")).toBeVisible();
      await assertNoHorizontalOverflow(page);

      const primary = page.getByRole("link", {
        name: "Start suggested exercise",
      });
      const secondary = page.getByRole("button", { name: "Secondary action" });
      const primaryBox = await primary.boundingBox();
      const secondaryBox = await secondary.boundingBox();
      expect(primaryBox).not.toBeNull();
      expect(secondaryBox).not.toBeNull();
      expect(primaryBox!.x + primaryBox!.width).toBeLessThanOrEqual(
        MOBILE.width + 2,
      );
      expect(secondaryBox!.x + secondaryBox!.width).toBeLessThanOrEqual(
        MOBILE.width + 2,
      );
    });

    test("tag picker stacks in one column on mobile", async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await gotoLayoutFixtures(page);
      await selectTextInPassage(page);
      const framing = page.getByRole("button", { name: /Framing Bias/i });
      const missing = page.getByRole("button", { name: /Missing Actor/i });
      const a = await framing.boundingBox();
      const b = await missing.boundingBox();
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(b!.y).toBeGreaterThan(a!.y + a!.height - 4);
    });

    test("tag picker uses two columns from sm breakpoint on tablet", async ({
      page,
    }) => {
      await page.setViewportSize(TABLET);
      await gotoLayoutFixtures(page);
      await selectTextInPassage(page);
      const framing = page.getByRole("button", { name: /Framing Bias/i });
      const missing = page.getByRole("button", { name: /Missing Actor/i });
      const a = await framing.boundingBox();
      const b = await missing.boundingBox();
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(b!.x).toBeGreaterThan(a!.x);
    });
  });
});
