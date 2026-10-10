import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";

test.describe("New exercise: A topic (PLAN-topic-ideas.md T2)", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("no AI call until Generate; 10 topics with a mode each; a row opens the setup with the topic", async ({ page }) => {
    let calls = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/ai/topic-ideas")) calls += 1;
    });
    await gotoAuthenticated(page, "/reasoning");
    await expect(page.getByRole("button", { name: "Find best mode" })).toHaveCount(0);
    await expect(page.getByTestId("topic-list")).toHaveCount(0);
    expect(calls).toBe(0);

    await page.getByTestId("topic-generate").click();
    const rows = page.getByTestId("topic-row");
    await expect(rows).toHaveCount(10);
    await expect(rows.first()).toContainText("Mock topic 1.1");
    await expect(rows.first()).toContainText("Life situations");

    // Generate again: a new list, avoiding the topics on screen.
    const request = page.waitForRequest((r) => r.url().endsWith("/api/ai/topic-ideas"));
    await page.getByTestId("topic-generate").click();
    const body = (await request).postDataJSON() as { exclude: string[]; mode: string };
    expect(body.mode).toBe("all");
    expect(body.exclude).toContain("Mock topic 1.1 about a real situation");
    await expect(rows.first()).toContainText("Mock topic 2.1");

    await rows.first().click();
    await page.waitForURL(/\/exercise\/judgment\?domain=Mock%20topic%202\.1/, { timeout: 15_000 });
  });

  test("filters: area, domain and mode go to the AI; Calibration lists its bank without AI", async ({ page }) => {
    await gotoAuthenticated(page, "/reasoning");
    await expect(page.getByTestId("topic-domain")).toBeDisabled();
    await page.getByTestId("topic-group").selectOption("relationships-family");
    await page.getByTestId("topic-domain").selectOption({ index: 1 });
    await page.getByTestId("topic-mode").selectOption("reframe");
    const request = page.waitForRequest((r) => r.url().endsWith("/api/ai/topic-ideas"));
    await page.getByTestId("topic-generate").click();
    const body = (await request).postDataJSON() as { mode: string; groupId: string; domain: string };
    expect(body).toMatchObject({ mode: "reframe", groupId: "relationships-family" });
    expect(body.domain).toBeTruthy();
    await expect(page.getByTestId("topic-row").first()).toContainText("Reframe");

    // A mode that does not fit the chosen area clears the area.
    await page.getByTestId("topic-mode").selectOption("systems");
    await expect(page.getByTestId("topic-group")).toHaveValue("");

    await page.getByTestId("topic-mode").selectOption("calibration");
    await expect(page.getByTestId("topic-generate")).toHaveCount(0);
    await expect(page.getByTestId("topic-row")).toHaveCount(5);
    await page.getByTestId("topic-row").filter({ hasText: "Geography" }).click();
    await page.waitForURL(/\/exercise\/calibration\?domain=Geography/, { timeout: 15_000 });
  });

  test("specific scenario: suggest modes, then the text reaches the exercise", async ({ page }) => {
    await gotoAuthenticated(page, "/reasoning");
    await page.getByRole("radio", { name: "Specific scenario" }).click();
    await expect(page.getByTestId("scenario-suggest")).toBeDisabled();
    const text = "My manager criticised my report in front of the whole team, and I could not stop thinking about it all week.";
    await page.getByTestId("topic-scenario").fill(text);
    await page.getByTestId("scenario-suggest").click();
    const modes = page.getByTestId("scenario-modes").getByRole("button");
    // The mock ranks reframe, judgment, evaluative, analytical: the top 3 that take a scenario.
    await expect(modes).toHaveCount(3);
    await expect(modes.first()).toContainText("Reframe");
    await modes.nth(1).click();
    await page.waitForURL(/\/exercise\/judgment\?source=custom_scenario/, { timeout: 15_000 });
    await expect(page.getByLabel("My situation")).toHaveValue(text);
  });
});

test.describe("Coming back to New exercise", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("Back keeps the 10 topics; a saved topic stays and opens its exercise", async ({ page }) => {
    await gotoAuthenticated(page, "/reasoning");
    await page.getByTestId("topic-generate").click();
    const list = page.getByTestId("topic-list").getByTestId("topic-row");
    await expect(list).toHaveCount(10);

    await page.getByTestId("topic-list").getByTestId("topic-save").nth(1).click();
    const saved = page.getByTestId("saved-topic-list").getByTestId("topic-row");
    await expect(saved).toHaveCount(1);
    await expect(saved.first()).toContainText("Mock topic 1.2");

    await list.first().click();
    await page.waitForURL(/\/exercise\/judgment\?domain=/, { timeout: 15_000 });
    await page.goBack();
    await expect(list).toHaveCount(10);
    await expect(list.first()).toContainText("Mock topic 1.1");
    await expect(saved).toHaveCount(1);

    // Clearing the list keeps the saved topic; it opens like any other row.
    await page.getByTestId("topic-clear").click();
    await expect(list).toHaveCount(0);
    await expect(saved).toHaveCount(1);
    await saved.first().click();
    await page.waitForURL(/\/exercise\/evaluative\?domain=Mock%20topic%201\.2/, { timeout: 15_000 });

    // Unsaving removes it.
    await page.goBack();
    await page.getByTestId("saved-topic-list").getByTestId("topic-save").first().click();
    await expect(page.getByTestId("saved-topics")).toHaveCount(0);
  });

  test("A mode: Back returns to the picked mode and its topics", async ({ page }) => {
    await gotoAuthenticated(page, "/reasoning");
    await page.getByRole("radio", { name: "A mode" }).click();
    await page.getByRole("radio", { name: /Life situations/ }).click();
    await page.getByTestId("mode-panel").getByTestId("topic-generate").click();
    const list = page.getByTestId("mode-panel").getByTestId("topic-list").getByTestId("topic-row");
    await expect(list).toHaveCount(10);
    await list.first().click();
    await page.waitForURL(/\/exercise\/judgment\?domain=/, { timeout: 15_000 });
    await page.goBack();
    await expect(page.getByRole("radio", { name: /Life situations/ })).toHaveAttribute("aria-checked", "true");
    await expect(list).toHaveCount(10);
  });
});

test.describe("Scenario hand-off into the exercise setup", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("Evaluative gets the short scenario in its scenario box, without generating", async ({ page }) => {
    await gotoAuthenticated(page, "/reasoning");
    await page.getByRole("radio", { name: "Specific scenario" }).click();
    const text = "We must choose between two suppliers: one is cheaper, the other is faster and more reliable for us.";
    await page.getByTestId("topic-scenario").fill(text);
    await page.getByTestId("scenario-suggest").click();
    await page.getByTestId("scenario-modes").getByRole("button", { name: /Evaluative/ }).click();
    await page.waitForURL(/\/exercise\/evaluative\?source=custom_scenario/, { timeout: 15_000 });
    await expect(page.locator("#ev-custom-scenario")).toHaveValue(text);
    await expect(page.getByRole("button", { name: /Generate/ }).first()).toBeVisible();
  });

  test("Analytical reads a long text as the text to analyse", async ({ page }) => {
    await gotoAuthenticated(page, "/reasoning");
    const long = Array.from({ length: 130 }, (_, i) => `word${i}`).join(" ");
    await page.evaluate((t) => sessionStorage.setItem("cogi:home-source-text", JSON.stringify({ source: "real_data", realDataText: t })), long);
    await page.goto("/exercise/analytical?source=real_data");
    await expect(page.locator("#real-text")).toHaveValue(long, { timeout: 15_000 });
  });
});

test.describe("New exercise on a phone", () => {
  test("the topic list fits a 390px screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
    await gotoAuthenticated(page, "/reasoning");
    await page.getByTestId("topic-generate").click();
    await expect(page.getByTestId("topic-row")).toHaveCount(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
