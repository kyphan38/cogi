import { test, expect, type Locator, type Page } from "@playwright/test";
import { bypassFirebaseAuth, clickMainNavLink, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { fitProjection, MAP_WIDTH } from "../src/lib/geo/geometry";
import { PLACES, placeQuestion } from "../src/lib/geo/places";
import { REGIONS } from "../src/lib/geo/regions";

/** Click the map where the current question's place really is (same projection as the app). */
async function markRightPlace(page: Page, map: Locator) {
  const question = (await page.getByTestId("quiz-question").textContent())?.trim();
  const place = PLACES.find((p) => placeQuestion(p) === question);
  expect(place, `no place for "${question}"`).toBeTruthy();
  const { projection, height } = fitProjection(REGIONS[place!.region].bbox, MAP_WIDTH);
  const target = place!.target[Math.floor(place!.target.length / 2)]!;
  const [x, y] = projection(target)!;
  const svg = map.locator("svg").first();
  const box = (await svg.boundingBox())!;
  await svg.click({ position: { x: (x / MAP_WIDTH) * box.width, y: (y / height) * box.height } });
}

/** Mark the right place, then press Check. */
async function tapRightPlace(page: Page, map: Locator) {
  await markRightPlace(page, map);
  await page.getByTestId("quiz-check").click();
}

test.describe("Geo Lab", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("Practice links to the Geo Lab, and the geopolitics track does too", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await expect(page.getByTestId("geo-lab-card")).toBeVisible();
    await expect(page.getByTestId("geo-lab-card-status")).toHaveText("Today's map quiz is ready.");
    await page.getByTestId("geo-lab-link").click();
    await expect(page).toHaveURL(/\/geo$/);
    await expect(page.getByRole("heading", { name: "Geo Lab" })).toBeVisible();

    await gotoAuthenticated(page, "/tracks");
    await expect(page.getByTestId("tracks-geo-lab-link")).toHaveAttribute("href", "/geo");
    await expect(page.getByTestId("track-geo-lab-link")).toHaveCount(1);
  });

  test("daily map quiz: tap, see the distance, results, then it is done for today and in History", async ({ page }) => {
    await gotoAuthenticated(page, "/geo");
    await page.getByTestId("geo-quiz-start").click();
    const map = page.getByTestId("quiz-map");
    const asked: (string | null)[] = [];
    const question = page.getByTestId("quiz-question");

    // Q1: tap the right place.
    await expect(page.getByTestId("quiz-progress")).toHaveText("Question 1 of 5");
    asked.push(await question.textContent());
    // A tap only places a mark; a second tap moves it; Check answers.
    await expect(page.getByTestId("quiz-check")).toBeDisabled();
    const svg = map.locator("svg").first();
    await svg.click({ position: { x: 40, y: 40 } });
    await expect(map.locator('[data-marker="pending"]')).toHaveCount(1);
    await expect(page.getByTestId("quiz-feedback")).toHaveCount(0);
    await tapRightPlace(page, map);
    await expect(page.getByTestId("quiz-feedback")).toHaveAttribute("data-correct", "true");
    await expect(page.getByTestId("quiz-feedback")).toContainText("Right. Your tap was");
    await expect(map.locator('[data-marker="answer"]')).toBeVisible();
    await page.getByTestId("quiz-next").click();

    // Q2: "I don't know" shows the answer.
    asked.push(await question.textContent());
    await page.getByTestId("quiz-skip").click();
    await expect(page.getByTestId("quiz-feedback")).toHaveText("Here it is on the map.");
    await page.getByTestId("quiz-next").click();

    // Q3-Q5: right, right, skip.
    for (const skip of [false, false, true]) {
      asked.push(await question.textContent());
      if (skip) await page.getByTestId("quiz-skip").click();
      else await tapRightPlace(page, map);
      if (!skip) await page.getByTestId("quiz-next").click();
    }
    await expect(page.getByTestId("quiz-next")).toHaveText("See results");
    await page.getByTestId("quiz-next").click();

    const results = page.getByTestId("quiz-results");
    await expect(results).toContainText("3 of 5");
    await expect(results.locator("tbody tr")).toHaveCount(5);
    await expect(results).toContainText("Misses come back after 1,");
    await page.getByTestId("geo-results-done").click();

    await expect(page.getByTestId("geo-quiz-status")).toContainText("Done for today: 3 of 5");
    await expect(page.getByTestId("geo-quiz-start")).toHaveText("Another round");

    // An extra round asks other places.
    await page.getByTestId("geo-quiz-start").click();
    await expect(page.getByTestId("quiz-progress")).toHaveText("Question 1 of 5");
    expect(asked).not.toContain(await page.getByTestId("quiz-question").textContent());
    await page.getByTestId("geo-back").click();

    await clickMainNavLink(page, "History", /\/exercise\/history/);
    await page.getByRole("button", { name: /Map quiz/ }).first().click();
    await expect(page.getByTestId("history-geo-quiz")).toContainText("Map quiz: 3 of 5");
  });

  test("close the strait: guess, then see the sourced answer on the map with a note", async ({ page }) => {
    await gotoAuthenticated(page, "/geo");
    await page.getByTestId("geo-strait-start").click();
    const map = page.getByTestId("strait-map");
    await expect(map.locator('[data-marker="hormuz"]')).toBeVisible();

    await page.getByTestId("strait-option-hormuz").click();
    await expect(page.getByTestId("strait-intro")).toContainText("the Persian Gulf and the Arabian Sea");
    await page.getByTestId("strait-close").click();

    await expect(page.getByTestId("strait-next")).toBeDisabled();
    await expect(map.locator('path[data-state="candidate"]')).toHaveCount(8);
    await page.getByTestId("country-chip-156").click(); // China
    await map.locator('path[data-country="356"]').click({ force: true }); // India, on the map
    await page.getByTestId("country-chip-840").click(); // United States
    await expect(map.locator('path[data-state="picked"]')).toHaveCount(3);
    await page.getByTestId("strait-next").click();

    await page.getByTestId("route-option-gulf-pipelines").click();
    await page.getByTestId("strait-reveal").click();

    await expect(page.getByTestId("strait-score")).toHaveText("You found 2 of 4. 1 of your picks was not on the list.");
    await expect(page.getByTestId("strait-answer")).toContainText("You got it.");
    await expect(page.getByTestId("strait-answer")).toContainText("China, India, Japan, South Korea");
    await expect(map.locator('path[data-state="found"]')).toHaveCount(2);
    await expect(map.locator('path[data-state="missed"]')).toHaveCount(2);
    // The answer map zooms to Asia, so the United States (a wrong pick) is only in the table.
    await expect(map.locator('path[data-state="extra"]')).toHaveCount(0);
    await expect(map.locator("path[data-line]")).toHaveCount(2);
    await expect(page.getByTestId("strait-note")).toContainText("Mock note");
    await expect(page.getByRole("link", { name: /World Oil Transit Chokepoints/ }).first()).toHaveAttribute("href", /eia\.gov/);

    await page.getByTestId("strait-data").getByText("Show the data").click();
    await expect(page.getByTestId("strait-data")).toContainText("20.9 million barrels a day");
    await expect(page.getByTestId("strait-data")).toContainText("Not a top user · you picked it");

    await clickMainNavLink(page, "History", /\/exercise\/history/);
    await page.getByRole("button", { name: /Close the strait: Strait of Hormuz/ }).first().click();
    await expect(page.getByTestId("history-geo-strait")).toContainText("Found: China, India");
    await expect(page.getByTestId("history-geo-strait")).toContainText("Mock note");
  });

  test("chokepoint markers show their details on hover", async ({ page }) => {
    await gotoAuthenticated(page, "/geo");
    await page.getByTestId("geo-strait-start").click();
    const map = page.getByTestId("strait-map");
    await map.locator('[data-marker="malacca"]').hover();
    await expect(page.getByTestId("map-tooltip")).toContainText("Strait of Malacca");
    await expect(page.getByTestId("map-tooltip")).toContainText("Connects the Indian Ocean and the Pacific Ocean.");
  });
});

test.describe("Geo Lab on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("the quiz map fills the width and a tap works", async ({ page }) => {
    await gotoAuthenticated(page, "/geo");
    await page.getByTestId("geo-quiz-start").click();
    const svg = page.getByTestId("quiz-map").locator("svg").first();
    const box = (await svg.boundingBox())!;
    expect(box.width).toBeGreaterThan(340);
    expect(box.width).toBeLessThanOrEqual(390);
    await tapRightPlace(page, page.getByTestId("quiz-map"));
    await expect(page.getByTestId("quiz-feedback")).toHaveAttribute("data-correct", "true");
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(390);
  });

  test("zoom in and drag the map; a drag is not an answer, a tap still is", async ({ page }) => {
    await gotoAuthenticated(page, "/geo");
    await page.getByTestId("geo-quiz-start").click();
    const map = page.getByTestId("quiz-map");
    const svg = map.locator("svg").first();
    await page.getByTestId("map-zoom-in").click();
    await page.getByTestId("map-zoom-in").click();
    await expect(svg).toHaveAttribute("data-zoom", "4");
    const before = await svg.locator("[data-map-view]").getAttribute("transform");

    const box = (await svg.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 20, { steps: 5 });
    await page.mouse.up();
    await expect(svg.locator("[data-map-view]")).not.toHaveAttribute("transform", before!);
    await expect(page.getByTestId("quiz-feedback")).toHaveCount(0);
    await expect(svg.locator('[data-marker="pending"]')).toHaveCount(0);

    // Tap where the place is drawn in the zoomed view.
    const question = (await page.getByTestId("quiz-question").textContent())?.trim();
    const place = PLACES.find((p) => placeQuestion(p) === question)!;
    const { projection, height } = fitProjection(REGIONS[place.region].bbox, MAP_WIDTH);
    const [mx, my] = projection(place.target[Math.floor(place.target.length / 2)]!)!;
    const view = (await svg.locator("[data-map-view]").getAttribute("transform"))!;
    const [tx, ty, k] = view.match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number);
    const vx = mx * k! + tx!;
    const vy = my * k! + ty!;
    if (vx < 0 || vx > MAP_WIDTH || vy < 0 || vy > height) {
      // Out of view at this zoom: zoom back out and tap at full size.
      await page.getByTestId("map-zoom-reset").click();
      await expect(svg).toHaveAttribute("data-zoom", "1");
      await tapRightPlace(page, map);
    } else {
      await svg.click({ position: { x: (vx / MAP_WIDTH) * box.width, y: (vy / height) * box.height } });
      await page.getByTestId("quiz-check").click();
    }
    await expect(page.getByTestId("quiz-feedback")).toHaveAttribute("data-correct", "true");
  });
});
