import { expect, type Page } from "@playwright/test";
import { selectTextInPassage } from "./layout-metrics";

/** Combobox under a visible field label (labels omit htmlFor, so getByLabel misses the trigger). */
export function comboboxBelowLabel(page: Page, label: string) {
  return page
    .getByRole("main")
    .getByText(label, { exact: true })
    .locator("..")
    .getByRole("combobox");
}

export function exerciseSourceCombobox(page: Page) {
  return comboboxBelowLabel(page, "Source");
}

export function exercisePresetCombobox(page: Page) {
  return comboboxBelowLabel(page, "Preset");
}

export async function fillExerciseDomain(page: Page, domain: string) {
  const input = page.getByRole("main").getByRole("textbox", { name: "Domain" });
  await input.click();
  await input.fill(domain);
  await input.dispatchEvent("input");
  await input.dispatchEvent("change");
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue(domain);
}

export async function selectComboPreset(page: Page, name: RegExp | string) {
  await page.keyboard.press("Escape");
  await exercisePresetCombobox(page).click();
  await page.getByRole("option", { name }).click();
}

/** Stage passage text and apply the first tag so highlight step can advance. */
export async function addPassageHighlight(page: Page): Promise<void> {
  await selectTextInPassage(page);
  const picker = page.getByTestId("tag-picker-region");
  await expect(picker).toBeVisible({ timeout: 5_000 });
  await picker.getByRole("button").first().click();
}

export async function generateExercise(page: Page, domain: string): Promise<void> {
  const main = page.getByRole("main");
  const generateBtn = main.getByRole("button", { name: "Generate exercise" });
  await generateBtn.waitFor({ state: "visible", timeout: 30_000 });

  for (let attempt = 0; attempt < 3; attempt++) {
    await fillExerciseDomain(page, domain);
    await generateBtn.click();

    if (await main.getByText("Enter a domain.").isVisible()) {
      if (attempt === 2) {
        throw new Error(`generateExercise: domain "${domain}" was not applied`);
      }
      continue;
    }

    // Setup card leaves the tree once generation starts (button shows "Generating…" then unmounts).
    await expect(generateBtn).toBeHidden({ timeout: 20_000 });
    return;
  }
}

export async function advanceEvaluativeToMatrix(page: Page): Promise<void> {
  const nameInputs = page.getByPlaceholder(/Criterion \d name/);
  await nameInputs.nth(0).fill("Team expertise");
  await nameInputs.nth(1).fill("Time to market");
  await page
    .getByPlaceholder("Why it matters (1 sentence)")
    .nth(0)
    .fill("Existing skills reduce onboarding risk.");
  await page
    .getByPlaceholder("Why it matters (1 sentence)")
    .nth(1)
    .fill("MVP deadline is fixed at six months.");
  await page.getByRole("button", { name: "Compare and continue" }).click();
  await page.getByRole("button", { name: "Continue to evaluate" }).click();
}

export async function advanceSystemsToCanvas(page: Page): Promise<void> {
  const components = [
    "API Gateway",
    "Auth Service",
    "Data Store",
    "Cache Layer",
    "Message Queue",
    "CDN",
  ];
  const inputs = page.getByPlaceholder(/Component \d/);
  for (let i = 0; i < components.length; i++) {
    await inputs.nth(i).fill(components[i]!);
  }
  await page.getByRole("button", { name: "Compare and continue" }).click();
  await page.getByRole("button", { name: "Continue to connect" }).click();
  await expect(page.locator(".react-flow")).toBeVisible({ timeout: 10_000 });
}
