import { test, expect, type Page, type Route } from "@playwright/test";
import { bypassFirebaseAuth, stubFirestoreReads } from "./helpers/auth-setup";

function stubSequentialAi(page: Page) {
  return page.route("**/api/ai", async (route: Route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse((await route.request().postData()) ?? "{}");
    } catch { /* use defaults */ }

    if (body.exerciseType === "sequential") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            title: "Incident Response Sequence",
            scenario:
              "A production outage has been detected in the payment processing service. " +
              "Multiple teams are scrambling to restore service while customers are unable to " +
              "complete transactions. The monitoring system shows cascading failures across " +
              "three microservices.",
            steps: [
              {
                id: "s1",
                text: "Acknowledge the incident and notify stakeholders",
                correctPosition: 1,
                dependencies: [],
                isFlexible: false,
                explanation: "First response protocol.",
              },
              {
                id: "s2",
                text: "Isolate the failing payment service from the load balancer",
                correctPosition: 2,
                dependencies: ["s1"],
                isFlexible: false,
                explanation: "Stop the bleeding before diagnosis.",
              },
              {
                id: "s3",
                text: "Analyze error logs to identify root cause",
                correctPosition: 3,
                dependencies: ["s2"],
                isFlexible: false,
                explanation: "Need isolation before safe log analysis.",
              },
              {
                id: "s4",
                text: "Deploy hotfix and verify in staging",
                correctPosition: 4,
                dependencies: ["s3"],
                isFlexible: true,
                explanation: "Depends on knowing root cause.",
              },
              {
                id: "s5",
                text: "Gradually restore traffic and monitor metrics",
                correctPosition: 5,
                dependencies: ["s4"],
                isFlexible: true,
                explanation: "Only after fix is verified.",
              },
            ],
            criticalErrors: [
              {
                description: "Deploying a fix before identifying root cause",
                severity: "catastrophic",
              },
            ],
          },
        }),
      });
      return;
    }

    // Fall through to default analytical stub
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: { title: "Fallback", passage: "Fallback passage." } }),
    });
  });
}

test.describe("Sequential exercise - setup phase", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
    await stubSequentialAi(page);
  });

  test("renders setup card with heading and generate button", async ({
    page,
  }) => {
    await page.goto("/exercise/sequential");
    await expect(
      page.getByRole("heading", { name: "Sequential exercise" }),
    ).toBeVisible();
    await expect(page.getByLabel("Domain")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate exercise" }),
    ).toBeVisible();
  });

  test("source selector shows AI-generated and My scenario options", async ({
    page,
  }) => {
    await page.goto("/exercise/sequential");
    const sourceTrigger = page.getByLabel("Source").locator("..").getByRole("combobox");
    await sourceTrigger.click();
    await expect(
      page.getByRole("option", { name: "AI-generated from domain" }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "My scenario" }),
    ).toBeVisible();
  });

  test("switching to My scenario shows custom scenario textarea", async ({
    page,
  }) => {
    await page.goto("/exercise/sequential");
    const sourceTrigger = page.getByLabel("Source").locator("..").getByRole("combobox");
    await sourceTrigger.click();
    await page.getByRole("option", { name: "My scenario" }).click();
    await expect(page.getByLabel("Your scenario")).toBeVisible();
  });
});

test.describe("Sequential exercise - generation and ordering", () => {
  test.beforeEach(async ({ page }) => {
    await bypassFirebaseAuth(page);
    await stubFirestoreReads(page);
    await stubSequentialAi(page);
  });

  test("generating transitions to ordering phase with scenario text", async ({
    page,
  }) => {
    await page.goto("/exercise/sequential");
    await page.getByLabel("Domain").fill("DevOps");
    await page.getByRole("button", { name: "Generate exercise" }).click();

    await expect(
      page.getByText("Incident Response Sequence"),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(/production outage/),
    ).toBeVisible();
  });

  test("ordering phase shows source pool and timeline zones", async ({
    page,
  }) => {
    await page.goto("/exercise/sequential");
    await page.getByLabel("Domain").fill("DevOps");
    await page.getByRole("button", { name: "Generate exercise" }).click();

    await expect(
      page.getByText("Incident Response Sequence"),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Source")).toBeVisible();
    await expect(page.getByText("Timeline")).toBeVisible();
  });

  test("ordering phase renders all 5 steps in the source pool", async ({
    page,
  }) => {
    await page.goto("/exercise/sequential");
    await page.getByLabel("Domain").fill("DevOps");
    await page.getByRole("button", { name: "Generate exercise" }).click();

    await expect(
      page.getByText("Incident Response Sequence"),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/Acknowledge the incident/)).toBeVisible();
    await expect(page.getByText(/Isolate the failing payment/)).toBeVisible();
    await expect(page.getByText(/Analyze error logs/)).toBeVisible();
    await expect(page.getByText(/Deploy hotfix/)).toBeVisible();
    await expect(page.getByText(/Gradually restore traffic/)).toBeVisible();
  });

  test("timeline zone shows drag instruction when empty", async ({ page }) => {
    await page.goto("/exercise/sequential");
    await page.getByLabel("Domain").fill("DevOps");
    await page.getByRole("button", { name: "Generate exercise" }).click();

    await expect(
      page.getByText("Incident Response Sequence"),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(/Drag steps here in process order/),
    ).toBeVisible();
  });
});
