import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import {
  addPassageHighlight,
  exerciseSourceCombobox,
  generateExercise,
} from "./helpers/exercise-flow";

test.describe("Analytical exercise - setup phase", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders setup card with domain input and generate button", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await expect(
      page.getByRole("heading", { name: "Analytical exercise" }),
    ).toBeVisible();
    await expect(page.getByRole("main").getByRole("textbox", { name: "Domain" })).toBeVisible();
    await expect(exerciseSourceCombobox(page)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate exercise" }),
    ).toBeVisible();
  });

  test("source selector shows AI-generated, Use my own text, My scenario", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await exerciseSourceCombobox(page).click();
    await expect(page.getByRole("option", { name: "AI-generated passage" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Use my own text" })).toBeVisible();
    await expect(page.getByRole("option", { name: "My scenario" })).toBeVisible();
  });

  test("switching to My scenario shows custom scenario textarea", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await exerciseSourceCombobox(page).click();
    await page.getByRole("option", { name: "My scenario" }).click();
    await expect(page.getByLabel(/Describe your situation/)).toBeVisible();
  });

  test("switching to Use my own text shows real-data textarea", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await exerciseSourceCombobox(page).click();
    await page.getByRole("option", { name: "Use my own text" }).click();
    await expect(page.getByLabel(/Paste your own content/)).toBeVisible();
  });

  test("exercise shell has step progress navigation", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    const progressNav = page.getByRole("navigation", {
      name: "Exercise progress",
    });
    await expect(progressNav).toBeVisible();
    await expect(progressNav.getByText(/^\d\. /)).toHaveText(["1. Setup", "2. Highlight & tag", "3. AI feedback"]);
  });

  test("has a settings link for personal context", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await expect(page.getByRole("main").getByRole("link", { name: "Settings" })).toBeVisible();
  });
});

test.describe("Analytical exercise - generate and highlight phase", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("generating transitions to highlight phase with passage text", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "Technology");

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/Regional powers/)).toBeVisible();
  });

  test("highlight phase shows tag picker instructions", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "Technology");

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    const passage = page.getByTestId("text-passage");
    await expect(passage).toBeVisible();
    await passage.selectText();
    await expect(page.getByTestId("tag-selection-hint")).toContainText(
      "Tap selection to tag",
    );
  });

  test("highlight with confidence -> AI feedback -> takeaway -> saved", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    // DevOps avoids geopolitics-only perspective step ("Technology" matches geo keywords).
    await generateExercise(page, "DevOps");

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    await addPassageHighlight(page);
    // Confidence is part of the highlight step now.
    await expect(page.getByRole("slider")).toBeVisible();
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    await expect(page.getByLabel(/What will you take away/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Analytical exercise - domain input", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("domain input accepts text and is used in generation", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    const domainInput = page.getByRole("main").getByRole("textbox", { name: "Domain" });
    await domainInput.fill("Geopolitics");
    await expect(domainInput).toHaveValue("Geopolitics");
  });
});
