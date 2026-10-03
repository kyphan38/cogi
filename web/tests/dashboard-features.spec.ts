import { test, expect } from "@playwright/test";
import {
  bypassFirebaseAuth,
  clickMainNavLink,
  gotoAuthenticated,
  stubFirestoreReads,
} from "./helpers/auth-setup";

test.describe("Home page - resume and navigation", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders the home heading", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await expect(
      page.getByRole("heading", { name: "Practice" }),
    ).toBeVisible();
  });

  test("shows one primary New exercise action that opens the picker", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await page.getByRole("link", { name: "New exercise" }).click();
    await page.waitForURL("/reasoning", { timeout: 15_000 });
  });

  test("no longer shows math or learning notes on the start page", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await expect(page.getByRole("link", { name: "Math", exact: true })).toHaveCount(0);
    await expect(page.getByText("Learning Notes")).toHaveCount(0);
    await expect(page.getByText("No exercises yet. Start with New exercise.")).toBeVisible();
  });
});

test.describe("Reasoning page - exercise picker and navigation", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders the reasoning heading and exercise picker cards", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/reasoning");
    await expect(
      page.getByRole("heading", { name: "New exercise" }),
    ).toBeVisible();

    for (const name of [/Evaluative.*Compare options fairly/, /Systems.*Map feedback loops/, /Analytical.*Spot flawed reasoning/]) {
      await expect(page.getByRole("link", { name })).toBeVisible();
    }
    // Removed types (PLAN-simplify.md) have no card.
    for (const name of [/Combo/, /Sequential/, /Generative/]) {
      await expect(page.getByRole("link", { name })).toHaveCount(0);
    }
  });

  test("reasoning page shows domain input and find-best-mode button", async ({ page }) => {
    await gotoAuthenticated(page, "/reasoning");
    await expect(page.getByLabel("Domain")).toBeVisible();
    await expect(page.getByRole("button", { name: "Find best mode" })).toBeVisible();
  });

  test("clicking an exercise picker card navigates to that exercise", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/reasoning");
    await page
      .getByRole("link", { name: /Systems.*Map feedback loops/ })
      .click();
    await page.waitForURL(/\/exercise\/systems/, { timeout: 15_000 });
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
    await expect(nav.getByRole("link")).toHaveText(["Practice", "History", "Settings", "Handbook"]);
  });

  test("the Handbook tab opens the handbook, active in the nav", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await clickMainNavLink(page, "Handbook", "/handbook");
    await expect(page.getByRole("heading", { name: "Handbook", level: 1 })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Handbook" })).toHaveClass(/font-medium/);
    await expect(page.getByTestId("handbook-start")).toContainText("Start here");
    // Every exercise type and tool has an entry, reachable from the contents.
    await expect(page.getByTestId("handbook-entry")).toHaveCount(11);
    await page.getByTestId("handbook-contents").getByRole("link", { name: "Strategic situations" }).click();
    await expect(page).toHaveURL(/#strategy$/);
  });

  test("Practice stays active while picking and doing an exercise", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Main" });
    for (const path of ["/reasoning", "/exercise/evaluative"]) {
      await gotoAuthenticated(page, path);
      await expect(nav.getByRole("link", { name: "Practice" })).toHaveClass(/font-medium/);
    }
  });

  test("navigating to /settings via nav link", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await clickMainNavLink(page, "Settings", "/settings");
  });

  test("navigating to /exercise/history via nav link", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await clickMainNavLink(page, "History", "/exercise/history");
  });

  test("nav bar persists across route transitions", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    const nav = page.getByRole("navigation", { name: "Main" });

    await clickMainNavLink(page, "Settings", "/settings");
    await expect(nav).toBeVisible();

    await clickMainNavLink(page, "History", "/exercise/history");
    await expect(nav).toBeVisible();

    await clickMainNavLink(page, "Practice", "/");
    await expect(nav).toBeVisible();
  });

  test("sign out button is present in the nav", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await expect(
      page.getByRole("button", { name: "Sign out" }),
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

  test("the three exercise types load without 404", async ({ page }) => {
    for (const type of ["analytical", "systems", "evaluative"]) {
      const response = await page.goto(`/exercise/${type}`);
      expect(response?.status()).not.toBe(404);
    }
  });

  test("removed exercise types and pages return 404", async ({ page }) => {
    // The [type] route calls notFound() while streaming, so it shows the 404 page with a 200.
    for (const type of ["sequential", "generative", "combo"]) {
      await page.goto(`/exercise/${type}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    }
    for (const path of ["/dashboard", "/math", "/decisions", "/guide"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });
});
