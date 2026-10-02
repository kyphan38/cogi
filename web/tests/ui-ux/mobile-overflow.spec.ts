import { test, expect, type Page } from "@playwright/test";
import {
  bypassFirebaseAuth,
  clickMainNavLink,
  gotoAuthenticated,
  stubFirestoreReads,
} from "../helpers/auth-setup";
import {
  addPassageHighlight,
  addSystemsConnection,
  advanceEvaluativeToMatrix,
  advanceSystemsToCanvas,
  generateExercise,
  selectEvaluativeTaskType,
} from "../helpers/exercise-flow";

const LONG_TITLE = "A Daily Routine Plan for Financial and Career Success in a Very Competitive Market";
const LONG_DOMAIN = "Habit formation & behavior change for ambitious young professionals";

/**
 * Elements whose right edge passes the viewport. The page clips sideways overflow
 * (no scrollbar), so this is the only way to see content cut off at the edge.
 * Children of a sideways-scrolling box are fine.
 */
async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= vw + 1) continue;
      let p: HTMLElement | null = el.parentElement;
      let scrolls = false;
      while (p) {
        const ox = getComputedStyle(p).overflowX;
        if ((ox === "auto" || ox === "scroll" || ox === "hidden") && p !== document.body && p !== document.documentElement) {
          scrolls = true;
          break;
        }
        p = p.parentElement;
      }
      if (scrolls) continue;
      out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`);
    }
    return out.slice(0, 10);
  });
}

/** Generation returns a very long title, to stress row and header layouts. */
async function useLongTitle(page: Page): Promise<void> {
  await page.route("**/api/ai", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          title: LONG_TITLE,
          passage: "One sentence here. Another sentence there.",
          isSoundReasoning: false,
          embeddedIssues: [],
          validPoints: [],
        },
      }),
    });
  });
}

test.describe("Mobile 390px - nothing runs past the screen edge", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("Home with a long unfinished exercise", async ({ page }) => {
    await useLongTitle(page);
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, LONG_DOMAIN);
    await expect(page.getByText(LONG_TITLE)).toBeVisible({ timeout: 15_000 });
    // Client navigation: the e2e store lives in the page, a reload would empty it.
    await clickMainNavLink(page, "Practice", /\/$/);
    await expect(page.getByText("Continue", { exact: true })).toBeVisible();
    await expect(page.getByText(LONG_TITLE)).toBeVisible();
    expect(await overflowing(page)).toEqual([]);
  });

  for (const path of ["/reasoning", "/exercise/history", "/settings", "/exercise/analytical", "/exercise/evaluative", "/exercise/systems"]) {
    test(`page ${path}`, async ({ page }) => {
      await gotoAuthenticated(page, path);
      await page.waitForTimeout(500);
      expect(await overflowing(page)).toEqual([]);
    });
  }

  test("analytical: highlight step and answer key", async ({ page }) => {
    await useLongTitle(page);
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, LONG_DOMAIN);
    await expect(page.getByText(LONG_TITLE)).toBeVisible({ timeout: 15_000 });
    expect(await overflowing(page)).toEqual([]);
    await addPassageHighlight(page);
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    await expect(page.getByTestId("analytical-answer-key")).toBeVisible({ timeout: 15_000 });
    expect(await overflowing(page)).toEqual([]);
  });

  test("analytical: guided walkthrough", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "DevOps", { level: "Guided" });
    await page.getByRole("radio").first().click();
    await page.getByRole("button", { name: "Next: check the sentences" }).click();
    await page.getByTestId("guided-current").getByRole("button", { name: "Has a problem" }).click();
    expect(await overflowing(page)).toEqual([]);
  });

  for (const [path, domain] of [["/exercise/evaluative", "Software Engineering"], ["/exercise/systems", "Cloud Architecture"]] as const) {
    test(`after generating on ${path}`, async ({ page }) => {
        await gotoAuthenticated(page, path);
      await generateExercise(page, domain);
      await page.waitForTimeout(1000);
      expect(await overflowing(page)).toEqual([]);
    });
  }

  test("systems: comparison with the model after feedback", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await generateExercise(page, "Cloud Architecture", { level: "Guided" });
    await advanceSystemsToCanvas(page);
    expect(await overflowing(page)).toEqual([]);
    await addSystemsConnection(page);
    await page.getByRole("button", { name: "Done connecting" }).click();
    await page.getByRole("button", { name: "Submit impact and get AI reflection" }).click();
    await expect(page.getByTestId("systems-answer-key")).toBeVisible({ timeout: 15_000 });
    expect(await overflowing(page)).toEqual([]);
  });

  test("evaluative: scoring comparison after feedback", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await selectEvaluativeTaskType(page, "Dealbreaker check");
    await generateExercise(page, "Vendor Selection");
    await advanceEvaluativeToMatrix(page);
    expect(await overflowing(page)).toEqual([]);
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    await expect(page.getByTestId("evaluative-answer-key")).toBeVisible({ timeout: 15_000 });
    expect(await overflowing(page)).toEqual([]);
  });
});
