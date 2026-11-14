import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";

test.describe("New exercise on one screen (PLAN-refine R6)", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("a first visit loads topics once; 5 show, the rest under more; a row opens its setup", async ({ page }) => {
    let calls = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/ai/topic-ideas")) calls += 1;
    });
    await gotoAuthenticated(page, "/reasoning");
    const rows = page.getByTestId("topic-list").getByTestId("topic-row");
    await expect(rows).toHaveCount(5);
    expect(calls).toBe(1);
    await expect(rows.first()).toContainText("Mock topic 1.1");
    await expect(rows.first()).toContainText("Life situations");
    await page.getByTestId("topic-more").click();
    await expect(rows).toHaveCount(10);

    // A new set avoids the topics on screen.
    const request = page.waitForRequest((r) => r.url().endsWith("/api/ai/topic-ideas"));
    await page.getByTestId("topic-generate").click();
    const body = (await request).postDataJSON() as { exclude: string[]; mode: string };
    expect(body.mode).toBe("all");
    expect(body.exclude).toContain("Mock topic 1.1 about a real situation");
    await expect(rows.first()).toContainText("Mock topic 2.1");

    await rows.first().click();
    await page.waitForURL(/\/exercise\/judgment\?domain=Mock%20topic%202\.1/, { timeout: 15_000 });
  });

  test("own text: Start asks the AI for a mode and opens it with the text", async ({ page }) => {
    await gotoAuthenticated(page, "/reasoning");
    await expect(page.getByTestId("own-start")).toBeDisabled();
    const text = "My manager criticised my report in front of the whole team, and I could not stop thinking about it all week.";
    await page.getByLabel("What do you want to think about?").fill(text);
    const request = page.waitForRequest((r) => r.url().endsWith("/api/ai/recommend-mode"));
    await page.getByTestId("own-start").click();
    expect(((await request).postDataJSON() as { topic: string }).topic).toBe(text);
    // The mock ranks reframe first.
    await page.waitForURL(/\/exercise\/reframe\?source=custom_scenario/, { timeout: 15_000 });
  });

  test("change: a chosen mode skips the AI; Evaluative gets the text in its scenario box", async ({ page }) => {
    let recommend = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/ai/recommend-mode")) recommend += 1;
    });
    await gotoAuthenticated(page, "/reasoning");
    await page.getByTestId("options-toggle").click();
    await page.getByRole("radiogroup", { name: "Exercise mode" }).getByRole("radio", { name: "Evaluative" }).click();
    await expect(page.getByText("Mode: Evaluative")).toBeVisible();
    const text = "We must choose between two suppliers: one is cheaper, the other is faster and more reliable for us.";
    await page.getByLabel("What do you want to think about?").fill(text);
    await page.getByTestId("own-start").click();
    await page.waitForURL(/\/exercise\/evaluative\?source=custom_scenario/, { timeout: 15_000 });
    await expect(page.locator("#ev-custom-scenario")).toHaveValue(text);
    expect(recommend).toBe(0);
  });

  test("change: mode, area and domain shape the topics; Calibration lists its bank without AI", async ({ page }) => {
    await gotoAuthenticated(page, "/reasoning");
    await expect(page.getByTestId("topic-list").getByTestId("topic-row")).toHaveCount(5);
    await page.getByTestId("options-toggle").click();
    const modes = page.getByRole("radiogroup", { name: "Exercise mode" });
    await modes.getByRole("radio", { name: "Reframe" }).click();
    await expect(page.getByTestId("topic-domain")).toBeDisabled();
    await page.getByTestId("topic-group").selectOption("relationships-family");
    await page.getByTestId("topic-domain").selectOption({ index: 1 });
    const request = page.waitForRequest((r) => r.url().endsWith("/api/ai/topic-ideas"));
    await page.getByTestId("topic-generate").click();
    const body = (await request).postDataJSON() as { mode: string; groupId: string; domain: string };
    expect(body).toMatchObject({ mode: "reframe", groupId: "relationships-family" });
    expect(body.domain).toBeTruthy();

    // A mode that does not fit the chosen area clears the area.
    await modes.getByRole("radio", { name: "Systems" }).click();
    await expect(page.getByTestId("topic-group")).toHaveValue("");

    // Strategic situations has no own-text start: Start is off, topics still work.
    await modes.getByRole("radio", { name: "Strategic situations" }).click();
    await page.getByLabel("What do you want to think about?").fill("A price war between two coffee shops on one street.");
    await expect(page.getByTestId("own-start")).toBeDisabled();
    await expect(page.getByText("Strategic situations starts from a topic below.")).toBeVisible();

    await modes.getByRole("radio", { name: "Calibration" }).click();
    await expect(page.getByTestId("topic-generate")).toHaveCount(0);
    await expect(page.getByTestId("topic-row")).toHaveCount(5);
    await page.getByTestId("topic-row").filter({ hasText: "Geography" }).click();
    await page.waitForURL(/\/exercise\/calibration\?domain=Geography/, { timeout: 15_000 });
  });
});

test.describe("Coming back to New exercise", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("Back keeps the topics, the text and the mode; a saved topic stays and opens its exercise", async ({ page }) => {
    await gotoAuthenticated(page, "/reasoning");
    const list = page.getByTestId("topic-list").getByTestId("topic-row");
    await expect(list).toHaveCount(5);
    await page.getByLabel("What do you want to think about?").fill("Should we move to a cheaper flat?");

    await page.getByTestId("topic-list").getByTestId("topic-save").nth(1).click();
    const saved = page.getByTestId("saved-topic-list").getByTestId("topic-row");
    await expect(saved).toHaveCount(1);
    await expect(saved.first()).toContainText("Mock topic 1.2");

    let calls = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/ai/topic-ideas")) calls += 1;
    });
    await list.first().click();
    await page.waitForURL(/\/exercise\/judgment\?domain=/, { timeout: 15_000 });
    await page.goBack();
    await expect(list).toHaveCount(5);
    await expect(list.first()).toContainText("Mock topic 1.1");
    await expect(page.getByLabel("What do you want to think about?")).toHaveValue("Should we move to a cheaper flat?");
    await expect(saved).toHaveCount(1);
    expect(calls).toBe(0);

    await saved.first().click();
    await page.waitForURL(/\/exercise\/evaluative\?domain=Mock%20topic%201\.2/, { timeout: 15_000 });

    // Unsaving removes it.
    await page.goBack();
    await page.getByTestId("saved-topic-list").getByTestId("topic-save").first().click();
    await expect(page.getByTestId("saved-topics")).toHaveCount(0);
  });
});

test.describe("Scenario hand-off into the exercise setup", () => {
  test("Analytical reads a long text as the text to analyse", async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
    await gotoAuthenticated(page, "/reasoning");
    const long = Array.from({ length: 130 }, (_, i) => `word${i}`).join(" ");
    await page.evaluate((t) => sessionStorage.setItem("cogi:home-source-text", JSON.stringify({ source: "real_data", realDataText: t })), long);
    await page.goto("/exercise/analytical?source=real_data");
    await expect(page.locator("#real-text")).toHaveValue(long, { timeout: 15_000 });
  });
});

test.describe("New exercise on a phone", () => {
  test("the page fits a 390px screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
    await gotoAuthenticated(page, "/reasoning");
    await expect(page.getByTestId("topic-row")).toHaveCount(5);
    await page.getByTestId("options-toggle").click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
