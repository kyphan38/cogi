import { test, expect } from "@playwright/test";
import {
  bypassFirebaseAuth,
  clickMainNavLink,
  gotoAuthenticated,
  stubFirestoreReads,
} from "./helpers/auth-setup";

test.describe("Home page - exercise picker and navigation", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders the home heading and exercise picker cards", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/");
    await expect(
      page.getByRole("heading", { name: "Good moment to practice" }),
    ).toBeVisible();

    const analyticalCard = page.getByRole("link", {
      name: /Analytical.*Spot flawed reasoning/,
    });
    await expect(analyticalCard).toBeVisible();

    const comboCard = page.getByRole("link", {
      name: /Combo.*Multi-step scenario chain/,
    });
    await expect(comboCard).toBeVisible();
  });

  test("analytical card shows 'suggested today' badge", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await expect(page.getByText("suggested today")).toBeVisible();
  });

  test("clicking an exercise picker card navigates to that exercise", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/");
    await page
      .getByRole("link", { name: /Sequential.*Order a messy process/ })
      .click();
    await page.waitForURL(/\/exercise\/sequential/, { timeout: 15_000 });
  });

  test("clicking combo card navigates to /exercise/combo", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/");
    await page
      .getByRole("link", { name: /Combo.*Multi-step scenario chain/ })
      .click();
    await page.waitForURL("/exercise/combo", { timeout: 15_000 });
  });

  test("open actions section shows empty state message", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await expect(
      page.getByText(/Nothing here yet.*finish an exercise/),
    ).toBeVisible();
  });
});

test.describe("AppTopNav navigation", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("nav bar renders all primary links", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "History" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Decisions" })).toBeVisible();
  });

  test("navigating to /settings via nav link", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await clickMainNavLink(page, "Settings", "/settings");
  });

  test("navigating to /decisions via nav link", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await clickMainNavLink(page, "Decisions", "/decisions");
  });

  test("navigating to /exercise/history via nav link", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await clickMainNavLink(page, "History", "/exercise/history");
  });

  test("navigating to /dashboard via nav link", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await clickMainNavLink(page, "Dashboard", "/dashboard");
  });

  test("nav bar persists across route transitions", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    const nav = page.getByRole("navigation", { name: "Main" });

    await clickMainNavLink(page, "Settings", "/settings");
    await expect(nav).toBeVisible();

    await clickMainNavLink(page, "Dashboard", "/dashboard");
    await expect(nav).toBeVisible();

    await clickMainNavLink(page, "Home", "/");
    await expect(nav).toBeVisible();
  });

  test("sign out button is present in the nav", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await expect(
      page.getByRole("button", { name: "Sign out" }),
    ).toBeVisible();
  });
});

test.describe("Dashboard page content", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("dashboard page renders heading and summary section", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(
      page.getByText("Trends from exercises saved to your account."),
    ).toBeVisible();
  });

  test("dashboard shows WeeklyInsights card with patterns heading", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/dashboard");
    await expect(
      page.getByRole("heading", { name: "Patterns (local)" }),
    ).toBeVisible();
    await expect(
      page.getByText("Journal emotions and AI perspective disagreements"),
    ).toBeVisible();
  });

  test("dashboard shows calibration gap card", async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await expect(
      page.getByRole("heading", { name: "Calibration gap" }),
    ).toBeVisible();
  });
});

test.describe("Exercise type routing", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("unknown exercise type shows 404", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/nonexistent");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  });

  test("valid exercise types load without 404", async ({ page }) => {
    for (const type of ["analytical", "sequential", "systems", "evaluative", "generative"]) {
      const response = await page.goto(`/exercise/${type}`);
      expect(response?.status()).not.toBe(404);
    }
  });
});
