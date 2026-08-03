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

/** Fills a valid 1-6 ranking (one per node, in render order) and continues to Confidence. */
async function fillCriticalityRankingAndContinue(page: Page): Promise<void> {
  const rankInputs = page.getByRole("spinbutton");
  const count = await rankInputs.count();
  expect(count).toBe(6);
  for (let i = 0; i < count; i++) {
    await rankInputs.nth(i).fill(String(i + 1));
  }
  await page.getByRole("button", { name: "Continue to confidence" }).click();
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
    await expect(page.getByText(/6 most important components/)).toBeVisible();
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
    await page.getByRole("button", { name: "Continue to confidence" }).click();
    await expect(
      page.getByText("Rank all 6 nodes 1-6, using each rank exactly once."),
    ).toBeVisible();
    // Still on the criticality step.
    await expect(page.getByRole("heading", { name: "Criticality ranking" })).toBeVisible();
  });

  test("full flow: criticality -> confidence -> shock -> cascade -> AI reflection -> journal", async ({
    page,
  }) => {
    await generateResilienceExercise(page);
    await advanceResilienceToCriticality(page);
    await fillCriticalityRankingAndContinue(page);

    // Confidence step (shared UI across variants).
    await expect(page.getByRole("heading", { name: "Confidence" })).toBeVisible();
    await page.getByRole("button", { name: "Continue to shock" }).click();

    // Shock step: first shock event, resilience-specific continue label.
    await expect(page.getByRole("heading", { name: "Shock scenario" })).toBeVisible();
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
    await expect(
      page.getByText("Suitable for integration testers validating perspective UI"),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Continue to journal" }).click();

    // Journal step.
    await expect(page.getByRole("heading", { name: "Metacognition journal" })).toBeVisible();
    await expect(
      page.getByText("What emotion might be influencing your thinking right now?"),
    ).toBeVisible();
  });
});
