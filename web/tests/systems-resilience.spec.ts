import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import {
  addSystemsConnection,
  advanceSystemsToCanvas,
  generateExercise,
  selectSystemsTaskType,
} from "./helpers/exercise-flow";

async function generateResilienceExercise(page: Page): Promise<void> {
  await gotoAuthenticated(page, "/exercise/systems");
  await selectSystemsTaskType(page, "Resilience audit");
  await generateExercise(page, "Power Grid");
  await expect(
    page.getByRole("heading", { name: "Regional Power Grid Resilience" }),
  ).toBeVisible({ timeout: 15_000 });
}

/** Decompose -> connect (one edge) -> lands on the Criticality ranking step. */
async function advanceResilienceToCriticality(page: Page): Promise<void> {
  await advanceSystemsToCanvas(page);
  await addSystemsConnection(page);
  await page.getByRole("button", { name: "Done connecting" }).click();
  await expect(page.getByRole("heading", { name: "Criticality ranking" })).toBeVisible();
}

/** Fills a valid 1-6 ranking (one per node, in render order) and continues to the shock step. */
async function fillCriticalityRankingAndContinue(page: Page): Promise<void> {
  const rankInputs = page.getByRole("spinbutton");
  const count = await rankInputs.count();
  expect(count).toBe(6);
  for (let i = 0; i < count; i++) {
    await rankInputs.nth(i).fill(String(i + 1));
  }
  await page.getByRole("button", { name: "Continue to shock" }).click();
}

test.describe("Systems exercise - resilience task type setup", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("task type selector offers auto, geopolitical, and resilience audit", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/systems");
    await page.getByText("Task type", { exact: true }).locator("..").getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "Auto" })).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Geopolitical (dual perspective)" }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Resilience audit" })).toBeVisible();
  });
});

test.describe("Systems exercise - resilience variant flow", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("generating with resilience task type shows scenario and node decompose prompt", async ({
    page,
  }) => {
    await generateResilienceExercise(page);
    await expect(page.getByText(/single points of failure/)).toBeVisible();
    await expect(page.getByText(/pick the 6 components or factors/)).toBeVisible();
  });

  test("criticality step renders read-only canvas and a 1-6 ranking input per node", async ({
    page,
  }) => {
    await generateResilienceExercise(page);
    await advanceResilienceToCriticality(page);

    await expect(page.getByText("Substation").first()).toBeVisible();
    await expect(page.getByText("Load Balancer").first()).toBeVisible();
    await expect(page.getByRole("spinbutton")).toHaveCount(6);
  });

  test("criticality step rejects incomplete or duplicate rankings", async ({ page }) => {
    await generateResilienceExercise(page);
    await advanceResilienceToCriticality(page);

    const rankInputs = page.getByRole("spinbutton");
    // Give every node the same rank (invalid: not unique / not a 1-6 permutation).
    for (let i = 0; i < 6; i++) {
      await rankInputs.nth(i).fill("1");
    }
    await page.getByRole("button", { name: "Continue to shock" }).click();
    await expect(
      page.getByText("Rank all 6 nodes 1-6, using each rank exactly once."),
    ).toBeVisible();
    // Still on the criticality step.
    await expect(page.getByRole("heading", { name: "Criticality ranking" })).toBeVisible();
  });

  test("full flow: criticality -> shock with confidence -> cascade -> AI feedback -> saved", async ({
    page,
  }) => {
    await generateResilienceExercise(page);
    await advanceResilienceToCriticality(page);
    await fillCriticalityRankingAndContinue(page);

    // Shock step (confidence now lives here): first shock event, resilience-specific label.
    await expect(page.getByRole("heading", { name: "Shock scenario" })).toBeVisible();
    await expect(page.getByText("How confident are you in your dependency map?")).toBeVisible();
    await expect(page.getByText(/^Part 4 of 5 · Shock$/)).toBeVisible();
    await expect(
      page.getByText("A lightning strike takes the substation offline during peak demand"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue to cascade" }).click();

    // Cascade step: second shock event + criticality comparison list.
    await expect(page.getByRole("heading", { name: "Cascade" })).toBeVisible();
    await expect(
      page.getByText(
        "With the transformer bank already degraded, a second cold front spikes demand",
      ),
    ).toBeVisible();
    await expect(page.getByText("Criticality ranking: you vs. the model")).toBeVisible();
    // node_1 was ranked 1 by both the user (first spinbutton) and the ground truth.
    await expect(page.getByText(/your rank: 1, model rank: 1/)).toBeVisible();
    await expect(
      page.getByText("Every downstream node depends on this substation."),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Submit impact and get AI reflection" })
      .click();

    // AI reflection (perspective) step.
    const key = page.getByTestId("systems-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("Links found")).toBeVisible();
    await expect(key.getByTestId("answer-key-takeaways")).toContainText("Mock systems takeaway");
    const progress = page.getByRole("navigation", { name: "Exercise progress" });
    await expect(progress.getByText("3. AI feedback")).toHaveClass(/bg-zinc-900/);
    await expect(page.getByRole("heading", { name: "Metacognition journal" })).toHaveCount(0);

    await page.getByLabel(/What will you take away/).fill("The substation is the single point of failure.");
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});
