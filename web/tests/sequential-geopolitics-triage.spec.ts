import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { generateExercise, selectSequentialTaskType } from "./helpers/exercise-flow";

test.describe("Sequential exercise - task type setup", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("task type selector offers auto, geopolitical, and crisis triage", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await page.getByText("Task type", { exact: true }).locator("..").getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "Auto" })).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Geopolitical (dual actor)" }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Crisis triage" })).toBeVisible();
  });
});

test.describe("Sequential exercise - geopolitics dual-actor variant", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("generating with geopolitics task type shows scenario and both actors", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await selectSequentialTaskType(page, "Geopolitical (dual actor)");
    await generateExercise(page, "Border Dispute");

    await expect(
      page.getByRole("heading", { name: "Ceasefire Negotiation Sequence" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/negotiating a ceasefire/)).toBeVisible();
    await expect(page.getByText(/Northland's perspective/)).toBeVisible();
    await expect(page.getByText(/Reinforce forward defensive positions/)).toBeVisible();
  });

  test("shows Continue existing exercise button after clicking Back from Actor A ordering", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await selectSequentialTaskType(page, "Geopolitical (dual actor)");
    await generateExercise(page, "Border Dispute");

    await expect(
      page.getByRole("heading", { name: "Ceasefire Negotiation Sequence" }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Continue existing exercise" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Continue existing exercise" }).click();
    await expect(
      page.getByRole("heading", { name: "Ceasefire Negotiation Sequence" }),
    ).toBeVisible();
  });

  test("ordering phase advances to Actor B step label", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await selectSequentialTaskType(page, "Geopolitical (dual actor)");
    await generateExercise(page, "Border Dispute");

    await expect(
      page.getByRole("heading", { name: "Ceasefire Negotiation Sequence" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByRole("button", { name: "Continue to Actor B ordering" }),
    ).toBeVisible();
  });
});

test.describe("Sequential exercise - crisis triage variant", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("generating with triage task type shows scenario, severity badges, and countdown", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await selectSequentialTaskType(page, "Crisis triage");
    await generateExercise(page, "Incident Response");

    await expect(
      page.getByRole("heading", { name: "Payment Outage Triage" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/flash sale/)).toBeVisible();
    await expect(page.getByText(/Time remaining/)).toBeVisible();
    await expect(page.getByText("Budget: 15 minutes")).toBeVisible();
    await expect(page.getByText("critical").first()).toBeVisible();
    await expect(page.getByText("minor").first()).toBeVisible();
  });

  test("shows Continue existing exercise button after clicking Back from the triage order step", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/sequential");
    await selectSequentialTaskType(page, "Crisis triage");
    await generateExercise(page, "Incident Response");

    await expect(
      page.getByRole("heading", { name: "Payment Outage Triage" }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Continue existing exercise" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Continue existing exercise" }).click();
    await expect(
      page.getByRole("heading", { name: "Payment Outage Triage" }),
    ).toBeVisible();
  });
});
