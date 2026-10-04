import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, clickMainNavLink, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";

async function openTimeline(page: Page, id: string) {
  await gotoAuthenticated(page, "/geo");
  await page.getByTestId("geo-timelines-open").click();
  await page.getByTestId(`timeline-option-${id}`).click();
  await expect(page.getByTestId("timeline-game")).toBeVisible();
}

/** Press "Next event" until a decision point or the end. */
async function advance(page: Page) {
  if (await page.getByTestId("decision-continue").isVisible()) await page.getByTestId("decision-continue").click();
  for (let i = 0; i < 10; i++) {
    if (await page.getByTestId("decision-point").isVisible()) return;
    if (await page.getByTestId("order-question").isVisible()) return;
    await page.getByTestId("timeline-next").click();
  }
}

test.describe("Geo Lab timelines (G4)", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("Suez: decide twice, see close or different, order the events, find the off-ramp, and save", async ({ page }) => {
    await openTimeline(page, "suez-1956");
    await advance(page);
    const decision = page.getByTestId("decision-point");
    await expect(decision).toContainText("You advise the British government");
    await expect(page.getByTestId("timeline-event")).toHaveCount(2);
    await expect(page.getByTestId("decision-lock")).toBeDisabled();
    await decision.getByRole("radio", { name: /take the canal by force/ }).click();
    await page.getByTestId("decision-lock").click();
    await expect(page.getByTestId("decision-result")).toHaveAttribute("data-verdict", "close");
    await expect(page.getByTestId("decision-result")).toContainText("secret military talks with Israel");
    await expect(page.getByTestId("timeline-event")).toHaveCount(3);

    await advance(page);
    await expect(decision).toContainText("You advise the US president");
    await decision.getByRole("radio", { name: "Stay out of it" }).click();
    await page.getByTestId("decision-lock").click();
    await expect(page.getByTestId("decision-result")).toHaveAttribute("data-verdict", "different");
    await expect(page.getByTestId("decision-result")).toContainText("What happened: Press the allies to accept a UN ceasefire");

    await advance(page);
    await expect(page.getByTestId("timeline-event")).toHaveCount(6);
    const order = page.getByTestId("order-question");
    await expect(order.getByTestId("rank-item")).toHaveCount(4);
    await page.getByTestId("order-check").click();
    await expect(page.getByTestId("order-result")).toContainText("in the right place");

    const offRamp = page.getByTestId("offramp-question");
    await offRamp.getByRole("radio", { name: /accept a UN ceasefire/ }).click();
    const summary = page.getByTestId("timeline-summary");
    await expect(summary).toContainText("close to history 1 of 2 times");
    await expect(page.getByTestId("timeline-calibration")).toContainText("You were 50% sure on average, and close 50% of the time.");

    await clickMainNavLink(page, "History", /\/exercise\/history/);
    await page.getByRole("button", { name: /Timeline: The Suez Crisis/ }).first().click();
    await expect(page.getByTestId("history-geo-timeline")).toContainText("Close to history.");
    await expect(page.getByTestId("history-geo-timeline")).toContainText("Off-ramp: found.");
  });

  test("a case that opens with a decision, and the axis tooltip on desktop", async ({ page }) => {
    await openTimeline(page, "scs-arbitration");
    await expect(page.getByTestId("decision-point")).toContainText("You advise the Philippine government");
    await expect(page.getByTestId("timeline-event")).toHaveCount(0);
    await page.getByTestId("decision-point").getByRole("radio", { name: /arbitration case/ }).click();
    await page.getByTestId("decision-lock").click();
    await expect(page.getByTestId("decision-result")).toHaveAttribute("data-verdict", "close");
    await expect(page.getByTestId("decision-result")).toContainText("tribunal must then check");
    await page.locator('[data-axis-event="a1"]').hover();
    await expect(page.getByTestId("timeline-tooltip")).toContainText("22 January 2013");
    await page.getByTestId("decision-continue").click();
    await expect(page.getByTestId("decision-point")).toContainText("You advise the Chinese government");
  });

  test("on a phone the list is the timeline and nothing runs off the screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openTimeline(page, "vietnam-wto");
    await expect(page.getByTestId("timeline-axis")).toBeHidden();
    await advance(page);
    await expect(page.getByTestId("decision-point")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
