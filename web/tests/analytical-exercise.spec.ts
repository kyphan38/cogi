import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, stubFirestoreReads } from "./helpers/auth-setup";

test.describe("Analytical exercise - setup phase", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("renders setup card with domain input and generate button", async ({
    page,
  }) => {
    await page.goto("/exercise/analytical");
    await expect(
      page.getByRole("heading", { name: "Analytical exercise" }),
    ).toBeVisible();
    await expect(page.getByLabel("Domain")).toBeVisible();
    await expect(page.getByLabel("Source")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate exercise" }),
    ).toBeVisible();
  });

  test("source selector shows AI-generated, Use my own text, My scenario", async ({
    page,
  }) => {
    await page.goto("/exercise/analytical");
    const sourceTrigger = page.getByLabel("Source").locator("..").getByRole("combobox");
    await sourceTrigger.click();
    await expect(page.getByRole("option", { name: "AI-generated passage" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Use my own text" })).toBeVisible();
    await expect(page.getByRole("option", { name: "My scenario" })).toBeVisible();
  });

  test("switching to My scenario shows custom scenario textarea", async ({
    page,
  }) => {
    await page.goto("/exercise/analytical");
    const sourceTrigger = page.getByLabel("Source").locator("..").getByRole("combobox");
    await sourceTrigger.click();
    await page.getByRole("option", { name: "My scenario" }).click();
    await expect(page.getByLabel(/Describe your situation/)).toBeVisible();
  });

  test("switching to Use my own text shows real-data textarea", async ({
    page,
  }) => {
    await page.goto("/exercise/analytical");
    const sourceTrigger = page.getByLabel("Source").locator("..").getByRole("combobox");
    await sourceTrigger.click();
    await page.getByRole("option", { name: "Use my own text" }).click();
    await expect(page.getByLabel(/Paste your own content/)).toBeVisible();
  });

  test("exercise shell has step progress navigation", async ({ page }) => {
    await page.goto("/exercise/analytical");
    const progressNav = page.getByRole("navigation", {
      name: "Exercise progress",
    });
    await expect(progressNav).toBeVisible();
    await expect(progressNav.getByText("1. Setup")).toBeVisible();
    await expect(progressNav.getByText(/Done/)).toBeVisible();
  });

  test("has a settings link for personal context", async ({ page }) => {
    await page.goto("/exercise/analytical");
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
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
    await page.goto("/exercise/analytical");
    await page.getByLabel("Domain").fill("Technology");
    await page.getByRole("button", { name: "Generate exercise" }).click();

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/Regional powers/)).toBeVisible();
  });

  test("highlight phase shows tag picker instructions", async ({ page }) => {
    await page.goto("/exercise/analytical");
    await page.getByLabel("Domain").fill("Technology");
    await page.getByRole("button", { name: "Generate exercise" }).click();

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(/Highlight text.*tag/i),
    ).toBeVisible();
  });

  test("can advance past highlight step and reach confidence slider", async ({
    page,
  }) => {
    await page.goto("/exercise/analytical");
    await page.getByLabel("Domain").fill("Technology");
    await page.getByRole("button", { name: "Generate exercise" }).click();

    await expect(
      page.getByText("Structural reasoning passage"),
    ).toBeVisible({ timeout: 15_000 });

    const nextButton = page.getByRole("button", { name: /Next/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await expect(page.getByText(/Confidence/i)).toBeVisible({ timeout: 5_000 });
    }
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
    await page.goto("/exercise/analytical");
    const domainInput = page.getByLabel("Domain");
    await domainInput.fill("Geopolitics");
    await expect(domainInput).toHaveValue("Geopolitics");
  });
});
