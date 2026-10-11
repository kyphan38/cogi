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

async function fillExerciseDomain(page: Page, domain: string) {
  const input = page.getByRole("main").getByRole("textbox", { name: "Domain" });
  await input.click();
  await input.fill(domain);
  await input.dispatchEvent("input");
  await input.dispatchEvent("change");
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue(domain);
}

/**
 * Tag something so the highlight step can advance: tap the first sentence in
 * sentence mode, or stage and confirm a text selection in free mode.
 */
export async function addPassageHighlight(page: Page): Promise<void> {
  const sentence = page.getByTestId("passage-sentence").first();
  if (await sentence.isVisible().catch(() => false)) {
    await sentence.click();
  } else {
    await selectTextInPassage(page);
  }
  const picker = page.getByTestId("tag-picker-region");
  await expect(picker).toBeVisible({ timeout: 5_000 });
  await picker.getByRole("button").first().click();
}

/** Pick a practice level on a setup screen that has the level picker. */
export async function choosePracticeLevel(
  page: Page,
  level: "Guided" | "Standard" | "Expert",
): Promise<void> {
  const option = page
    .getByRole("main")
    .getByTestId("level-picker")
    .getByRole("button", { name: new RegExp(`^${level}`) });
  await option.click();
  await expect(option).toHaveAttribute("aria-pressed", "true");
}

/**
 * Fill the domain and generate. On setup screens with a level picker, pick `level`
 * first; with no `level`, a new user's Guided default moves to Standard (what most
 * specs assume) and a level a spec already chose is kept.
 */
export async function generateExercise(
  page: Page,
  domain: string,
  opts: { level?: "Guided" | "Standard" | "Expert" } = {},
): Promise<void> {
  const main = page.getByRole("main");
  const generateBtn = main.getByRole("button", { name: "Generate exercise" });
  await generateBtn.waitFor({ state: "visible", timeout: 30_000 });

  const levelPicker = main.getByTestId("level-picker");
  if (await levelPicker.isVisible().catch(() => false)) {
    const guided = levelPicker.getByRole("button", { name: /^Guided/ });
    if (opts.level) await choosePracticeLevel(page, opts.level);
    else if ((await guided.getAttribute("aria-pressed")) === "true") await choosePracticeLevel(page, "Standard");
  }

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
  // Task types other than Auto open up at Expert.
  if (await page.getByRole("main").getByTestId("level-picker").isVisible().catch(() => false)) {
    await choosePracticeLevel(page, "Expert");
  }
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
  // Task types other than Auto open up at Expert.
  if (await page.getByRole("main").getByTestId("level-picker").isVisible().catch(() => false)) {
    await choosePracticeLevel(page, "Expert");
  }
  await comboboxBelowLabel(page, "Task type").click();
  await page.getByRole("option", { name }).click();
}

/** Tap one node, then another, then pick "goes up": creates a single "increases" edge on a
 * SystemsFlowCanvas in "connect" mode. */
export async function addSystemsConnection(page: Page): Promise<void> {
  const nodes = page.locator(".react-flow__node");
  await nodes.nth(0).click();
  await nodes.nth(1).click();
  await page.getByTestId("link-chooser").getByRole("button", { name: "goes up" }).click();
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
