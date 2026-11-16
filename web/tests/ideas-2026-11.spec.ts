import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";

const UID = "e2e-test-user-uid";
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

/** A finished Calibration row: `misses` of 4 ranges missed the answer. */
function calibrationRow(id: string, finishedDaysAgo: number, misses: number, extra: object = {}) {
  const at = daysAgo(finishedDaysAgo);
  const items = [0, 1, 2, 3].map((i) => ({ id: `${id}-q${i}`, kind: "interval", answered: true, correct: i >= misses }));
  return {
    id,
    type: "calibration",
    domain: "Mixed",
    title: `Seeded ${id}`,
    items: [],
    concepts: [],
    conceptChecks: [],
    level: "guided",
    answers: {},
    result: {
      items,
      binary: { count: 0, right: 0, brier: null, buckets: [] },
      interval: { count: 4, hits: 4 - misses, target: 90, veryWide: 0 },
      baseRate: { count: 0, right: 0 },
    },
    confidenceBefore: 60,
    aiPerspective: "seeded",
    createdAt: at,
    completedAt: at,
    currentStep: 7,
    ...extra,
  };
}

async function seed(page: Page, store: { exercises?: Record<string, object>; settings?: Record<string, object> }) {
  // Seed once per test: later page loads keep what the app saved.
  await page.addInitScript((data) => {
    if (!window.sessionStorage.getItem("cogi:e2e-firestore")) {
      window.sessionStorage.setItem("cogi:e2e-firestore", JSON.stringify(data));
    }
  }, { [UID]: store });
}

const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(window.sessionStorage.getItem("cogi:e2e-firestore") ?? "{}")) as Promise<
    Record<string, Record<string, Record<string, Record<string, unknown>>>>
  >;

test.beforeEach(async ({ page }) => {
  await bypassFirebaseAuth(page);
  await stubFirestoreReads(page);
});

test.describe("Handbook (C8)", () => {
  test("entries start folded; the contents open one and stay on screen", async ({ page }) => {
    await gotoAuthenticated(page, "/handbook");
    await expect(page.getByTestId("handbook-entry-body")).toHaveCount(0);
    await page.getByTestId("handbook-contents").getByRole("link", { name: "Forecasts" }).click();
    await expect(page).toHaveURL(/#forecasts$/);
    const entry = page.locator("#forecasts");
    await expect(entry.getByTestId("handbook-entry-body")).toBeVisible();
    await expect(entry.getByRole("heading", { name: "What you get" })).toBeVisible();
    await expect(page.getByTestId("handbook-contents")).toBeInViewport();
    await entry.getByRole("button", { expanded: true }).click();
    await expect(page.getByTestId("handbook-entry-body")).toHaveCount(0);
  });

  test("a link with an anchor opens that entry", async ({ page }) => {
    await gotoAuthenticated(page, "/handbook#quick");
    await expect(page.locator("#quick").getByTestId("handbook-entry-body")).toBeVisible();
  });
});

test.describe("Today follow-ups (C1, C2, C4)", () => {
  test("asks about a plan a week later and saves the answer", async ({ page }) => {
    await seed(page, { exercises: { p1: calibrationRow("p1", 9, 0, { usePlan: "Ask for the base rate in Friday's review" }) } });
    await gotoAuthenticated(page, "/");
    const check = page.getByTestId("use-check");
    await expect(check).toContainText("Ask for the base rate in Friday's review");
    await check.getByRole("button", { name: "partly" }).click();
    await check.getByLabel("What happened").fill("Asked once, then forgot.");
    await check.getByRole("button", { name: "save" }).click();
    await expect(check).toHaveCount(0);
    const row = (await stored(page))[UID]!.exercises!.p1!;
    expect(row.useCheck).toMatchObject({ result: "partly", note: "Asked once, then forgot." });
  });

  test("does not ask before a week has passed, or without a plan", async ({ page }) => {
    await seed(page, {
      exercises: { early: calibrationRow("early", 3, 0, { usePlan: "Soon" }), none: calibrationRow("none", 9, 0) },
    });
    await gotoAuthenticated(page, "/");
    await expect(page.getByTestId("home-stats")).toBeVisible();
    await expect(page.getByTestId("use-check")).toHaveCount(0);
  });

  test("lists the most missed thing with a link to practise it", async ({ page }) => {
    await seed(page, { exercises: { w1: calibrationRow("w1", 2, 3), w2: calibrationRow("w2", 1, 2) } });
    await gotoAuthenticated(page, "/");
    const spot = page.getByTestId("weak-spot");
    await expect(spot).toHaveCount(1);
    await expect(spot).toContainText("Ranges that miss the answer");
    await expect(spot).toContainText("missed 5 of 8");
    await expect(spot).toHaveAttribute("href", "/exercise/calibration?focus=calibration%3Ainterval");
  });

  test("offers an exercise from 30 days ago again and opens a fresh copy", async ({ page }) => {
    await seed(page, { exercises: { old: calibrationRow("old", 40, 1), recent: calibrationRow("recent", 5, 1) } });
    await gotoAuthenticated(page, "/");
    const redo = page.getByTestId("redo-row");
    await expect(redo).toContainText("Seeded old");
    await redo.getByRole("button").click();
    await expect(page).toHaveURL(/\/exercise\/calibration\?resumeId=[\w-]+&redo=1$/);
    const rows = Object.values((await stored(page))[UID]!.exercises!);
    const copy = rows.find((r) => r.redoOf === "old")!;
    expect(copy).toMatchObject({ completedAt: null, result: null, currentStep: 1, title: "Seeded old" });
  });

  test("History shows the two tries of a redone exercise next to each other", async ({ page }) => {
    await seed(page, {
      exercises: { first: calibrationRow("first", 40, 3), again: calibrationRow("again", 1, 1, { redoOf: "first" }) },
    });
    await gotoAuthenticated(page, "/exercise/history?openExercise=again");
    const compare = page.getByTestId("redo-compare");
    await expect(compare).toContainText("1 of 4 right");
    await expect(compare).toContainText("3 of 4 right");
    await expect(compare).toContainText("Better than the first try.");
  });
});

test.describe("Forecasts (C3)", () => {
  test("a due forecast shows on Today, is resolved there and scored", async ({ page }) => {
    const due = { id: "f1", question: "The release ships this month", probability: 80, dueDay: localDay(daysAgo(1)), createdAt: daysAgo(20), outcome: null, resolvedAt: null };
    await seed(page, { settings: { forecasts: { id: "forecasts", forecasts: [due] } } });
    await gotoAuthenticated(page, "/");
    const list = page.getByTestId("forecast-due");
    await expect(list).toContainText("The release ships this month");
    await expect(list).toContainText("You said 80%");
    await list.getByRole("button", { name: "it happened" }).click();
    await expect(list).toHaveCount(0);

    await gotoAuthenticated(page, "/forecasts");
    const record = page.getByTestId("forecast-record");
    // (0.8 - 1)^2 = 0.04
    await expect(record).toContainText("0.04");
    await expect(page.getByTestId("forecast-resolved")).toContainText("happened");
  });

  test("a new forecast needs a future day, then waits in the list", async ({ page }) => {
    await gotoAuthenticated(page, "/forecasts");
    const form = page.getByTestId("forecast-form");
    await form.getByLabel("What will happen?").fill("It rains on Saturday");
    await form.getByRole("button", { name: "Add forecast" }).click();
    await expect(form.getByRole("alert")).toContainText("Pick the day you will know.");
    await form.getByLabel("When will you know?").fill(localDay(daysAgo(-5)));
    await form.getByRole("button", { name: "Add forecast" }).click();
    await expect(page.getByTestId("forecast-open")).toContainText("It rains on Saturday");
    await expect(page.getByTestId("forecast-open")).toContainText("60%");
  });
});

test.describe("5-minute question (C5, C10)", () => {
  test("one question, a typed answer, one feedback, saved to History", async ({ page }) => {
    await page.route("**/api/ai/quick", async (route) => {
      const body = route.request().postDataJSON() as { action: string };
      const json =
        body.action === "question"
          ? { ok: true, question: { title: "A sales claim", scenario: "A shop says sales rose 20% after a new sign.", question: "What else could explain the rise?" } }
          : { ok: true, feedback: { strong: "You named the season.", missing: "You did not ask about last year.", nextTime: "What else changed at the same time?" } };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(json) });
    });
    await gotoAuthenticated(page, "/");
    await page.getByTestId("quick-link").click();
    await expect(page).toHaveURL(/\/quick$/);
    await expect(page.getByTestId("quick-question")).toContainText("What else could explain the rise?");
    await expect(page.getByTestId("quick-speak")).toBeVisible();
    const send = page.getByRole("button", { name: "Get feedback" });
    await expect(send).toBeDisabled();
    await page.getByLabel("Your answer").fill("It may be the holiday season, because more people shop then.");
    await send.click();
    const feedback = page.getByTestId("quick-feedback");
    await expect(feedback).toContainText("You named the season.");
    await expect(feedback).toContainText("What else changed at the same time?");
    await expect(page.getByTestId("quick-delivery")).toHaveCount(0);

    await gotoAuthenticated(page, "/exercise/history");
    await page.getByRole("button", { name: /^A sales claim/ }).click();
    await expect(page.getByTestId("quick-feedback")).toContainText("You did not ask about last year.");
  });

  test("a failed question can be tried again", async ({ page }) => {
    let fail = true;
    await page.route("**/api/ai/quick", async (route) => {
      if (fail) return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: "Model call failed" }) });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, question: { title: "T", scenario: "S.", question: "Why?" } }),
      });
    });
    await gotoAuthenticated(page, "/quick");
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Model call failed");
    fail = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("quick-question")).toContainText("Why?");
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  });
});

test.describe("Monthly review (C6)", () => {
  test("writes a review for the last full month and keeps it", async ({ page }) => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10, 12).toISOString();
    const row = (id: string, misses: number) => ({ ...calibrationRow(id, 0, misses), createdAt: lastMonth, completedAt: lastMonth });
    await seed(page, { exercises: { m1: row("m1", 1), m2: row("m2", 1), m3: row("m3", 2) } });
    let sent: { stats?: { total: number; types: { score: number }[] } } = {};
    await page.route("**/api/ai/monthly-review", async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, text: { headline: "You finished 3 exercises.", improved: [], steady: ["Calibration stayed at 67."], focus: "Make your ranges wider." } }),
      });
    });
    await gotoAuthenticated(page, "/exercise/history");
    await page.getByTestId("monthly-review-write").click();
    const review = page.getByTestId("monthly-review");
    await expect(review).toContainText("You finished 3 exercises.");
    await expect(review).toContainText("Make your ranges wider.");
    expect(sent.stats?.total).toBe(3);
    expect(sent.stats?.types[0]?.score).toBe(67);
    // Written once: the button is gone and the review is still there after a reload.
    await expect(page.getByTestId("monthly-review-write")).toHaveCount(0);
    await gotoAuthenticated(page, "/exercise/history");
    await expect(page.getByTestId("monthly-review")).toContainText("Make your ranges wider.");
  });

  test("offers nothing with too few exercises", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await expect(page.getByTestId("monthly-review-section")).toHaveCount(0);
  });
});

test.describe("Briefs (C7)", () => {
  test("makes a brief, answers a check and counts the month's limit", async ({ page }) => {
    const brief = {
      title: "Port strike ends",
      background: "Dock workers and port owners signed a deal after two weeks.",
      facts: [1, 2, 3, 4].map((i) => ({ text: `Fact number ${i}.`, source: "Example News, 3 Nov 2026" })),
      views: [
        { name: "Workers first", text: "The deal protects jobs." },
        { name: "Costs first", text: "The deal raises prices." },
      ],
      checks: [0, 1, 2].map((i) => ({ question: `Question ${i + 1}?`, options: [`A${i}`, `B${i}`, `C${i}`], answerIndex: i, explanation: `Because of reason ${i + 1}.` })),
      practise: [
        { type: "analytical", domain: "Port strike news" },
        { type: "systems", domain: "Shipping delays" },
      ],
    };
    let sent: { area?: string } = {};
    await page.route("**/api/ai/brief", async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, brief, sources: [{ title: "example.com", uri: "https://example.com/story" }] }),
      });
    });
    await gotoAuthenticated(page, "/briefs");
    await expect(page.getByTestId("brief-left")).toHaveText("4 of 4 left this month");
    await page.getByRole("button", { name: "Economy" }).click();
    await page.getByTestId("brief-new").click();
    const shown = page.getByTestId("brief");
    await expect(shown).toContainText("Port strike ends");
    await expect(shown).toContainText("Example News, 3 Nov 2026");
    expect(sent.area).toBe("Economy");
    await expect(page.getByTestId("brief-left")).toHaveText("3 of 4 left this month");

    const first = shown.getByTestId("brief-check").first();
    await first.getByRole("button", { name: "B0" }).click();
    await expect(first).toContainText("Because of reason 1.");
    await expect(first).toContainText("your pick");
    await expect(shown.getByRole("link", { name: /Port strike news/ })).toHaveAttribute("href", "/exercise/analytical?domain=Port%20strike%20news");
    await expect(shown.getByRole("link", { name: "example.com" })).toHaveAttribute("href", "https://example.com/story");

    // Saved: still there after a reload, with the answer.
    await gotoAuthenticated(page, "/briefs");
    await expect(page.getByTestId("brief").getByTestId("brief-check").first()).toContainText("Because of reason 1.");
  });
});
