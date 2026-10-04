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
            : /strategic competition/i.test(domain)
              ? makeMockGeoSystemsPayload()
              : makeMockStandaloneSystemsPayload();
        break;
      }
      case "strategy":
        data = makeMockStrategyPayload(body.level === "expert");
        break;
      case "judgment":
        data = makeMockJudgmentPayload(body.level === "guided" ? 3 : 4);
        break;
      case "reframe":
        if (typeof body.customScenario === "string" && /hopeless|give up on everything/i.test(body.customScenario)) {
          // The server's support reply (the model flagged the situation).
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: false, safety: "concern", error: "This needs more than an exercise" }),
          });
          return;
        }
        data = makeMockReframePayload(body.level === "guided" ? "guided" : body.level === "expert" ? "expert" : "standard");
        break;
      default:
        data = /strategic competition/i.test(domain)
          ? makeMockGeoAnalyticalPayload(body.level === "guided" ? "guided" : "full")
          : makeMockAnalyticalAiPayload(domain);
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data }),
    });
  });

  await page.route("**/api/ai/recommend-mode", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        recommendations: [
          { mode: "reframe", reason: "Mock reason: practise spotting traps in this topic." },
          { mode: "judgment", reason: "Mock reason: handle the people side." },
          { mode: "evaluative", reason: "Mock reason: weigh the options." },
          { mode: "analytical", reason: "Mock reason: not shown, ranked fourth." },
        ],
      }),
    });
  });

  await page.route("**/api/ai/domain-suggestions", async (route: Route) => {
    let mode = "";
    try {
      mode = (JSON.parse(route.request().postData() ?? "{}") as { mode?: string }).mode ?? "";
    } catch {
      // keep empty
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        suggestions: [
          { domain: "Work", subdomain: "Mock idea for " + mode + ": a harsh comment from a manager", why: "Mock why one." },
          { domain: "Family", subdomain: "Mock idea: parents push a career choice", why: "Mock why two." },
        ],
      }),
    });
  });

  await page.route("**/api/ai/deep-dive", async (route: Route) => {
    let ref = "";
    try {
      ref = (JSON.parse(route.request().postData() ?? "{}") as { ref?: string }).ref ?? "";
    } catch {
      // keep empty
    }
    const isDecoy = ref.startsWith("decoy_");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        deepDive: {
          core: isDecoy ? "Mock core: it sounds bold at first." : "Mock core: it hides the middle options.",
          examples: ["Mock case one.", "Mock case two."],
          fairer: "Mock fairer sentence.",
        },
      }),
    });
  });

  await page.route("**/api/ai/geo-strait", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        explanation: {
          summary: "Mock note: you found most of the main users.",
          points: ["Mock point one about who depends on it.", "Mock point two about the way around."],
        },
      }),
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
    if (kind === "calibration") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          text: "Mock calibration coaching.",
          structured: {
            perspectiveFormat: "coaching_v3",
            title: "How sure are you?",
            items: [{ ref: "pattern", why: "Mock why: in this set you were a little overconfident.", clue: "90% sure", nextTimeAsk: "Would I bet on this?" }],
            takeaways: ["Mock calibration takeaway: start ranges from a number that is surely too low."],
          },
        }),
      });
      return;
    }
    if (kind === "reframe") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          text: "Mock reframe coaching.",
          structured: {
            perspectiveFormat: "coaching_v3",
            title: "A comment in the meeting",
            items: [{ ref: "thought_t2", why: "Mock why: one comment does not end a job.", clue: "I will lose my job", nextTimeAsk: "What is the most likely result?" }],
            takeaways: ["Mock reframe takeaway: check the facts before the feeling."],
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

/**
 * A Reframe exercise. Guided: 4 thoughts (t4 realistic); Standard and Expert: 6
 * thoughts (t4 and t6 realistic). t2 (catastrophizing) is the one to rewrite.
 */
export function makeMockReframePayload(level: "guided" | "standard" | "expert") {
  const thoughts = [
    { id: "t1", text: "She thinks I am useless.", trap: "mind_reading", alsoAccepted: [], why: "It guesses her thoughts." },
    { id: "t2", text: "I will lose my job over this.", trap: "catastrophizing", alsoAccepted: ["fortune_telling"], why: "It jumps to the worst result." },
    { id: "t3", text: "I should never make mistakes.", trap: "should_statements", alsoAccepted: ["all_or_nothing"], why: "A rigid rule nobody can meet." },
    { id: "t4", text: "One number in my report was wrong, and I need to fix it today.", trap: "realistic", alsoAccepted: [], why: "Specific and fair, even if unpleasant." },
    ...(level === "guided"
      ? []
      : [
          { id: "t5", text: "I always mess things up.", trap: "overgeneralizing", alsoAccepted: ["labeling"], why: "One event becomes always." },
          { id: "t6", text: "My manager was stressed about the deadline too.", trap: "realistic", alsoAccepted: [], why: "A fact that explains her tone." },
        ]),
  ];
  return {
    safety: "ok",
    title: "A comment in the meeting",
    scenario: "In a team meeting, Minh's manager points out a wrong number in his report. Minh's face goes hot.",
    concepts: [
      { term: "Catastrophizing", plain: "Jumping to the worst possible result.", example: "\"One late bus and my whole day is ruined.\"" },
      { term: "Mind reading", plain: "Guessing what others think without asking.", example: "\"He did not smile, so he hates my idea.\"" },
      { term: "Realistic thought", plain: "A fair thought based on facts, even if unpleasant.", example: "\"I was late, and I will apologise.\"" },
    ],
    conceptChecks: [
      { question: "Which thought is realistic?", options: ["Everyone hates me", "I missed the deadline by a day", "Nothing ever works"], answerIndex: 1, explanation: "It states a fact, in proportion." },
    ],
    thoughts,
    rewrite: {
      thoughtId: "t2",
      question: "Which is the most balanced way to think about it?",
      options: [
        "It does not matter at all; everything is fine.",
        "One wrong number is a real mistake, but people rarely lose a job over one. I can fix it today.",
        "I am the worst person on this team.",
      ],
      answerIndex: 1,
      explanation: "It keeps the real mistake and drops the worst-case jump.",
      balancedExample: "I made a real mistake, and I can fix it today; one error rarely costs a job.",
    },
  };
}

/**
 * A geopolitics brief (PLAN-geopolitics.md G1). "guided": framing bias + missing actor
 * and 1 trap; "full": all four issue types and 2 traps. Hidden view: ASEAN neutral broker.
 */
export function makeMockGeoAnalyticalPayload(kind: "guided" | "full") {
  const s1 = "Only a neutral regional forum can keep the peace in these waters.";
  const s2 = "The plan was agreed by the region's capitals without asking fishing communities.";
  const s3 = "Because patrols increased in 2023, regional trade slowed that year.";
  const s4 = "This rivalry is identical to the Cold War between two closed blocs.";
  const t1 = "Both large powers send many ships through these sea lanes.";
  const t2 = "Several smaller states trade heavily with both large powers.";
  const issues = [
    { description: "d", type: "framing_bias", severity: "obvious", textSegment: s1, explanation: "Treats one view as the only reasonable one." },
    { description: "d", type: "missing_actor", severity: "moderate", textSegment: s2, explanation: "Fishers are affected but not heard." },
    ...(kind === "full"
      ? [
          { description: "d", type: "assumed_causation", severity: "moderate", textSegment: s3, explanation: "Sequence is not cause." },
          { description: "d", type: "analogy_misuse", severity: "subtle", textSegment: s4, explanation: "Today's economies are tied together." },
        ]
      : []),
  ];
  const passage = kind === "full" ? `${s1} ${s2}\n\n${s3} ${s4} ${t1} ${t2}` : `${s1} ${s2}\n\n${t1}`;
  return {
    title: "Rivals at sea",
    passage,
    embeddedIssues: issues,
    validPoints: kind === "full" ? [{ textSegment: t1, explanation: "Well documented." }, { textSegment: t2, explanation: "Trade data show it." }] : [{ textSegment: t1, explanation: "Well documented." }],
    hiddenPerspective: "ASEAN neutral broker framing",
    missingActors: ["Fishing communities"],
    concepts: [
      { term: "Hedging", plain: "Keeping ties with both rivals.", example: "Buying from two suppliers." },
      { term: "Chokepoint", plain: "A narrow route many ships must use.", example: "The Strait of Malacca." },
      { term: "Framing", plain: "Making one view look normal.", example: "Calling a tax 'relief'." },
    ],
    conceptChecks: [{ question: "What is hedging?", options: ["Keeping ties with both rivals", "Picking one side", "Leaving the region"], answerIndex: 0, explanation: "Small states often hedge." }],
    perspectiveOptions: ["US-aligned think tank", "ASEAN neutral broker framing", "Chinese state-media framing", "Russian security narrative"],
    actorCandidates: ["Fishing communities", "Regional capitals", "Large powers", "Shipping firms"],
    lensQuestions: [
      { lens: "realist", question: "What does a realist see?", options: ["A contest for control of sea lanes", "A chance for shared rules", "A clash of memories"], answerIndex: 0, explanation: "Power and security first." },
      { lens: "liberal", question: "What does a liberal see?", options: ["A contest for control", "Room for a rules-based forum", "Who earns from shipping"], answerIndex: 1, explanation: "Institutions can hold it together." },
      { lens: "constructivist", question: "What does a constructivist see?", options: ["Profits", "Ship counts", "How each side's story of the past shapes trust"], answerIndex: 2, explanation: "Identity and narrative." },
      { lens: "political_economy", question: "What does political economy see?", options: ["Who gains from trade routes and who pays", "National pride", "Treaty texts"], answerIndex: 0, explanation: "Follow the money." },
    ],
  };
}

/** A two-perspective geopolitics system: from B's view the shock hits node_2 and node_4 directly. */
export function makeMockGeoSystemsPayload() {
  const base = makeMockStandaloneSystemsPayload() as Record<string, unknown> & {
    nodes: { id: string }[];
    intendedConnections: unknown[];
    shockEvent: Record<string, unknown>;
  };
  return {
    ...base,
    perspectiveAName: "Country A",
    perspectiveBName: "Country B",
    intendedConnectionsB: base.intendedConnections,
    shockEventB: { directlyAffected: ["node_2", "node_4"], indirectlyAffected: ["node_1"], explanation: "B depends on other routes." },
  };
}
