import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";

const TERMS = [
  { term: "Saving face", plain: "Keeping respect for yourself and others in front of people.", example: "She talked in private, so he could keep saving face." },
  { term: "Circle of control", plain: "The things you can change by your own actions.", example: "Weather is outside my circle of control." },
  { term: "Sunk cost", plain: "Money or time already spent that you cannot get back.", example: "Do not stay only because of the sunk cost." },
  { term: "Base rate", plain: "How common something is before you look at the details.", example: "Check the base rate first." },
  { term: "Anchoring", plain: "Leaning too much on the first number you hear.", example: "The first price became an anchoring point." },
];

/** Finished Life situations rows holding `terms`, met long ago, in the e2e Firestore store. */
async function seedTerms(page: Page, terms: typeof TERMS) {
  const half = Math.ceil(terms.length / 2);
  const row = (id: string, concepts: typeof TERMS, day: string) => ({
    id,
    type: "judgment",
    domain: "Work",
    title: `Seeded ${id}`,
    scenario: "A seeded situation.",
    concepts,
    conceptChecks: [],
    lensQuestions: [],
    responses: [],
    level: "guided",
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: `${day}T09:00:00.000Z`,
    completedAt: `${day}T09:30:00.000Z`,
  });
  const store = {
    "e2e-test-user-uid": {
      exercises: {
        s1: row("s1", terms.slice(0, half), "2026-09-01"),
        ...(terms.length > half ? { s2: row("s2", terms.slice(half), "2026-09-02") } : {}),
      },
    },
  };
  // Seed once per test: later page loads keep what the app saved.
  await page.addInitScript((data) => {
    if (!window.sessionStorage.getItem("cogi:e2e-firestore")) {
      window.sessionStorage.setItem("cogi:e2e-firestore", JSON.stringify(data));
    }
  }, store);
}

/** The term whose meaning is shown (with the term blanked). */
async function shownTerm(page: Page) {
  const q = page.getByTestId("term-review-question");
  for (const t of TERMS) {
    if (await q.getByText(t.plain, { exact: false }).count()) return t;
  }
  throw new Error("no seeded meaning on screen");
}

test.describe("Review terms", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("Today row -> 5 terms by meaning -> done; nothing left due", async ({ page }) => {
    await seedTerms(page, TERMS);
    await gotoAuthenticated(page, "/");
    const row = page.getByTestId("term-review-row");
    await expect(row).toContainText("5 ideas", { timeout: 15_000 });
    await row.click();
    await expect(page).toHaveURL(/\/terms\/review/);

    const q = page.getByTestId("term-review-question");
    for (let i = 0; i < TERMS.length; i++) {
      await expect(q).toContainText(`Term ${i + 1} of 5`);
      await expect(q.getByRole("radio")).toHaveCount(4);
      const target = await shownTerm(page);
      // The clue never shows the term itself.
      await expect(q.locator(".border-l-2")).not.toContainText(target.term, { ignoreCase: true });
      if (i === 0) {
        await q.getByRole("radio").filter({ hasNotText: target.term }).first().click();
        await expect(page.getByTestId("term-review-answer")).toContainText(`Not quite: it is ${target.term}.`);
      } else {
        await q.getByRole("radio", { name: target.term }).click();
        await expect(page.getByTestId("term-review-answer")).toContainText("Right.");
      }
      await page.getByRole("button", { name: i < TERMS.length - 1 ? "Next term" : "Finish" }).click();
    }
    await expect(page.getByTestId("term-review-done")).toContainText("4 of 5 right.");

    await page.getByRole("link", { name: "My terms" }).click();
    await expect(page.getByTestId("term-status")).toHaveCount(5);
    await expect(page.getByTestId("term-status").filter({ hasText: "Due" })).toHaveCount(0);
    await expect(page.getByTestId("terms-review-link")).toHaveCount(0);

    await gotoAuthenticated(page, "/");
    await expect(page.getByTestId("geo-lab-card")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("term-review-row")).toHaveCount(0);
  });

  test("fewer than 4 terms: recall, show the meaning, say if you knew it", async ({ page }) => {
    await seedTerms(page, TERMS.slice(0, 2));
    await gotoAuthenticated(page, "/terms");
    await expect(page.getByTestId("term-status").filter({ hasText: "Due" })).toHaveCount(2, { timeout: 15_000 });
    await page.getByTestId("terms-review-link").click();

    const q = page.getByTestId("term-review-question");
    await expect(q.getByRole("radio")).toHaveCount(0);
    await page.getByRole("button", { name: "Show the meaning" }).click();
    await expect(page.getByTestId("term-review-answer")).toBeVisible();
    await page.getByRole("button", { name: "I knew it" }).click();
    await page.getByRole("button", { name: "Next term" }).click();
    await page.getByRole("button", { name: "Show the meaning" }).click();
    await page.getByRole("button", { name: "Not yet" }).click();
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByTestId("term-review-done")).toContainText("1 of 2 right.");
  });

  test("nothing due shows a short note", async ({ page }) => {
    await gotoAuthenticated(page, "/terms/review");
    await expect(page.getByTestId("term-review-empty")).toBeVisible({ timeout: 15_000 });
  });
});
