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
 * Layout problems on a phone screen:
 * - elements whose right edge passes the viewport (the page clips sideways overflow,
 *   so this is the only way to see content cut off). Children of a sideways-scrolling box are fine.
 * - controls or text boxes drawn on top of each other, like a time label under a button
 *   when a toolbar runs out of room.
 */
async function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const out: string[] = [];
    const label = (el: Element) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`;
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
      out.push(`${label(el)} right=${Math.round(r.right)}`);
    }

    // Overlap check: interactive elements plus block-level leaf text, on screen right now.
    // Inline text wraps across lines, so its box overlaps its neighbours by design.
    // Boxes are clipped to their scrolling ancestors: content scrolled out of view does not count.
    const visibleRect = (el: Element) => {
      const r = el.getBoundingClientRect();
      let left = r.left, top = r.top, right = r.right, bottom = r.bottom;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
        const c = p.getBoundingClientRect();
        left = Math.max(left, c.left); top = Math.max(top, c.top);
        right = Math.min(right, c.right); bottom = Math.min(bottom, c.bottom);
      }
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    const layer = (el: Element) => {
      for (let p: Element | null = el; p; p = p.parentElement) {
        const pos = getComputedStyle(p).position;
        if (pos === "fixed" || pos === "sticky" || pos === "absolute") return p;
      }
      return null;
    };
    const boxes = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.opacity === "0") return false;
        if (cs.display === "inline" || cs.display === "contents") return false;
        const interactive = el.matches("button, a[href], input, select, textarea, [role=button], [role=tab], [role=radio]");
        const leafText = el.childElementCount === 0 && (el.textContent ?? "").trim() !== "";
        return interactive || leafText;
      })
      .map((el) => ({ el, r: visibleRect(el), layer: layer(el) }))
      .filter(({ r }) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.layer !== b.layer || a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w > 2 && h > 2) out.push(`overlap: ${label(a.el)} / ${label(b.el)}`);
      }
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

// 360px covers small Android phones, 390px the iPhone 16e and most iPhones.
for (const width of [360, 390]) {
  test.describe(`Mobile ${width}px - nothing runs past the edge or overlaps`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
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
      expect(await layoutProblems(page)).toEqual([]);
    });

    for (const path of ["/reasoning", "/exercise/history", "/settings", "/exercise/analytical", "/exercise/evaluative", "/exercise/systems", "/exercise/judgment", "/terms", "/tracks", "/exercise/strategy", "/exercise/reframe", "/exercise/calibration", "/simulators", "/handbook", "/geo"]) {
      test(`page ${path}`, async ({ page }) => {
        await gotoAuthenticated(page, path);
        await page.waitForTimeout(500);
        expect(await layoutProblems(page)).toEqual([]);
      });
    }

    test("analytical: highlight step and answer key", async ({ page }) => {
      await useLongTitle(page);
      await gotoAuthenticated(page, "/exercise/analytical");
      await generateExercise(page, LONG_DOMAIN);
      await expect(page.getByText(LONG_TITLE)).toBeVisible({ timeout: 15_000 });
      expect(await layoutProblems(page)).toEqual([]);
      await addPassageHighlight(page);
      await page.getByRole("button", { name: "Get AI feedback" }).click();
      await expect(page.getByTestId("analytical-answer-key")).toBeVisible({ timeout: 15_000 });
      expect(await layoutProblems(page)).toEqual([]);
    });

    test("analytical: guided walkthrough", async ({ page }) => {
      await gotoAuthenticated(page, "/exercise/analytical");
      await generateExercise(page, "DevOps", { level: "Guided" });
      await page.getByRole("radio").first().click();
      await page.getByRole("button", { name: "Next: check the sentences" }).click();
      await page.getByTestId("guided-current").getByRole("button", { name: "Has a problem" }).click();
      expect(await layoutProblems(page)).toEqual([]);
    });

    for (const [path, domain] of [["/exercise/evaluative", "Software Engineering"], ["/exercise/systems", "Cloud Architecture"]] as const) {
      test(`after generating on ${path}`, async ({ page }) => {
          await gotoAuthenticated(page, path);
        await generateExercise(page, domain);
        await page.waitForTimeout(1000);
        expect(await layoutProblems(page)).toEqual([]);
      });
    }

    test("systems: comparison with the model after feedback", async ({ page }) => {
      await gotoAuthenticated(page, "/exercise/systems");
      await generateExercise(page, "Cloud Architecture", { level: "Guided" });
      await advanceSystemsToCanvas(page);
      expect(await layoutProblems(page)).toEqual([]);
      await addSystemsConnection(page);
      await page.getByRole("button", { name: "Done connecting" }).click();
      await page.getByRole("button", { name: "Submit impact and get AI reflection" }).click();
      await expect(page.getByTestId("systems-answer-key")).toBeVisible({ timeout: 15_000 });
      expect(await layoutProblems(page)).toEqual([]);
    });

    test("evaluative: scoring comparison after feedback", async ({ page }) => {
      await gotoAuthenticated(page, "/exercise/evaluative");
      await selectEvaluativeTaskType(page, "Dealbreaker check");
      await generateExercise(page, "Vendor Selection");
      await advanceEvaluativeToMatrix(page);
      expect(await layoutProblems(page)).toEqual([]);
      await page.getByRole("button", { name: "Get AI feedback" }).click();
      await expect(page.getByTestId("evaluative-answer-key")).toBeVisible({ timeout: 15_000 });
      expect(await layoutProblems(page)).toEqual([]);
    });

    test("life situations: learn first, lenses, ranking and comparison", async ({ page }) => {
      await gotoAuthenticated(page, "/exercise/judgment");
      await page.getByTestId("level-picker").getByRole("button", { name: /^Standard/ }).click();
      await page.getByRole("button", { name: "Generate exercise" }).click();
      await expect(page.getByTestId("learn-first")).toBeVisible({ timeout: 15_000 });
      expect(await layoutProblems(page)).toEqual([]);
      await page.getByRole("radio", { name: "To keep respect on both sides" }).click();
      await page.getByRole("button", { name: "Start the exercise" }).click();
      for (const answer of ["The wrong number", "Stressed about the report", "Your next step"]) {
        await page.getByRole("radio", { name: answer }).click();
      }
      expect(await layoutProblems(page)).toEqual([]);
      await page.getByRole("button", { name: "Choose a response" }).click();
      await page.getByLabel(/Why is your first choice/).fill("It keeps respect.");
      expect(await layoutProblems(page)).toEqual([]);
      await page.getByRole("button", { name: "Get AI feedback" }).click();
      await expect(page.getByTestId("judgment-answer-key")).toBeVisible({ timeout: 15_000 });
      expect(await layoutProblems(page)).toEqual([]);
    });

    test("strategic situations: guided matrix, expert questions and results", async ({ page }) => {
      await gotoAuthenticated(page, "/exercise/strategy");
      await page.getByTestId("level-picker").getByRole("button", { name: /^Expert/ }).click();
      await page.getByRole("button", { name: "Generate exercise" }).click();
      await page.getByRole("radio", { name: "Your best choice given the other's choice" }).click({ timeout: 15_000 });
      await page.getByRole("button", { name: "Start the exercise" }).click();
      expect(await layoutProblems(page)).toEqual([]);
      await page.getByRole("button", { name: "Next: Burrito Bar" }).click();
      await page.getByRole("button", { name: "Predict the outcome" }).click();
      expect(await layoutProblems(page)).toEqual([]);
      await page.getByTestId("prediction-matrix").getByRole("button", { name: /Outcome 4/ }).click();
      for (const q of await page.getByTestId("dominant-question").all()) await q.getByRole("button", { name: "Cut price" }).click();
      await page.getByRole("button", { name: "Get AI feedback" }).click();
      await expect(page.getByTestId("strategy-answer-key")).toBeVisible({ timeout: 15_000 });
      expect(await layoutProblems(page)).toEqual([]);
    });

    test("reframe: thought list, monologue, rewrite and answer key", async ({ page }) => {
      for (const level of ["Standard", "Expert"] as const) {
        await gotoAuthenticated(page, "/exercise/reframe");
        await page.getByTestId("level-picker").getByRole("button", { name: new RegExp(`^${level}`) }).click();
        await page.getByRole("button", { name: "Generate exercise" }).click();
        await page.getByRole("radio", { name: "I missed the deadline by a day" }).click({ timeout: 15_000 });
        await page.getByRole("button", { name: "Start the exercise" }).click();
        await page.getByRole("radiogroup", { name: "Main feeling" }).getByRole("radio", { name: "Overwhelmed" }).click();
        if (level === "Standard") {
          for (const q of await page.getByTestId("thought-question").all()) await q.getByRole("radio", { name: "Realistic" }).click();
        } else {
          await page.getByTestId("monologue").getByRole("button", { name: "I always mess things up." }).click();
        }
        expect(await layoutProblems(page)).toEqual([]);
        await page.getByRole("button", { name: "Reframe a thought" }).click();
        for (const box of await page.getByRole("textbox").all()) await box.fill("I made one mistake, and I can fix it today.");
        expect(await layoutProblems(page)).toEqual([]);
        await page.getByRole("button", { name: "Get AI feedback" }).click();
        await expect(page.getByTestId("reframe-answer-key")).toBeVisible({ timeout: 15_000 });
        expect(await layoutProblems(page)).toEqual([]);
      }
    });

    test("calibration: questions, ranges, base rate table and answer key", async ({ page }) => {
      await gotoAuthenticated(page, "/exercise/calibration");
      await page.getByTestId("level-picker").getByRole("button", { name: /^Standard/ }).click();
      await page.getByRole("button", { name: "Start exercise" }).click();
      await page.getByRole("radio", { name: "About 9" }).click();
      await page.getByRole("button", { name: "Start the exercise" }).click();
      await page.getByRole("button", { name: "Show the table for 10,000" }).first().click();
      for (const card of await page.getByTestId("calibration-item").all()) {
        const radios = card.getByRole("radiogroup");
        if ((await radios.count()) === 2) {
          await radios.nth(0).getByRole("radio").first().click();
          await radios.nth(1).getByRole("radio", { name: "100%" }).click();
        } else if ((await card.getByLabel("Low").count()) > 0) {
          await card.getByLabel("Low").fill("123,456,789");
          await card.getByLabel("High").fill("987,654,321");
        } else {
          await card.getByLabel("Your answer").fill("12.5");
        }
      }
      expect(await layoutProblems(page)).toEqual([]);
      await page.getByRole("button", { name: "Check my answers" }).click();
      await expect(page.getByTestId("calibration-answer-key")).toBeVisible({ timeout: 15_000 });
      expect(await layoutProblems(page)).toEqual([]);
    });

    test("practice page: start from a mode with filters and 10 topics", async ({ page }) => {
      await gotoAuthenticated(page, "/reasoning");
      await page.getByRole("radio", { name: "A mode" }).click();
      await page.getByRole("radiogroup", { name: "Exercise mode" }).getByRole("radio", { name: /Life situations/ }).click();
      await page.getByTestId("mode-panel").getByTestId("topic-generate").click();
      await expect(page.getByTestId("topic-row")).toHaveCount(10);
      expect(await layoutProblems(page)).toEqual([]);
    });
  });
}
