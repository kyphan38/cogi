import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";

test.describe("History page - layout and structure", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders heading and description", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
    await expect(
      page.getByRole("heading", { name: "Exercise history" }),
    ).toBeVisible();
  });

  test("hidden-feature sections are gone", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Calibration" })).toHaveCount(0);
    await expect(page.getByText("Avg calibration gap")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Realtime filters enabled" })).toHaveCount(0);
  });

  test("renders activity heatmap card", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
    await expect(
      page.getByRole("heading", { name: "Activity" }),
    ).toBeVisible();
    await expect(page.getByText(/Streak:/)).toBeVisible();
  });

  test("renders filters card with type, domain, and date inputs", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
    await page.getByRole("button", { name: "filters", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Filters" }),
    ).toBeVisible();
    await expect(
      page.getByText("Type", { exact: true }).locator("..").getByRole("combobox"),
    ).toBeVisible();
    await expect(page.getByPlaceholder("e.g. DevOps")).toBeVisible();
    await expect(
      page.getByText("Completed on or after").locator("..").locator('input[type="date"]'),
    ).toBeVisible();
    await expect(
      page.getByText("Completed on or before").locator("..").locator('input[type="date"]'),
    ).toBeVisible();
  });

  test("type filter offers the three exercise types", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
    await page.getByRole("button", { name: "filters", exact: true }).click();
    await page.getByText("Type", { exact: true }).locator("..").getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "All" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Analytical" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Systems" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Evaluative" })).toBeVisible();
  });

  test("can type in domain filter", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
    await page.getByRole("button", { name: "filters", exact: true }).click();
    const domainInput = page.getByPlaceholder("e.g. DevOps");
    await domainInput.fill("DevOps");
    await expect(domainInput).toHaveValue("DevOps");
  });

  test("shows empty state when no exercises match", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
    await expect(
      page.getByText("No exercises match these filters."),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows completed exercises heading", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
    await expect(
      page.getByRole("heading", { name: "Completed exercises" }),
    ).toBeVisible();
  });

  test("heatmap legend shows how many exercises a shade means", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
    const heatmapCard = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Activity" }),
    });
    await expect(heatmapCard.getByText("less", { exact: true })).toBeVisible();
    await expect(heatmapCard.getByText("more", { exact: true })).toBeVisible();
  });
});

test.describe("History page - activity grid", () => {
  const UID = "e2e-test-user-uid";

  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("a tap on a day lists its exercises and a row opens the review", async ({ page }) => {
    const at = new Date(Date.now() - 2 * 86_400_000);
    at.setHours(12, 0, 0, 0);
    const iso = at.toISOString();
    const items = [0, 1, 2, 3].map((i) => ({ id: `q${i}`, kind: "interval", answered: true, correct: i >= 2 }));
    const row = {
      id: "day1",
      type: "calibration",
      domain: "Mixed",
      title: "Seeded day exercise",
      items: [],
      concepts: [],
      conceptChecks: [],
      level: "standard",
      answers: {},
      result: {
        items,
        binary: { count: 0, right: 0, brier: null, buckets: [] },
        interval: { count: 4, hits: 2, target: 90, veryWide: 0 },
        baseRate: { count: 0, right: 0 },
      },
      confidenceBefore: 60,
      aiPerspective: "seeded",
      createdAt: iso,
      completedAt: iso,
      currentStep: 7,
    };
    await page.addInitScript((data) => {
      if (!window.sessionStorage.getItem("cogi:e2e-firestore")) {
        window.sessionStorage.setItem("cogi:e2e-firestore", JSON.stringify(data));
      }
    }, { [UID]: { exercises: { day1: row } } });

    await gotoAuthenticated(page, "/exercise/history");
    const day = page.locator(`[data-testid="heatmap-day"][data-day="${at.toLocaleDateString("en-CA")}"]`);
    await expect(day).toHaveAttribute("aria-label", /1 exercise$/);
    await expect(page.getByTestId("heatmap-day-list")).toHaveCount(0);

    await day.click();
    const list = page.getByTestId("heatmap-day-list");
    await expect(list).toContainText("Seeded day exercise");
    await expect(list).toContainText("Standard");
    await expect(list).toContainText("Ranges that miss the answer");

    await list.getByRole("button", { name: /Seeded day exercise/ }).click();
    await expect(page.getByRole("heading", { name: "Review" })).toBeInViewport();

    await day.click();
    await expect(page.getByTestId("heatmap-day-list")).toHaveCount(0);
  });
});
