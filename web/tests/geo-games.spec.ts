import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { choosePracticeLevel } from "./helpers/exercise-flow";

test.describe("Geopolitical games and country cards (G3)", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("a real case from the Geo Lab: play the made-up game, then see what really happened and the cards", async ({ page }) => {
    await gotoAuthenticated(page, "/geo");
    await page.getByTestId("geo-game-link-cuba-1962").click();
    await expect(page).toHaveURL(/\/exercise\/strategy\?domain=cuba-1962/);
    await expect(page.getByTestId("geo-case-cuba-1962")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("geo-case-summary")).toContainText("October 22 President Kennedy ordered");

    await choosePracticeLevel(page, "Guided");
    await page.getByRole("button", { name: "Generate exercise" }).click();
    await expect(page.getByText("Rockets on the island")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("radio", { name: "Your best choice given the other's choice" }).click();
    await page.getByRole("button", { name: "Start the exercise" }).click();
    await expect(page.getByTestId("geo-scenario-label")).toContainText("made-up story shaped like a real case");

    // Chicken: the best reply is always the opposite of the other side's choice.
    for (const [answer, next] of [
      ["Ease off", "Next question"],
      ["Keep up the blockade", "Next question"],
      ["Remove the rockets", "Next question"],
      ["Keep the rockets", "Predict the outcome"],
    ] as const) {
      await page.getByTestId("best-reply-question").getByRole("radio", { name: answer }).click();
      await expect(page.getByTestId("best-reply-feedback")).toContainText("Right.");
      await page.getByRole("button", { name: next }).click();
    }
    await page.getByTestId("prediction-matrix").getByRole("button", { name: /Outcome 2/ }).click();
    await page.getByTestId("prediction-matrix").getByRole("button", { name: /Outcome 3/ }).click();
    await page.getByRole("button", { name: "Get AI feedback" }).click();

    const key = page.getByTestId("strategy-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("Outcome predicted").locator("..")).toContainText("Yes");
    const real = page.getByTestId("geo-case-panel");
    await expect(real).toContainText("What really happened");
    await expect(real.getByTestId("geo-case-outcome")).toContainText("On October 28 Khrushchev announced");
    await expect(real).toContainText("The game: Chicken");
    await expect(real.getByRole("link", { name: /Office of the Historian/ })).toHaveAttribute("href", /history\.state\.gov/);

    await real.getByText("Use the cards: the players today").click();
    await page.getByTestId("actor-us").locator("summary").click();
    await expect(page.getByTestId("actor-card-us")).toContainText("Says it wants");
    await expect(page.getByTestId("actor-card-us")).toContainText("Article 5");
    await expect(real.getByTestId("actor-china")).toHaveCount(0);

    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("picking a topic clears the real case; a case sends its id to the AI", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/strategy");
    await page.getByTestId("geo-case-opec-2020").click();
    await expect(page.getByTestId("geo-case-summary")).toContainText("March 6");
    await page.getByTestId("strategy-areas").getByRole("button", { name: "Daily life" }).click();
    await expect(page.getByTestId("geo-case-summary")).toHaveCount(0);
    await expect(page.getByTestId("geo-case-opec-2020")).toHaveAttribute("aria-pressed", "false");

    await page.getByTestId("geo-case-arms-race").click();
    const request = page.waitForRequest((r) => r.url().endsWith("/api/ai") && r.method() === "POST");
    await page.getByRole("button", { name: "Generate exercise" }).click();
    const body = (await request).postDataJSON() as { geoCaseId?: string; domain?: string };
    expect(body.geoCaseId).toBe("arms-race");
    expect(body.domain).toBe("The Cold War nuclear arms race");
  });

  test("country cards in the Geo Lab: own words, neutral facts, every line with a source", async ({ page }) => {
    await gotoAuthenticated(page, "/geo");
    await page.getByTestId("geo-cards-open").click();
    const cards = page.getByTestId("actor-cards");
    await expect(cards.locator("details")).toHaveCount(10);
    await expect(page.getByTestId("actor-card-us")).toBeVisible();
    await page.getByTestId("actor-vietnam").locator("summary").click();
    const vn = page.getByTestId("actor-card-vietnam");
    await expect(vn).toContainText("four no's");
    await expect(vn).toContainText("Groups and treaties");
    await expect(vn.getByRole("link", { name: /^Source: Vietnam Government Portal/ }).first()).toHaveAttribute("href", /baochinhphu/);
    await page.getByTestId("actor-asean").locator("summary").click();
    await expect(page.getByTestId("actor-card-asean")).not.toContainText("Groups and treaties");
  });
});
