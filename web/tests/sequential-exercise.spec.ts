import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { exerciseSourceCombobox, generateExercise } from "./helpers/exercise-flow";

test.describe("Sequential exercise - setup phase", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders setup card with heading and generate button", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await expect(
      page.getByRole("heading", { name: "Sequential exercise" }),
    ).toBeVisible();
    await expect(page.getByLabel("Domain")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate exercise" }),
    ).toBeVisible();
  });

  test("source selector shows AI-generated and My scenario options", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await exerciseSourceCombobox(page).click();
    await expect(
      page.getByRole("option", { name: "AI-generated from domain" }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "My scenario" }),
    ).toBeVisible();
  });

  test("switching to My scenario shows custom scenario textarea", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await exerciseSourceCombobox(page).click();
    await page.getByRole("option", { name: "My scenario" }).click();
    await expect(page.getByLabel("Your scenario")).toBeVisible();
  });
});

test.describe("Sequential exercise - generation and ordering", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("generating transitions to ordering phase with scenario text", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByRole("heading", { name: "Incident Response Sequence" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(/production outage/),
    ).toBeVisible();
  });

  test("ordering phase shows source pool and timeline zones", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByRole("heading", { name: "Incident Response Sequence" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Source", { exact: true })).toBeVisible();
    await expect(page.getByText("Timeline", { exact: true })).toBeVisible();
  });

  test("ordering phase renders all 5 steps in the source pool", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByRole("heading", { name: "Incident Response Sequence" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/Acknowledge the incident/)).toBeVisible();
    await expect(page.getByText(/Isolate the failing payment/)).toBeVisible();
    await expect(page.getByText(/Analyze error logs/)).toBeVisible();
    await expect(page.getByText(/Deploy hotfix/)).toBeVisible();
    await expect(page.getByText(/Gradually restore traffic/)).toBeVisible();
  });

  test("timeline zone shows drag instruction when empty", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await generateExercise(page, "DevOps");

    await expect(
      page.getByRole("heading", { name: "Incident Response Sequence" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(/Drag steps here in process order/),
    ).toBeVisible();
  });
});
