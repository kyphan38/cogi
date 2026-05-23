import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import {
  advanceEvaluativeToMatrix,
  exerciseSourceCombobox,
  generateExercise,
} from "./helpers/exercise-flow";

test.describe("Evaluative exercise - setup phase", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders setup card with heading and generate button", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await expect(
      page.getByRole("heading", { name: "Evaluative exercise" }),
    ).toBeVisible();
    await expect(page.getByLabel("Domain")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate exercise" }),
    ).toBeVisible();
  });

  test("source selector shows AI-generated and My scenario options", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await exerciseSourceCombobox(page).click();
    await expect(page.getByRole("option", { name: "AI-generated from domain" })).toBeVisible();
    await expect(page.getByRole("option", { name: "My scenario" })).toBeVisible();
  });

  test("exercise shell has step progress navigation", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    const progressNav = page.getByRole("navigation", { name: "Exercise progress" });
    await expect(progressNav).toBeVisible();
    await expect(progressNav.getByText("1. Setup")).toBeVisible();
  });
});

test.describe("Evaluative exercise - generation and matrix", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("generating transitions to criteria phase with scenario and options", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await generateExercise(page, "Software Engineering");

    await expect(
      page.getByRole("heading", { name: "Technology Stack Decision" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/frontend framework/)).toBeVisible();
    await expect(page.getByText("React + Next.js")).toBeVisible();
    await expect(
      page.getByText(/What 2–4 criteria would you use/),
    ).toBeVisible();
  });

  test("matrix board renders with axis labels and options palette", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await generateExercise(page, "Software Engineering");

    await expect(
      page.getByRole("heading", { name: "Technology Stack Decision" }),
    ).toBeVisible({ timeout: 15_000 });

    await advanceEvaluativeToMatrix(page);

    await expect(page.getByText("Team Ramp-up Time")).toBeVisible();
    await expect(page.getByText("Long-term Scalability")).toBeVisible();
    await expect(page.getByText("Options - drag into a quadrant")).toBeVisible();
  });

  test("all 4 options are visible in the palette", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await generateExercise(page, "Software Engineering");

    await expect(
      page.getByRole("heading", { name: "Technology Stack Decision" }),
    ).toBeVisible({ timeout: 15_000 });

    await advanceEvaluativeToMatrix(page);

    await expect(page.getByText("React + Next.js")).toBeVisible();
    await expect(page.getByText("Svelte + SvelteKit")).toBeVisible();
    await expect(page.getByText("Vue + Nuxt")).toBeVisible();
    await expect(page.getByText("HTMX + Jinja")).toBeVisible();
  });

  test("continue to confidence is disabled until all options are placed", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await generateExercise(page, "Software Engineering");

    await expect(
      page.getByRole("heading", { name: "Technology Stack Decision" }),
    ).toBeVisible({ timeout: 15_000 });

    await advanceEvaluativeToMatrix(page);

    await expect(
      page.getByRole("button", { name: "Continue to confidence" }),
    ).toBeDisabled();
  });
});
