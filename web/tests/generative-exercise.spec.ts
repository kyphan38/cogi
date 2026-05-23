import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { generateExercise, exerciseSourceCombobox } from "./helpers/exercise-flow";

test.describe("Generative exercise - setup phase", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders setup card with heading and generate button", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/generative");
    await expect(
      page.getByRole("heading", { name: "Generative exercise" }),
    ).toBeVisible();
    await expect(page.getByLabel("Domain")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate exercise" }),
    ).toBeVisible();
  });

  test("source selector shows AI-generated and My scenario options", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/generative");
    await exerciseSourceCombobox(page).click();
    await expect(page.getByRole("option", { name: "AI-generated from domain" })).toBeVisible();
    await expect(page.getByRole("option", { name: "My scenario" })).toBeVisible();
  });

  test("exercise shell has step progress navigation", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/generative");
    const progressNav = page.getByRole("navigation", { name: "Exercise progress" });
    await expect(progressNav).toBeVisible();
    await expect(progressNav.getByText("1. Setup")).toBeVisible();
  });
});

test.describe("Generative exercise - generation and writing", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("generating transitions to writing phase with scenario and prompts", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/generative");
    await generateExercise(page, "AI Ethics");

    await expect(
      page.getByRole("heading", { name: "AI Ethics Policy Framework" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/AI-powered hiring tool/)).toBeVisible();
  });

  test("writing phase shows all 4 prompts with textareas", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/generative");
    await generateExercise(page, "AI Ethics");

    await expect(
      page.getByRole("heading", { name: "AI Ethics Policy Framework" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("What is the core tension")).toBeVisible();
    await expect(page.getByText("What alternative approaches")).toBeVisible();
    await expect(page.getByText("What is the strongest argument against")).toBeVisible();
    await expect(page.getByText("If the tool is deployed")).toBeVisible();
  });

  test("edit stage shows pre-filled draft text in textareas", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/generative");
    await generateExercise(page, "AI Ethics");

    await expect(
      page.getByRole("heading", { name: "AI Ethics Policy Framework" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.locator("textarea").first()).toHaveValue(/speed-to-market/);
  });
});
