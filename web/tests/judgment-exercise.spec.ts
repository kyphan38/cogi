import { test, expect, type Page } from "@playwright/test";
import { bypassFirebaseAuth, clickMainNavLink, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";
import { choosePracticeLevel } from "./helpers/exercise-flow";

async function start(page: Page, level: "Guided" | "Standard" | "Expert") {
  await gotoAuthenticated(page, "/exercise/judgment");
  await expect(page.getByRole("heading", { name: "Life situations" })).toBeVisible();
  await choosePracticeLevel(page, level);
  await page.getByTestId("life-areas").getByRole("button", { name: "Work" }).click();
  await page.getByRole("button", { name: "Generate exercise" }).click();
  await expect(page.getByText("Criticized in a meeting")).toBeVisible({ timeout: 15_000 });
}

async function learnFirst(page: Page) {
  await expect(page.getByText("Part 1 of 3 · Learn first")).toBeVisible();
  await expect(page.getByTestId("concept-list")).toContainText("Saving face");
  const start = page.getByRole("button", { name: "Start the exercise" });
  await expect(start).toBeDisabled();
  await page.getByRole("radio", { name: "To keep respect on both sides" }).click();
  await expect(page.getByTestId("concept-check-feedback")).toContainText("Right.");
  await start.click();
}

/** Move r2 ("Talk ... in private") to the top of the ranking. */
async function putBestFirst(page: Page) {
  const list = page.getByTestId("rank-list");
  for (let i = 0; i < 4; i++) {
    const up = list.getByRole("button", { name: /Move up: Talk to the manager in private/ });
    if (await up.isDisabled()) break;
    await up.click();
  }
  await expect(list.getByTestId("rank-item").first()).toContainText("Talk to the manager in private");
}

test.describe("Life situations", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("guided: learn first, one lens at a time, rank 3, feedback, saved, in History and My terms", async ({ page }) => {
    await start(page, "Guided");
    await learnFirst(page);

    await expect(page.getByText("Part 2 of 3 · Three lenses")).toBeVisible();
    for (const [answer, next] of [
      ["The wrong number", "Next lens"],
      ["Stressed about the report", "Next lens"],
      ["Your next step", "Choose a response"],
    ] as const) {
      await page.getByRole("radio", { name: answer }).click();
      await page.getByRole("button", { name: next }).click();
    }

    await expect(page.getByText("Part 3 of 3 · Choose a response")).toBeVisible();
    await expect(page.getByTestId("rank-item")).toHaveCount(3);
    await putBestFirst(page);
    await page.getByRole("button", { name: "Get AI feedback" }).click();

    const key = page.getByTestId("judgment-answer-key");
    await expect(key).toBeVisible({ timeout: 15_000 });
    await expect(key.getByText("Same best response")).toBeVisible();
    await expect(key.getByText("Mock why: a private talk saves face.")).toBeVisible();
    await expect(key.getByText("Pairs like the expert")).toBeVisible();
    // "Take with you": lens cards with the fixed guide and the AI's examples.
    await expect(key.getByTestId("answer-key-takeaways")).toHaveCount(0);
    const cards = key.getByTestId("trap-card");
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText("Spot it");
    await expect(cards.first()).toContainText("Mock reply: that hurt. What do you think was going on for him?");

    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

    await clickMainNavLink(page, "History", /\/exercise\/history/);
    await page.getByRole("button", { name: /Criticized in a meeting/ }).first().click();
    await expect(page.getByTestId("judgment-answer-key")).toBeVisible();
    await page.getByTestId("my-terms-link").click();
    await expect(page.getByTestId("terms-list")).toContainText("Circle of control");
  });

  test("standard: all lenses on one screen, 4 responses, My situation available", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/judgment");
    await choosePracticeLevel(page, "Standard");
    await page.getByRole("button", { name: "My situation" }).click();
    await expect(page.getByLabel("My situation")).toBeVisible();
    await page.getByRole("button", { name: "A new situation" }).click();
    await page.getByRole("button", { name: "Generate exercise" }).click();
    await expect(page.getByText("Criticized in a meeting")).toBeVisible({ timeout: 15_000 });
    await learnFirst(page);

    await expect(page.getByTestId("lens-question")).toHaveCount(3);
    const next = page.getByRole("button", { name: "Choose a response" });
    await expect(next).toBeDisabled();
    for (const answer of ["The team", "Stressed about the report", "Your next step"]) {
      await page.getByRole("radio", { name: answer }).click();
    }
    await next.click();
    await expect(page.getByTestId("rank-item")).toHaveCount(4);
  });

  test("guided hides My situation; expert asks for written lenses and an own response", async ({ page }) => {
    await gotoAuthenticated(page, "/exercise/judgment");
    await choosePracticeLevel(page, "Guided");
    await expect(page.getByRole("button", { name: "My situation" })).toHaveCount(0);
    await start(page, "Expert");
    await learnFirst(page);
    for (const box of await page.getByRole("textbox").all()) await box.fill("A short reading.");
    await page.getByRole("button", { name: "Choose a response" }).click();
    await expect(page.getByLabel("What would you actually do or say? (optional)")).toBeVisible();
  });
});
