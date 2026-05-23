import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { comboboxBelowLabel } from "./helpers/exercise-flow";

test.describe("Decisions page - layout and add form", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders page heading and home link", async ({ page }) => {
    await gotoAuthenticated(page, "/decisions");
    await expect(
      page.getByRole("heading", { name: "Real decisions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Home" }),
    ).toBeVisible();
  });

  test("renders Add decision form with all fields", async ({ page }) => {
    await gotoAuthenticated(page, "/decisions");

    await expect(
      page.getByRole("heading", { name: "Add decision" }),
    ).toBeVisible();
    await expect(page.getByLabel("Decision")).toBeVisible();
    await expect(page.getByLabel("Domain")).toBeVisible();
    await expect(page.getByLabel("Date decided")).toBeVisible();
    await expect(comboboxBelowLabel(page, "Outcome reminder")).toBeVisible();
    await expect(comboboxBelowLabel(page, "Link exercise (optional)")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save decision" }),
    ).toBeVisible();
  });

  test("renders the decision log card", async ({ page }) => {
    await gotoAuthenticated(page, "/decisions");
    await expect(
      page.getByRole("heading", { name: "Log" }),
    ).toBeVisible();
  });

  test("date field defaults to today", async ({ page }) => {
    await gotoAuthenticated(page, "/decisions");
    const dateInput = page.getByLabel("Date decided");
    const value = await dateInput.inputValue();
    const today = new Date().toISOString().slice(0, 10);
    expect(value).toBe(today);
  });

  test("outcome reminder defaults to on", async ({ page }) => {
    await gotoAuthenticated(page, "/decisions");
    const reminder = comboboxBelowLabel(page, "Outcome reminder");
    await reminder.click();
    await expect(
      page.getByRole("option", { name: "Set reminder 7 days after decided date" }),
    ).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
  });

  test("can fill in decision text", async ({ page }) => {
    await gotoAuthenticated(page, "/decisions");
    const textarea = page.getByLabel("Decision");
    await textarea.fill("Decided to migrate database to PostgreSQL");
    await expect(textarea).toHaveValue("Decided to migrate database to PostgreSQL");
  });

  test("can turn off outcome reminder", async ({ page }) => {
    await gotoAuthenticated(page, "/decisions");
    await comboboxBelowLabel(page, "Outcome reminder").click();
    await page.getByRole("option", { name: "No reminder" }).click();
    await expect(page.getByText("No reminder")).toBeVisible();
  });

  test("link exercise defaults to None", async ({ page }) => {
    await gotoAuthenticated(page, "/decisions");
    await expect(page.getByText("None")).toBeVisible();
  });

  test("home link navigates back to /", async ({ page }) => {
    await gotoAuthenticated(page, "/decisions");
    await page.getByRole("main").getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });
});
