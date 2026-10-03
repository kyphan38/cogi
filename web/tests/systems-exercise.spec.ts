import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import {
  addSystemsConnection,
  advanceSystemsToCanvas,
  choosePracticeLevel,
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
      page.getByText(/pick the 6 components or factors/),
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

test.describe("Systems exercise - levels", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("guided shows the link count, link types and the impact hint; task type is hidden", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await choosePracticeLevel(page, "Guided");
    await expect(page.getByText("Task type", { exact: true })).toHaveCount(0);
    await generateExercise(page, "Cloud Architecture", { level: "Guided" });
    await advanceSystemsToCanvas(page);
    await expect(page.getByTestId("link-count-hint")).toContainText("The model draws");
    await expect(page.getByTestId("link-type-guide")).toContainText("A depends on B");
    await addSystemsConnection(page);
    await page.getByRole("button", { name: "Done connecting" }).click();
    await expect(page.getByTestId("impact-count-hint")).toContainText("directly and");
  });

  test("expert hides the hints and offers every task type", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await choosePracticeLevel(page, "Expert");
    await expect(page.getByText("Task type", { exact: true })).toBeVisible();
    await generateExercise(page, "Cloud Architecture");
    await advanceSystemsToCanvas(page);
    await expect(page.getByTestId("link-count-hint")).toHaveCount(0);
    await expect(page.getByTestId("link-type-guide")).toHaveCount(0);
  });
});

test.describe("Systems exercise - how the shock spreads", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("an indirect node asks which node the shock comes through, and the results show it", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await generateExercise(page, "Cloud Architecture");
    await advanceSystemsToCanvas(page);
    await addSystemsConnection(page);
    await page.getByRole("button", { name: "Done connecting" }).click();

    const nodes = page.locator(".react-flow__node");
    await expect(page.getByTestId("spread-questions")).toHaveCount(0);
    await nodes.nth(0).click(); // none -> direct
    await nodes.nth(1).click(); // none -> direct
    await nodes.nth(1).click(); // direct -> indirect
    const q = page.getByTestId("spread-question");
    await expect(q).toHaveCount(1);
    const choice = q.getByRole("button").first();
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Submit impact and get AI reflection" }).click();
    const key = page.getByTestId("systems-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("How the shock spreads")).toBeVisible();
  });
});
