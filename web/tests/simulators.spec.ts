import { test, expect } from "@playwright/test";
import { bypassFirebaseAuth, gotoAuthenticated, stubFirestoreReads } from "./helpers/auth-setup";

test.describe("Simulators", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
  });

  test("guess first, then the sliders jump to the question's case", async ({ page }) => {
    await gotoAuthenticated(page, "/simulators");
    const loan = page.getByTestId("sim-loan");
    await expect(loan.getByTestId("loan-rate-value")).toHaveText("8%");
    await loan.getByRole("radio", { name: "Less than 50%" }).click();
    await expect(loan.getByTestId("predict-feedback")).toContainText("Right.");
    await expect(loan.getByTestId("loan-rate-value")).toHaveText("12%");

    const savings = page.getByTestId("sim-savings");
    await savings.getByRole("radio", { name: "More" }).click();
    await expect(savings.getByTestId("predict-feedback")).toContainText("Not quite.");
    await expect(savings.getByTestId("savings-inflation-value")).toHaveText("6%");

    const imp = page.getByTestId("sim-import");
    await imp.getByRole("radio", { name: "About 20%" }).click();
    await expect(imp.getByTestId("predict-feedback")).toContainText("Right.");
    await expect(imp.getByTestId("import-rate-value")).toHaveText("27,500");
  });

  test("sliders move the numbers and the table shows exact values", async ({ page }) => {
    await gotoAuthenticated(page, "/simulators");
    const loan = page.getByTestId("sim-loan");
    const before = await loan.getByText("Each month", { exact: true }).locator("..").textContent();
    await loan.getByRole("slider", { name: "Interest rate (per year)" }).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(loan.getByTestId("loan-rate-value")).toHaveText("9%");
    await expect(loan.getByText("Each month", { exact: true }).locator("..")).not.toHaveText(before ?? "");
    await loan.getByText("Show the numbers").click();
    await expect(loan.getByRole("table")).toContainText("20%");
  });

  test("tracks link to their simulator", async ({ page }) => {
    await gotoAuthenticated(page, "/tracks");
    await expect(page.getByTestId("track-simulator-link")).toHaveCount(3);
    await expect(page.getByTestId("track-simulator-link").first()).toHaveAttribute("href", "/simulators#loan");
  });
});
