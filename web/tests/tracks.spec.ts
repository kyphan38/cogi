import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, clickMainNavLink, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { addPassageHighlight, generateExercise } from "./helpers/exercise-flow";

const FIRST_DOMAIN = "Interest rates go up: who gains and who loses";

test.describe("Learning tracks", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("Home shows the first track; Start opens the step with its topic filled in", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    const card = page.getByTestId("track-card");
    await expect(card).toContainText("Track 1 · 0 of 6 done");
    await expect(card).toContainText("Step 1 · Analytical · new");
    await expect(card).toContainText(FIRST_DOMAIN);
    await card.getByTestId("track-next-step").click();
    await expect(page).toHaveURL(/\/exercise\/analytical\?domain=.*&step=t1-\w+-1$/);
    await expect(page.getByRole("main").getByRole("textbox", { name: "Domain" })).toHaveValue(FIRST_DOMAIN);
  });

  test("finishing a step moves the track to the next one", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await page.getByTestId("track-next-step").click();
    await generateExercise(page, FIRST_DOMAIN);
    await expect(page.getByText("Structural reasoning passage")).toBeVisible({ timeout: 15_000 });
    await addPassageHighlight(page);
    await page.getByRole("button", { name: "Get AI feedback" }).click();
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Client navigation keeps the in-page e2e store.
    await clickMainNavLink(page, "Today", /\/$/);
    const card = page.getByTestId("track-card");
    await expect(card).toContainText("Track 1 · 1 of 6 done");
    await expect(card).toContainText("Step 2 · Systems · new");
  });

  test("the tracks page lists every track and step", async ({ page }) => {
    await gotoAuthenticated(page, "/tracks");
    await expect(page.getByTestId("track")).toHaveCount(7);
    // Your track is open with its steps and the page's one filled Start.
    const mine = page.locator('[data-testid="track"][data-current="true"]');
    await expect(mine).toContainText("Money and interest rates");
    await expect(page.getByTestId("track-step")).toHaveCount(5);
    await expect(mine.getByTestId("track-step-start")).toHaveAttribute("href", /\/exercise\/analytical\?domain=/);
    // Another track opens in place, and closes again.
    const row = page.getByRole("button", { name: /How countries trade and compete/ });
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("track-step")).toHaveCount(10);
    await row.click();
    await expect(page.getByTestId("track-step")).toHaveCount(5);
  });

  test("an unfinished step shows Continue with a visible discard icon on phones", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/");
    await page.getByTestId("track-next-step").click();
    await generateExercise(page, FIRST_DOMAIN);
    await expect(page.getByText("Structural reasoning passage")).toBeVisible({ timeout: 15_000 });
    // Leave it unfinished (client navigation keeps the e2e store).
    await clickMainNavLink(page, "Today", /\/$/);

    const card = page.getByTestId("track-card");
    await expect(card.getByTestId("track-next-step")).toHaveText(/Continue/);
    const discard = card.getByTestId("track-discard");
    await expect(discard).toBeVisible();
    expect(Number(await discard.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0);

    // Cancel keeps it; accept removes it.
    page.once("dialog", (d) => void d.dismiss());
    await discard.click();
    await expect(card.getByTestId("track-next-step")).toHaveText(/Continue/);
    page.once("dialog", (d) => void d.accept());
    await discard.click();
    await expect(card.getByTestId("track-next-step")).toHaveText(/Start/);
    await expect(page.getByText("Continue", { exact: true })).toHaveCount(0);
  });
});
