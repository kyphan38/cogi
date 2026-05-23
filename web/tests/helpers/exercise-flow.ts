import { expect, type Page } from "@playwright/test";

export function exerciseSourceCombobox(page: Page) {
  return page.getByRole("main").getByRole("combobox");
}

export async function generateExercise(page: Page, domain: string): Promise<void> {
  await page.getByRole("button", { name: "Generate exercise" }).waitFor({
    timeout: 30_000,
  });
  await page.getByRole("main").getByRole("textbox", { name: "Domain" }).fill(domain);
  await page.getByRole("button", { name: "Generate exercise" }).click();
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
