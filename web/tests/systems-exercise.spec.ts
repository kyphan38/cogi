import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import {
  advanceSystemsToCanvas,
  exerciseSourceCombobox,
  generateExercise,
} from "./helpers/exercise-flow";

test.describe("Systems exercise - setup phase", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders setup card with heading and generate button", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await expect(
      page.getByRole("heading", { name: "Systems exercise" }),
    ).toBeVisible();
    await expect(page.getByLabel("Domain")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate exercise" }),
    ).toBeVisible();
  });

  test("source selector shows AI-generated and My scenario options", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await exerciseSourceCombobox(page).click();
    await expect(page.getByRole("option", { name: "AI-generated from domain" })).toBeVisible();
    await expect(page.getByRole("option", { name: "My scenario" })).toBeVisible();
  });

  test("switching to My scenario shows custom scenario textarea", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await exerciseSourceCombobox(page).click();
    await page.getByRole("option", { name: "My scenario" }).click();
    await expect(page.getByLabel("Your scenario")).toBeVisible();
  });

  test("exercise shell has step progress navigation", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    const progressNav = page.getByRole("navigation", { name: "Exercise progress" });
    await expect(progressNav).toBeVisible();
    await expect(progressNav.getByText("1. Setup")).toBeVisible();
  });
});

test.describe("Systems exercise - generation and canvas", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("generating transitions to decompose phase with scenario text", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await generateExercise(page, "Cloud Architecture");

    await expect(
      page.getByRole("heading", { name: "Cloud Infrastructure Dependencies" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/latency spikes/)).toBeVisible();
    await expect(
      page.getByText(/6 most important components/),
    ).toBeVisible();
  });

  test("canvas renders ReactFlow container with nodes", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await generateExercise(page, "Cloud Architecture");

    await expect(
      page.getByRole("heading", { name: "Cloud Infrastructure Dependencies" }),
    ).toBeVisible({ timeout: 15_000 });

    await advanceSystemsToCanvas(page);

    const reactFlow = page.locator(".react-flow");
    await expect(reactFlow).toBeVisible();
  });

  test("connect mode shows instruction text", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await generateExercise(page, "Cloud Architecture");

    await expect(
      page.getByRole("heading", { name: "Cloud Infrastructure Dependencies" }),
    ).toBeVisible({ timeout: 15_000 });

    await advanceSystemsToCanvas(page);

    await expect(
      page.getByText(/Drag from one node.*Set each edge.*type/),
    ).toBeVisible();
  });
});
