import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated } from "./helpers/auth-setup";
import { comboboxBelowLabel, fillExerciseDomain } from "./helpers/exercise-flow";

async function stubSteelmanAi(page: import("@playwright/test").Page) {
  await page.route("**/api/ai", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const body = JSON.parse((await route.request().postData()) ?? "{}") as {
      analyticalVariant?: string;
    };
    const isSteelman = body.analyticalVariant === "steelman";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          title: "Remote work reduces long-term productivity",
          passage:
            "Remote work reduces long-term productivity because it erodes spontaneous " +
            "collaboration, weakens mentorship for junior employees, and makes it harder " +
            "to build shared context across teams. Companies that went fully remote have " +
            "seen slower onboarding and more miscommunication in cross-team projects.",
          embeddedIssues: isSteelman
            ? []
            : [
                {
                  description: "Framing bias",
                  type: "framing_bias",
                  severity: "moderate",
                  textSegment: "erodes spontaneous collaboration",
                  explanation: "Overstated causal claim.",
                },
              ],
          validPoints: [],
          isGeopolitics: false,
        },
      }),
    });
  });

  await page.route("**/api/ai/analytical-steelman-rubric", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, overall: 78 }),
    });
  });

  await page.route("**/api/ai/perspective", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        text: "### Suitable for everyone\n\nMock steelman perspective.",
        structured: {
          perspectiveFormat: "clarity_v2",
          title: "Mock exercise",
          suitableFor: "Suitable for integration testers validating the steelman perspective",
          highlightCritiques: [
            {
              id: "hc_1",
              userTextSnippet: "sample steelman text",
              critique: "You argued 'sample steelman text'. This mock flags a gap.",
              remediationAlternative: "A stronger version would address the counterargument directly.",
            },
          ],
          openQuestions: ["What would strengthen this further?"],
        },
      }),
    });
  });

  await page.route("**/api/ai/journal-ref", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, line: null }),
    });
  });
}

function taskTypeCombobox(page: import("@playwright/test").Page) {
  return comboboxBelowLabel(page, "Task type");
}

async function switchToManualEntry(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Type your own" }).click();
}

test.describe("Analytical exercise - steelman variant", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubSteelmanAi(page);
  });

  test("setup shows Task type selector with Steelman option", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await switchToManualEntry(page);
    await expect(taskTypeCombobox(page)).toBeVisible();
    await taskTypeCombobox(page).click();
    await expect(page.getByRole("option", { name: "Steelman a position" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Highlight & tag issues" })).toBeVisible();
  });

  test("selecting Steelman hides the 'Use my own text' source option", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await switchToManualEntry(page);
    await taskTypeCombobox(page).click();
    await page.getByRole("option", { name: "Steelman a position" }).click();
    await comboboxBelowLabel(page, "Source").click();
    await expect(page.getByRole("option", { name: "Use my own text" })).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("full happy path: generate, write steelman, confidence, AI perspective", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/exercise/analytical");
    await switchToManualEntry(page);

    await taskTypeCombobox(page).click();
    await page.getByRole("option", { name: "Steelman a position" }).click();

    const main = page.getByRole("main");
    await fillExerciseDomain(page, "Management");
    await main.getByRole("button", { name: "Generate exercise" }).click();

    await expect(
      page.getByText("Position to steelman (read-only):"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/erodes spontaneous collaboration/)).toBeVisible();

    const textarea = page.getByPlaceholder("Your steelman…");
    await expect(textarea).toBeVisible();
    const continueBtn = page.getByRole("button", { name: "Continue to confidence" });
    await expect(continueBtn).toBeDisabled();

    const steelmanArgument =
      "The strongest case for this position is that distributed teams lose the dense, " +
      "informal information flow that in-person offices provide by default. Mentorship " +
      "in particular suffers because junior employees no longer absorb tacit knowledge " +
      "by simply overhearing senior colleagues work through problems. Even well-run " +
      "remote teams report that cross-functional projects take longer to reach shared " +
      "understanding, and that this drag compounds across a large organization.";
    await textarea.fill(steelmanArgument);
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    await expect(page.getByRole("heading", { name: "Confidence" })).toBeVisible({
      timeout: 10_000,
    });

    const slider = page.getByRole("slider").first();
    await slider.focus();
    await page.keyboard.press("ArrowRight");

    await page.getByRole("button", { name: "Submit and get AI perspective" }).click();

    await expect(page.getByRole("heading", { name: "AI perspective" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(main.getByText(/sample steelman text/).first()).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Exercise progress" }).getByText("4. AI perspective"),
    ).toBeVisible();
  });
});
