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
    await page.getByText("Type", { exact: true }).locator("..").getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "All" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Analytical" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Systems" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Evaluative" })).toBeVisible();
  });

  test("can type in domain filter", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
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

  test("heatmap legend shows the three exercise types", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/history");
    const heatmapCard = page.locator('[data-slot="card"]').filter({
      has: page.getByRole("heading", { name: "Activity" }),
    });
    await expect(heatmapCard.getByText("Analytical", { exact: true })).toBeVisible();
    await expect(heatmapCard.getByText("Systems", { exact: true })).toBeVisible();
    await expect(heatmapCard.getByText("Evaluative", { exact: true })).toBeVisible();
  });
});
