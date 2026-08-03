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
    .getByPlaceholder("Why it matters (up to ~500 words)")
    .nth(0)
    .fill("Existing skills reduce onboarding risk.");
  await page
    .getByPlaceholder("Why it matters (up to ~500 words)")
    .nth(1)
    .fill("MVP deadline is fixed at six months.");
  await page.getByRole("button", { name: "Compare and continue" }).click();
  await page.getByRole("button", { name: "Continue to evaluate" }).click();
}

export async function selectEvaluativeTaskType(
  page: Page,
  name: RegExp | string,
): Promise<void> {
  await comboboxBelowLabel(page, "Task type").click();
  await page.getByRole("option", { name }).click();
}

export async function advanceEvaluativeUncertaintyToEstimate(page: Page): Promise<void> {
  await page
    .getByPlaceholder("Your intuition before running the numbers…")
    .fill("Entering now looks riskier but has the higher expected payoff.");
  await page.getByRole("button", { name: "Continue to estimate" }).click();
}

export async function selectSystemsTaskType(
  page: Page,
  name: RegExp | string,
): Promise<void> {
  await comboboxBelowLabel(page, "Task type").click();
  await page.getByRole("option", { name }).click();
}

export async function selectSequentialTaskType(
  page: Page,
  name: RegExp | string,
): Promise<void> {
  await comboboxBelowLabel(page, "Task type").click();
  await page.getByRole("option", { name }).click();
}

/** Drag from one node's bottom (source) handle to another's top (target) handle on a
 * SystemsFlowCanvas in "connect" mode, creating a single edge. */
export async function addSystemsConnection(page: Page): Promise<void> {
  const sourceHandles = page.locator(".react-flow__handle-bottom");
  const targetHandles = page.locator(".react-flow__handle-top");
  const sourceBox = await sourceHandles.first().boundingBox();
  const targetBox = await targetHandles.nth(1).boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error("addSystemsConnection: react-flow handles not found");
  }
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();
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
