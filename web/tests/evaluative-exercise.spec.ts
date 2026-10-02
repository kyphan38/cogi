import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import {
  advanceEvaluativeToMatrix,
  exerciseSourceCombobox,
  generateExercise,
  selectEvaluativeTaskType,
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

  test("get AI feedback is disabled until all options are placed", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    await generateExercise(page, "Software Engineering");

    await expect(
      page.getByRole("heading", { name: "Technology Stack Decision" }),
    ).toBeVisible({ timeout: 15_000 });

    await advanceEvaluativeToMatrix(page);

    await expect(
      page.getByRole("button", { name: "Get AI feedback" }),
    ).toBeDisabled();
  });
});

test.describe("Evaluative exercise - 3-step practice loop", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("setup -> evaluate with confidence -> AI feedback -> takeaway -> saved", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/evaluative");
    const progress = page.getByRole("navigation", { name: "Exercise progress" });
    await expect(progress.getByText(/^\d\. /)).toHaveText(["1. Setup", "2. Evaluate", "3. AI feedback"]);

    await selectEvaluativeTaskType(page, "Dealbreaker check");
    await generateExercise(page, "Vendor Selection");
    await expect(page.getByRole("heading", { name: "Vendor Contract Renewal" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^Part 1 of 2 · /)).toBeVisible();

    await advanceEvaluativeToMatrix(page);
    await expect(page.getByText(/^Part 2 of 2 · /)).toBeVisible();
    // Confidence is part of the work step now, not a step of its own.
    await expect(page.getByText("How confident are you in your evaluation?")).toBeVisible();

    await page.getByRole("button", { name: "Get AI feedback" }).click();
    await expect(page.getByLabel(/What will you take away/)).toBeVisible({ timeout: 15_000 });
    await expect(progress.getByText("3. AI feedback")).toHaveClass(/bg-zinc-900/);
    await expect(page.getByText(/Journal|Action bridge/)).toHaveCount(0);

    await page.getByLabel(/What will you take away/).fill("Check deal-breakers before weighing the rest.");
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Check deal-breakers before weighing the rest.")).toBeVisible();
    await expect(page.getByRole("link", { name: "New exercise" })).toBeVisible();

    // The takeaway shows up again when reviewing the exercise in History.
    await page.getByRole("link", { name: "History", exact: true }).click();
    await page.getByRole("button", { name: /^Vendor Contract Renewal/ }).click();
    await expect(page.getByRole("heading", { name: "Takeaway" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Check deal-breakers before weighing the rest.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Journal" })).toHaveCount(0);
  });
});

