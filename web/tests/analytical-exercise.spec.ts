import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import {
  addPassageHighlight,
  exerciseSourceCombobox,
  generateExercise,
} from "./helpers/exercise-flow";

test.describe("Analytical exercise - setup phase", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders setup card with domain input and generate button", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await expect(
      page.getByRole("heading", { name: "Analytical exercise" }),
    ).toBeVisible();
    await expect(page.getByRole("main").getByRole("textbox", { name: "Domain" })).toBeVisible();
    await expect(exerciseSourceCombobox(page)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate exercise" }),
    ).toBeVisible();
  });

  test("source selector shows AI-generated, Use my own text, My scenario", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await exerciseSourceCombobox(page).click();
    await expect(page.getByRole("option", { name: "AI-generated passage" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Use my own text" })).toBeVisible();
    await expect(page.getByRole("option", { name: "My scenario" })).toBeVisible();
  });

  test("switching to My scenario shows custom scenario textarea", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await exerciseSourceCombobox(page).click();
    await page.getByRole("option", { name: "My scenario" }).click();
    await expect(page.getByLabel(/Describe your situation/)).toBeVisible();
  });

  test("switching to Use my own text shows real-data textarea", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await exerciseSourceCombobox(page).click();
    await page.getByRole("option", { name: "Use my own text" }).click();
    await expect(page.getByLabel(/Paste your own content/)).toBeVisible();
  });

  test("exercise shell has step progress navigation", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    const progressNav = page.getByRole("navigation", {
      name: "Exercise progress",
    });
    await expect(progressNav).toBeVisible();
    await expect(progressNav.getByText(/^\d\. /)).toHaveText(["1. Setup", "2. Highlight & tag", "3. AI feedback"]);
  });

  test("has a settings link for personal context", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await expect(page.getByRole("main").getByRole("link", { name: "Settings" })).toBeVisible();
  });
});

test.describe("Analytical exercise - generate and highlight phase", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("generating transitions to highlight phase with passage text", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "Technology");

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/Regional powers/)).toBeVisible();
  });

  test("highlight phase shows tag picker instructions", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "Technology");

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    // "Technology" is a plain passage, so it uses sentence taps; free selection
    // (geopolitics) is covered on the layout fixtures page.
    await expect(page.getByTestId("text-passage")).toBeVisible();
    await expect(page.getByTestId("sentence-mode-hint")).toContainText(
      "Tap a sentence to tag it.",
    );
  });

  test("plain passages: tap a sentence, pick a tag by its question, then change or remove it", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "DevOps");
    await expect(page.getByText("Structural reasoning passage")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sentence-mode-hint")).toBeVisible();

    const second = page.getByTestId("passage-sentence").nth(1);
    await expect(second).toHaveText(/binary choice/);
    await second.click();

    const picker = page.getByTestId("tag-picker-region");
    await expect(picker.getByTestId("pick-tag-prompt")).toHaveText("Pick a tag:");
    // Six plain tags, each with the question behind it, no geopolitics tags.
    await expect(picker.getByRole("button", { name: /Logical Fallacy/ })).toContainText(
      "Does the logic jump?",
    );
    await expect(picker.getByRole("button", { name: /Framing Bias/ })).toHaveCount(0);
    await picker.getByRole("button", { name: /Logical Fallacy/ }).click();

    await expect(second).toHaveAttribute("data-tagged", "true");
    await expect(page.getByTestId("highlight-chip")).toHaveCount(1);
    await expect(page.getByTestId("highlight-chip")).toContainText("Logical Fallacy");

    // Tap the tagged sentence again to change its tag.
    await second.click();
    await expect(picker.getByTestId("pick-tag-prompt")).toHaveText("Change the tag:");
    await expect(picker.getByRole("button", { name: /Logical Fallacy/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await picker.getByRole("button", { name: /Hidden Assumption/ }).click();
    await expect(page.getByTestId("highlight-chip")).toHaveCount(1);
    await expect(page.getByTestId("highlight-chip")).toContainText("Hidden Assumption");

    // And once more to remove it.
    await second.click();
    await picker.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByTestId("highlight-chip")).toHaveCount(0);
    await expect(second).not.toHaveAttribute("data-tagged", "true");
  });

  test("guided level: main claim, then each suggested sentence, then feedback", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "DevOps", { level: "Guided" });
    await expect(page.getByText("Structural reasoning passage")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Part 1 of 2 · Main claim")).toBeVisible();

    await page.getByRole("radio", { name: /wrongly reduce the dispute/ }).click();
    await expect(page.getByTestId("main-claim-feedback")).toContainText("Right.");
    await page.getByRole("button", { name: "Next: check the sentences" }).click();

    await expect(page.getByText("Part 2 of 2 · Check each sentence")).toBeVisible();
    const walk = page.getByTestId("guided-walkthrough");
    await expect(walk).toContainText("This passage has 1 issues");
    await expect(walk.getByTestId("check-questions")).toBeVisible();
    // Confidence and feedback wait until every suggested sentence is answered.
    await expect(page.getByRole("button", { name: "Get AI feedback" })).toHaveCount(0);

    const count = await walk.getByTestId("guided-sentence").count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const current = walk.getByTestId("guided-current");
      if ((await current.textContent())?.includes("binary choice")) {
        await current.getByRole("button", { name: "Has a problem" }).click();
        await current.getByRole("button", { name: /Logical Fallacy/ }).click();
      } else {
        await current.getByRole("button", { name: "Looks fine" }).click();
      }
    }
    await expect(walk.getByTestId("guided-done")).toContainText("You marked 1 as having a problem.");

    await page.getByRole("button", { name: "Get AI feedback" }).click();
    const key = page.getByTestId("analytical-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("Found, different tag")).toBeVisible();
  });

  test("standard level hides the walkthrough and shows the issue count", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "DevOps", { level: "Standard" });
    await expect(page.getByTestId("issue-count-hint")).toContainText("This passage has 1 issues");
    await expect(page.getByTestId("guided-walkthrough")).toHaveCount(0);
    await expect(page.getByTestId("check-questions")).toBeVisible();
  });

  test("highlight with confidence -> AI feedback -> takeaway -> saved", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    // DevOps avoids geopolitics-only perspective step ("Technology" matches geo keywords).
    await generateExercise(page, "DevOps");

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    await addPassageHighlight(page);
    // Confidence is part of the highlight step now.
    await expect(page.getByRole("slider")).toBeVisible();
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    await expect(page.getByLabel(/What will you take away/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("AI feedback shows the answer key with coaching for each case", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "DevOps");
    await expect(page.getByText("Structural reasoning passage")).toBeVisible({ timeout: 15_000 });

    await addPassageHighlight(page);
    await page.getByRole("button", { name: "Get AI feedback" }).click();

    const key = page.getByTestId("analytical-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("Issues found")).toBeVisible();
    await expect(key.getByText('"binary choice"', { exact: false }).first()).toBeVisible();
    await expect(key.getByText("Mock why: the passage offers only two options.")).toBeVisible();
    await expect(key.getByText("More specific: False dilemma", { exact: false })).toBeVisible();
    await expect(key.getByTestId("answer-key-takeaways")).toContainText("Mock takeaway");
    // v3 feedback replaces the old "Stronger alternative" card.
    await expect(page.getByText("Stronger alternative")).toHaveCount(0);
  });

  test("Go deeper asks the AI once, then shows and hides the saved analysis", async ({ page }) => {
    let calls = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/ai/deep-dive")) calls += 1;
    });
    await gotoAuthenticated(page, "/exercise/analytical");
    await generateExercise(page, "DevOps");
    await expect(page.getByText("Structural reasoning passage")).toBeVisible({ timeout: 15_000 });
    await addPassageHighlight(page);
    await page.getByRole("button", { name: "Get AI feedback" }).click();

    const key = page.getByTestId("analytical-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    const panel = key.getByTestId("deep-dive").first();
    await panel.getByRole("button", { name: "Go deeper" }).click();
    const body = panel.getByTestId("deep-dive-body");
    await expect(body).toBeVisible();
    await expect(body.getByText("The core problem")).toBeVisible();
    await expect(body.getByText("Mock core: it hides the middle options.")).toBeVisible();
    await expect(body.getByText("Non sequitur (kết luận không tất suy)")).toBeVisible();
    await expect(body.getByText("Same problem, another name.", { exact: false })).toBeVisible();
    await expect(body.getByText("A fairer way to say it")).toBeVisible();

    await panel.getByRole("button", { name: "Hide" }).click();
    await expect(body).toHaveCount(0);
    await panel.getByRole("button", { name: "Go deeper" }).click();
    await expect(panel.getByTestId("deep-dive-body")).toBeVisible();
    expect(calls).toBe(1);
  });
});

test.describe("Analytical exercise - domain input", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("domain input accepts text and is used in generation", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    const domainInput = page.getByRole("main").getByRole("textbox", { name: "Domain" });
    await domainInput.fill("Geopolitics");
    await expect(domainInput).toHaveValue("Geopolitics");
  });
});
