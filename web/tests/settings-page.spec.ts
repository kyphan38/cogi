import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";

test.describe("Settings page - layout and controls", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders settings heading and description", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");
    await expect(
      page.getByRole("heading", { name: "Settings" }),
    ).toBeVisible();
    await expect(page.getByLabel("Personal context")).toBeVisible();
  });

  test("hidden-feature options are gone", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");
    await expect(page.getByLabel("Personal context")).toBeVisible();
    await expect(page.getByLabel("Delayed recall")).toHaveCount(0);
    await expect(page.getByLabel("Adaptive difficulty")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Geopolitics progression" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Download journal as Markdown" })).toHaveCount(0);
  });

  test("renders personal context textarea", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");
    await expect(page.getByLabel("Personal context")).toBeVisible();
  });

  test("can type into personal context textarea", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");
    const textarea = page.getByLabel("Personal context");
    await textarea.fill("I am a senior engineer focused on distributed systems");
    await expect(textarea).toHaveValue("I am a senior engineer focused on distributed systems");
  });

  test("renders Save button and navigation links", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Home" })).toBeVisible();
  });

  test("Home link navigates to /", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");
    await page.getByRole("main").getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("Settings page - keyboard shortcuts card", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders keyboard shortcuts card", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");
    await expect(
      page.getByRole("heading", { name: "Keyboard" }),
    ).toBeVisible();
    await expect(page.getByText("Escape")).toBeVisible();
  });
});

test.describe("Settings page - data backup card", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders data backup card with export and import controls", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");
    await expect(
      page.getByRole("heading", { name: "Data backup" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download JSON backup" }),
    ).toBeVisible();
    await expect(page.getByLabel("Import JSON backup")).toBeVisible();
  });
});
