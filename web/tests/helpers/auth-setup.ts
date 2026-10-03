import { expect, type Page, type Route } from "@playwright/test";
import { makeMockAnalyticalAiPayload } from "./layout-fixtures-data";

/**
 * Injects the E2E auth bypass flag into the page so that FirebaseAuthGate
 * immediately transitions to "ready" and getCurrentUidOrThrow returns a
 * deterministic UID - all without touching real Firebase.
 *
 * Call this BEFORE every `page.goto(...)` that lands inside the (main) layout.
 */
export async function bypassFirebaseAuth(page: Page): Promise<void> {
  const setBypass = () => {
    (window as unknown as Record<string, unknown>).__E2E_AUTH_BYPASS__ = true;
  };
  await page.context().addInitScript(setBypass);
  await page.addInitScript(setBypass);

  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  await page.context().addCookies([
    {
      name: "cogi_e2e",
      value: "1",
      url: `${baseURL}/`,
    },
  ]);

  // Intercept session and auth endpoints so they succeed.
  await page.route("**/api/auth/session", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api/auth/verify", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, uid: "e2e-test-user-uid" }),
    });
  });
}

/** Navigate past FirebaseAuthGate before asserting on protected UI. */
export async function gotoAuthenticated(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page
    .getByText("Checking access...")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {
      /* already past gate */
    });
  await page
    .getByRole("navigation", { name: "Main" })
    .waitFor({ state: "visible", timeout: 15_000 });
  await ensureManualEntryMode(page);
}

/**
 * Exercise setup screens (Evaluative/Analytical/Systems)
 * default to a "Suggested topics" entry mode. Its AI topic-suggestions fetch
 * always fails in e2e (no real Firebase ID token for the server to verify),
 * but the manual Domain/Source/Generate controls stay hidden until the user
 * switches tabs. Defensively switch to "Type your own" wherever that toggle
 * exists so setup-form locators used across the suite resolve. No-op on
 * pages without this toggle (e.g. settings).
 */
export async function ensureManualEntryMode(page: Page): Promise<void> {
  const manualToggle = page.getByRole("main").getByRole("button", { name: "Type your own" });
  await manualToggle
    .first()
    .waitFor({ state: "visible", timeout: 3_000 })
    .then(() => manualToggle.first().click())
    .catch(() => {
      /* not an exercise setup screen, or already in manual mode */
    });
}

const NAV_URL_TIMEOUT = 15_000;

/** Click a main nav link and wait for client navigation (hydration can delay URL updates). */
export async function clickMainNavLink(
  page: Page,
  linkName: string,
  url: string | RegExp,
): Promise<void> {
  const link = page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: linkName });
  await expect(link).toBeVisible({ timeout: NAV_URL_TIMEOUT });

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    await link.click();
    try {
      await page.waitForURL(url, { timeout: 5_000, waitUntil: "commit" });
      return;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * Stub AI and backend API endpoints so pages render without a live server.
 */
export async function stubFirestoreReads(page: Page): Promise<void> {
  await page.route("**/api/ai", async (route: Route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse((await route.request().postData()) ?? "{}") as Record<string, unknown>;
    } catch {
      // use defaults
    }
    const domain = typeof body.domain === "string" ? body.domain : "Testing";
    const exerciseType = body.exerciseType as string | undefined;
    const evaluativeTaskType = body.evaluativeTaskType as string | undefined;

    let data: unknown;
    switch (exerciseType) {
      case "evaluative":
        data =
          evaluativeTaskType === "dealbreaker"
            ? makeMockEvaluativeDealbreakerAiPayload()
            : evaluativeTaskType === "uncertainty"
              ? makeMockEvaluativeUncertaintyAiPayload()
              : makeMockEvaluativeAiPayload();
        break;
      case "systems": {
        const systemsTaskType = body.systemsTaskType as string | undefined;
        data =
          systemsTaskType === "resilience"
            ? makeMockSystemsResiliencePayload()
            : makeMockStandaloneSystemsPayload();
        break;
      }
      case "strategy":
        data = makeMockStrategyPayload(body.level === "expert");
        break;
      case "judgment":
        data = makeMockJudgmentPayload(body.level === "guided" ? 3 : 4);
        break;
      default:
        data = makeMockAnalyticalAiPayload(domain);
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data }),
    });
  });

  await page.route("**/api/ai/perspective", async (route: Route) => {
    let kind: unknown;
    try {
      kind = (JSON.parse(route.request().postData() ?? "{}") as { kind?: unknown }).kind;
    } catch {
      // treat as analytical
    }
    if (kind === undefined || kind === "analytical") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          text: "Mock coaching.",
          structured: {
            perspectiveFormat: "analytical_v3",
            title: "Structural reasoning passage",
            items: [
              {
                ref: "issue_1",
                why: "Mock why: the passage offers only two options.",
                clue: "Mock clue: \"binary choice\".",
                nextTimeAsk: "Are other options left out?",
                subtypeName: "False dilemma",
              },
            ],
            takeaways: ["Mock takeaway: look for words that shrink the choices."],
          },
        }),
      });
      return;
    }
    if (kind === "strategy") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          text: "Mock strategy coaching.",
          structured: {
            perspectiveFormat: "coaching_v3",
            title: "Food truck price war",
            items: [{ ref: "prediction", why: "Mock why: cutting is each side's best reply.", clue: "steal the crowd", nextTimeAsk: "What is my best reply to each choice?" }],
            takeaways: ["Mock strategy takeaway: look for each side's best reply first."],
            metaNote: "Mock note on your reason.",
          },
        }),
      });
      return;
    }
    if (kind === "judgment") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          text: "Mock judgment coaching.",
          structured: {
            perspectiveFormat: "coaching_v3",
            title: "Mock situation",
            items: [{ ref: "response_r2", why: "Mock why: a private talk saves face.", clue: "in front of everyone", nextTimeAsk: "Where should this talk happen?" }],
            takeaways: ["Mock judgment takeaway: talk in private first."],
            metaNote: "Mock note on your reason.",
          },
        }),
      });
      return;
    }
    if (kind === "systems" || (typeof kind === "string" && kind.startsWith("evaluative"))) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          text: "Mock systems coaching.",
          structured: {
            perspectiveFormat: "coaching_v3",
            title: "Mock exercise",
            items: [],
            takeaways: [
              kind === "systems"
                ? "Mock systems takeaway: follow each arrow from the shock."
                : "Mock evaluative takeaway: check both axes.",
            ],
            ...(kind === "evaluative-scoring" ? { metaNote: "Mock note on your criteria." } : {}),
          },
        }),
      });
      return;
    }
    const structured = {
      perspectiveFormat: "clarity_v2",
      title: "Mock exercise",
      suitableFor: "Suitable for integration testers validating perspective UI",
      highlightCritiques: [
        {
          id: "hc_1",
          userTextSnippet: "sample user text",
          critique: "You wrote that 'sample user text'. However, the mock flags a structural gap.",
          remediationAlternative: "A stronger alternative would stress-test assumptions explicitly.",
        },
      ],
      openQuestions: ["What would you validate next?"],
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        text: "### Suitable for integration testers\n\nMock perspective.",
        structured,
      }),
    });
  });

}

/** @deprecated Use stubFirestoreReads - POST /api/ai is stubbed there. */
export async function stubAnalyticalAi(page: Page): Promise<void> {
  await stubFirestoreReads(page);
}

export async function gotoLayoutFixtures(page: Page): Promise<void> {
  await page.goto("/dev/layout-fixtures", { waitUntil: "domcontentloaded" });
  await page
    .getByText("Checking access...")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {
      /* already past gate */
    });
  await page.getByRole("heading", { name: "Layout fixtures" }).waitFor({
    timeout: 30_000,
  });
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

function makeMockEvaluativeAiPayload() {
  return {
    variant: "matrix",
    title: "Technology Stack Decision",
    scenario:
      "Your team needs to choose a frontend framework for a new customer-facing " +
      "application. The existing backend is in Python/FastAPI. Key constraints include " +
      "team expertise, hiring pipeline, and a 6-month deadline for the MVP.",
    axisX: { label: "Team Ramp-up Time", lowLabel: "Quick", highLabel: "Slow" },
    axisY: { label: "Long-term Scalability", lowLabel: "Limited", highLabel: "Highly Scalable" },
    options: [
      { id: "o1", title: "React + Next.js", description: "Industry standard with SSR.", intendedQuadrant: "top-left", explanation: "Fast ramp-up, proven at scale." },
      { id: "o2", title: "Svelte + SvelteKit", description: "Modern with smaller ecosystem.", intendedQuadrant: "top-right", explanation: "Scalable but fewer devs know it." },
      { id: "o3", title: "Vue + Nuxt", description: "Gentle learning curve.", intendedQuadrant: "bottom-left", explanation: "Quick start, moderate scale." },
      { id: "o4", title: "HTMX + Jinja", description: "Server-rendered with Python.", intendedQuadrant: "bottom-right", explanation: "Slow for complex UIs." },
    ],
  };
}

function makeMockEvaluativeDealbreakerAiPayload() {
  return {
    variant: "scoring",
    title: "Vendor Contract Renewal",
    scenario:
      "Your company must choose a cloud vendor for the next 3-year contract. " +
      "Security compliance is non-negotiable for regulators, but cost and support " +
      "quality also matter to the finance and ops teams.",
    criteria: [
      {
        id: "c1",
        label: "Data Security Compliance",
        description: "Must meet SOC 2 and regional data residency requirements.",
        isDealbreaker: true,
        suggestedWeight: 5,
      },
      {
        id: "c2",
        label: "Total Cost of Ownership",
        description: "License, migration, and support cost over 3 years.",
        suggestedWeight: 3,
      },
      {
        id: "c3",
        label: "Support Quality",
        description: "Vendor SLA and historical performance.",
        suggestedWeight: 3,
      },
    ],
    options: [
      {
        id: "o1",
        title: "Amazon Cloud",
        description: "Broad service catalog, strong compliance history.",
        suggestedScores: { c1: 5, c2: 2, c3: 4 },
        explanation: "Passes compliance, but pricier and locked-in.",
      },
      {
        id: "o2",
        title: "Budget Cloud Co",
        description: "Cheap, but SOC 2 certification is still pending.",
        suggestedScores: { c1: 3, c2: 5, c3: 2 },
        explanation: "Borderline compliance, but attractive on cost.",
      },
      {
        id: "o3",
        title: "Regional Provider",
        description: "Mid-tier pricing with dedicated regional support.",
        suggestedScores: { c1: 4, c2: 3, c3: 5 },
        explanation: "Strong reliability, moderate cost, compliant.",
      },
    ],
    hiddenCriteria: [
      {
        label: "Vendor Lock-in Risk",
        description: "Migration cost and data portability if you switch again.",
      },
    ],
  };
}

function makeMockEvaluativeUncertaintyAiPayload() {
  return {
    variant: "uncertainty",
    title: "Market Expansion Bet",
    scenario:
      "Your startup is deciding whether to enter a new international market this " +
      "quarter or wait six months to gather more data. Both paths carry real financial " +
      "risk and opportunity cost.",
    options: [
      {
        id: "o1",
        title: "Enter Market Now",
        description: "Launch immediately with the current product.",
        outcomes: [
          {
            id: "out1",
            label: "Strong adoption",
            probability: 0.4,
            payoff: 500000,
            explanation: "Early-mover advantage captures a large user base.",
          },
          {
            id: "out2",
            label: "Weak adoption",
            probability: 0.6,
            payoff: -100000,
            explanation: "Localization gaps drive users to established competitors.",
          },
        ],
      },
      {
        id: "o2",
        title: "Wait 6 Months",
        description: "Delay launch to run further localization research.",
        outcomes: [
          {
            id: "out3",
            label: "Improved product-market fit",
            probability: 0.7,
            payoff: 200000,
            explanation: "Extra research reduces launch risk considerably.",
          },
          {
            id: "out4",
            label: "Competitor claims the market",
            probability: 0.3,
            payoff: -50000,
            explanation: "A rival launches first and locks in early customers.",
          },
        ],
      },
    ],
  };
}

function makeMockStandaloneSystemsPayload() {
  return {
    title: "Cloud Infrastructure Dependencies",
    scenario:
      "A SaaS company's infrastructure spans multiple cloud providers. " +
      "Recent latency spikes have revealed hidden dependencies between services " +
      "that the team didn't fully map during the initial architecture review.",
    nodes: [
      { id: "node_1", label: "API Gateway", description: "Routes all client requests", x: 50, y: 15 },
      { id: "node_2", label: "Auth Service", description: "Handles authentication", x: 20, y: 35 },
      { id: "node_3", label: "Data Store", description: "Primary database cluster", x: 80, y: 35 },
      { id: "node_4", label: "Cache Layer", description: "Redis for hot data", x: 20, y: 65 },
      { id: "node_5", label: "Message Queue", description: "Async job processing", x: 80, y: 65 },
      { id: "node_6", label: "CDN", description: "Edge content delivery", x: 50, y: 85 },
    ],
    intendedConnections: [
      { from: "node_1", to: "node_2", type: "depends_on", explanation: "Auth required for API calls." },
      { from: "node_1", to: "node_3", type: "depends_on", explanation: "Reads from primary store." },
      { from: "node_4", to: "node_3", type: "enables", explanation: "Cache reduces DB load." },
      { from: "node_5", to: "node_3", type: "depends_on", explanation: "Jobs write to DB." },
    ],
    shockEvent: {
      description: "The primary database cluster experiences a cascading failover during peak traffic",
      directlyAffected: ["node_3", "node_5"],
      indirectlyAffected: ["node_1", "node_4"],
      explanation: "DB failure breaks writes and cache invalidation cascades upstream.",
    },
  };
}

function makeMockSystemsResiliencePayload() {
  return {
    title: "Regional Power Grid Resilience",
    scenario:
      "A regional utility operator relies on an aging grid where a handful of " +
      "components quietly hold everything together. Planners want to know whether " +
      "the team can spot the single points of failure before a storm proves it the hard way.",
    variantKind: "resilience",
    nodes: [
      { id: "node_1", label: "Substation", description: "Steps down transmission voltage", x: 50, y: 15 },
      { id: "node_2", label: "Control Room", description: "Coordinates grid operations", x: 20, y: 35 },
      { id: "node_3", label: "Transformer Bank", description: "Regulates local distribution", x: 80, y: 35 },
      { id: "node_4", label: "Backup Generator", description: "Emergency power reserve", x: 20, y: 65 },
      { id: "node_5", label: "Grid Sensors", description: "Monitors load and faults", x: 80, y: 65 },
      { id: "node_6", label: "Load Balancer", description: "Shifts demand across feeders", x: 50, y: 85 },
    ],
    intendedConnections: [
      { from: "node_1", to: "node_3", type: "enables", explanation: "Substation feeds the transformer bank." },
      { from: "node_2", to: "node_1", type: "depends_on", explanation: "Control room commands the substation." },
      { from: "node_5", to: "node_2", type: "enables", explanation: "Sensors inform control room decisions." },
      { from: "node_2", to: "node_5", type: "depends_on", explanation: "Control room relies on sensor feeds." },
      { from: "node_4", to: "node_3", type: "risks", explanation: "Generator strain can overload the bank." },
      { from: "node_6", to: "node_3", type: "depends_on", explanation: "Load balancing needs the transformer bank." },
    ],
    criticalityGroundTruth: [
      { nodeId: "node_1", criticalityRank: 1, rationale: "Every downstream node depends on this substation." },
      { nodeId: "node_2", criticalityRank: 3, rationale: "Central coordinator, but has sensor redundancy." },
      { nodeId: "node_3", criticalityRank: 2, rationale: "Distribution hub feeding most local nodes." },
      { nodeId: "node_4", criticalityRank: 5, rationale: "Backup only, limited blast radius." },
      { nodeId: "node_5", criticalityRank: 4, rationale: "Important feedback loop, but not structural." },
      { nodeId: "node_6", criticalityRank: 6, rationale: "Leaf node with the least downstream impact." },
    ],
    shockEvent: {
      description: "A lightning strike takes the substation offline during peak demand",
      directlyAffected: ["node_1"],
      indirectlyAffected: ["node_2", "node_3"],
      explanation: "Losing the substation starves the transformer bank and blinds the control room.",
    },
    secondShockEvent: {
      description: "With the transformer bank already degraded, a second cold front spikes demand",
      directlyAffected: ["node_3"],
      indirectlyAffected: ["node_6"],
      explanation: "The already-strained transformer bank cascades into load-balancing failures.",
    },
  };
}

/** A small life situation; `n` ways to respond (3 at Guided, 4 otherwise). r2 is the best. */
export function makeMockJudgmentPayload(n: 3 | 4) {
  const responses = [
    { id: "r1", text: "Argue back in the meeting.", expertRank: n, why: "Public and defensive." },
    { id: "r2", text: "Talk to the manager in private after the meeting.", expertRank: 1, why: "Saves face and fixes the record." },
    { id: "r3", text: "Say nothing and fix it quietly.", expertRank: 2, why: "Calm, but the cause stays hidden." },
    { id: "r4", text: "Complain to coworkers.", expertRank: 3, why: "Spreads blame." },
  ].slice(0, n);
  return {
    title: "Criticized in a meeting",
    scenario: "Your manager calls your report careless in front of everyone. One number came from another team.",
    concepts: [
      { term: "Saving face", plain: "Keeping respect in front of others.", example: "Correct a relative in private." },
      { term: "Circle of control", plain: "Focus on what you can change.", example: "You cannot stop rain, but you can bring an umbrella." },
      { term: "Cooling off", plain: "Wait until feelings calm down.", example: "Reply to an angry message tomorrow." },
    ],
    conceptChecks: [
      { question: "Why talk in private?", options: ["To win", "To keep respect on both sides", "To avoid work"], answerIndex: 1, explanation: "Private talks let both sides keep face." },
    ],
    lensQuestions: [
      { lens: "think", question: "What is the real problem?", options: ["The wrong number", "The manager", "The team"], answerIndex: 0, explanation: "Fix the number and its source." },
      { lens: "people", question: "What might the manager feel?", options: ["Bored", "Stressed about the report", "Happy"], answerIndex: 1, explanation: "Stress, not malice." },
      { lens: "steady", question: "What can you control?", options: ["Your next step", "The past", "Others' opinions"], answerIndex: 0, explanation: "Focus on what you do next." },
    ],
    responses,
  };
}

/** A food-truck price war (prisoner's dilemma): equilibrium a2|b2 (both cut). Expert adds a third choice. */
export function makeMockStrategyPayload(expert: boolean) {
  const optionsA = [
    { id: "a1", label: "Keep price" },
    { id: "a2", label: "Cut price" },
    ...(expert ? [{ id: "a3", label: "Add a free drink" }] : []),
  ];
  const cells = [
    { a: "a1", b: "b1", payoffA: 7, payoffB: 7, story: "Both keep prices and share good profits." },
    { a: "a1", b: "b2", payoffA: 1, payoffB: 10, story: "Burrito Bar cuts and steals the crowd." },
    { a: "a2", b: "b1", payoffA: 10, payoffB: 1, story: "Taco Town cuts and steals the crowd." },
    { a: "a2", b: "b2", payoffA: 3, payoffB: 3, story: "Both cut and barely profit." },
    ...(expert
      ? [
          { a: "a3", b: "b1", payoffA: 6, payoffB: 4, story: "A free drink wins some customers from a steady rival." },
          { a: "a3", b: "b2", payoffA: 2, payoffB: 6, story: "The free drink cannot beat a price cut." },
        ]
      : []),
  ];
  return {
    title: "Food truck price war",
    scenario: "Taco Town and Burrito Bar park side by side and set prices each morning without talking.",
    concepts: [
      { term: "Best reply", plain: "Your best choice given what the other side does.", example: "Bring an umbrella if rain is coming." },
      { term: "Nash equilibrium", plain: "An outcome where nobody wants to change alone.", example: "Everyone drives on the same side of the road." },
      { term: "Dominant strategy", plain: "A choice that is best whatever others do.", example: "Studying helps whatever the exam is." },
    ],
    conceptChecks: [
      { question: "What is a best reply?", options: ["Your best choice given the other's choice", "The fairest choice", "The first choice"], answerIndex: 0, explanation: "It depends on what the other side does." },
    ],
    players: [
      { id: "A", name: "Taco Town", goal: "the most profit" },
      { id: "B", name: "Burrito Bar", goal: "the most profit" },
    ],
    optionsA,
    optionsB: [
      { id: "b1", label: "Keep price" },
      { id: "b2", label: "Cut price" },
    ],
    cells,
    gameType: "prisoners_dilemma",
    insight: "Each side's best reply leads both to a worse outcome.",
  };
}
