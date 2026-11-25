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

  test("the tracks page shows your track, then every topic pack", async ({ page }) => {
    // Today builds the first track.
    await gotoAuthenticated(page, "/");
    await expect(page.getByTestId("track-card")).toContainText("Track 1");
    await gotoAuthenticated(page, "/tracks");
    const mine = page.getByTestId("your-track");
    await expect(mine.getByTestId("gen-step")).toHaveCount(6);
    await expect(mine.locator('[data-state="next"]')).toContainText(FIRST_DOMAIN);
    await expect(mine.getByTestId("gen-step-start")).toHaveAttribute("href", /\/exercise\/analytical\?domain=.*&step=t1-\w+-1$/);
    await expect(page.getByTestId("past-tracks")).toHaveCount(0);
    // Topic packs open in place, and close again.
    await expect(page.getByTestId("track")).toHaveCount(7);
    const row = page.getByRole("button", { name: /How countries trade and compete/ });
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("track-step")).toHaveCount(5);
    await row.click();
    await expect(page.getByTestId("track-step")).toHaveCount(0);
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
