import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, stubFirestoreReads } from "./helpers/auth-setup";

test.describe("Decisions page - layout and add form", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders page heading and home link", async ({ page }) => {
    await page.goto("/decisions");
    await expect(
      page.getByRole("heading", { name: "Real decisions" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
  });

  test("renders Add decision form with all fields", async ({ page }) => {
    await page.goto("/decisions");

    await expect(
      page.getByRole("heading", { name: "Add decision" }),
    ).toBeVisible();
    await expect(page.getByLabel("Decision")).toBeVisible();
    await expect(page.getByLabel("Domain")).toBeVisible();
    await expect(page.getByLabel("Date decided")).toBeVisible();
    await expect(page.getByLabel("Outcome reminder")).toBeVisible();
    await expect(page.getByLabel("Link exercise (optional)")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save decision" }),
    ).toBeVisible();
  });

  test("renders the decision log card", async ({ page }) => {
    await page.goto("/decisions");
    await expect(
      page.getByRole("heading", { name: "Log" }),
    ).toBeVisible();
  });

  test("date field defaults to today", async ({ page }) => {
    await page.goto("/decisions");
    const dateInput = page.getByLabel("Date decided");
    const value = await dateInput.inputValue();
    const today = new Date().toISOString().slice(0, 10);
    expect(value).toBe(today);
  });

  test("outcome reminder defaults to on", async ({ page }) => {
    await page.goto("/decisions");
    await expect(
      page.getByText("Set reminder 7 days after decided date"),
    ).toBeVisible();
  });

  test("can fill in decision text", async ({ page }) => {
    await page.goto("/decisions");
    const textarea = page.getByLabel("Decision");
    await textarea.fill("Decided to migrate database to PostgreSQL");
    await expect(textarea).toHaveValue("Decided to migrate database to PostgreSQL");
  });

  test("can turn off outcome reminder", async ({ page }) => {
    await page.goto("/decisions");
    const reminderTrigger = page
      .getByLabel("Outcome reminder")
      .locator("..")
      .getByRole("combobox");
    await reminderTrigger.click();
    await page.getByRole("option", { name: "No reminder" }).click();
    await expect(page.getByText("No reminder")).toBeVisible();
  });

  test("link exercise defaults to None", async ({ page }) => {
    await page.goto("/decisions");
    await expect(page.getByText("None")).toBeVisible();
  });

  test("home link navigates back to /", async ({ page }) => {
    await page.goto("/decisions");
    await page.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });
});
