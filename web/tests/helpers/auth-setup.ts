import { type Page, type Route } from "@playwright/test";
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

/**
 * Stub AI and backend API endpoints so pages render without a live server.
 */
export async function stubFirestoreReads(page: Page): Promise<void> {
  await page.route("**/api/ai/combo", async (route: Route) => {
    const body = JSON.parse(
      (await route.request().postData()) ?? "{}",
    ) as { preset?: string };
    const preset = body.preset ?? "full_analysis";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: makeMockComboBundle(preset) }),
    });
  });

  await page.route("**/api/ai/journal-ref", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, line: null }),
    });
  });

  await page.route("**/api/ai", async (route: Route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    let domain = "Testing";
    try {
      const body = JSON.parse((await route.request().postData()) ?? "{}") as {
        domain?: string;
      };
      domain = body.domain ?? domain;
    } catch {
      // use default domain
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: makeMockAnalyticalAiPayload(domain),
      }),
    });
  });

  await page.route("**/api/ai/weekly-review", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, markdown: "Mock weekly review." }),
    });
  });

  await page.route("**/api/ai/perspective", async (route: Route) => {
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

  await page.route("**/api/ai/recall-feedback", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
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
// Mock combo bundle data
// ---------------------------------------------------------------------------

const SHARED_SCENARIO =
  "A mid-size e-commerce company is evaluating whether to migrate their monolithic " +
  "application to microservices. The CTO argues this will improve scalability and " +
  "developer velocity, but the VP of Engineering warns about operational complexity " +
  "and the risk of distributed system failures. Recent outages have been traced to " +
  "database contention, which could be solved by either approach. The team has limited " +
  "experience with container orchestration, and the migration timeline conflicts with " +
  "a major product launch scheduled for Q3.";

function makeMockComboBundle(preset: string) {
  if (preset === "decision_sprint") return decisionSprintBundle();
  if (preset === "root_cause") return rootCauseBundle();
  return fullAnalysisBundle();
}

function fullAnalysisBundle() {
  return {
    preset: "full_analysis",
    sharedTitle: "Microservices Migration Analysis",
    sharedScenario: SHARED_SCENARIO,
    analytical: {
      title: "CTO vs VP Arguments",
      passage: SHARED_SCENARIO,
      embeddedIssues: [
        {
          description: "False dichotomy in architectural choices",
          type: "logical_fallacy",
          severity: "moderate",
          textSegment: "migrate their monolithic application to microservices",
          explanation: "Presents only two extremes.",
        },
        {
          description: "Unexamined assumption about velocity gains",
          type: "hidden_assumption",
          severity: "subtle",
          textSegment: "improve scalability and developer velocity",
          explanation: "Microservices can slow small teams.",
        },
      ],
      validPoints: [
        {
          textSegment: "Recent outages have been traced to database contention",
          explanation: "Data-driven observation.",
        },
      ],
    },
    systems: makeSystemsPayload(
      "Migration Impact Map",
      [
        { id: "node_1", label: "Monolith", description: "Current single-process app", x: 15, y: 25 },
        { id: "node_2", label: "Database", description: "PostgreSQL with contention", x: 50, y: 15 },
        { id: "node_3", label: "Dev Team", description: "Limited k8s skills", x: 85, y: 25 },
        { id: "node_4", label: "CI/CD Pipeline", description: "Build and deploy automation", x: 15, y: 75 },
        { id: "node_5", label: "Product Launch", description: "Q3 revenue-critical release", x: 50, y: 85 },
        { id: "node_6", label: "Infra Cost", description: "Cloud compute and ops spend", x: 85, y: 75 },
      ],
      {
        description: "Key architect leaves the company mid-migration",
        directlyAffected: ["node_3", "node_4"],
        indirectlyAffected: ["node_5", "node_6"],
        explanation: "Knowledge loss cascades into delivery delays.",
      },
    ),
    evaluativeMatrix: makeMatrixPayload("Migration Strategy Evaluation"),
  };
}

function decisionSprintBundle() {
  return {
    preset: "decision_sprint",
    sharedTitle: "Microservices Migration Decision",
    sharedScenario: SHARED_SCENARIO,
    evaluativeMatrix: {
      variant: "matrix",
      title: "Migration Strategy Matrix",
      scenario: SHARED_SCENARIO,
      axisX: { label: "Implementation Risk", lowLabel: "Low Risk", highLabel: "High Risk" },
      axisY: { label: "Business Impact", lowLabel: "Low Impact", highLabel: "High Impact" },
      options: [
        { id: "opt-1", title: "Full microservices migration", description: "Complete rewrite.", intendedQuadrant: "top-right", explanation: "High impact, high risk." },
        { id: "opt-2", title: "Strangler fig pattern", description: "Gradual extraction.", intendedQuadrant: "top-left", explanation: "High impact, managed risk." },
        { id: "opt-3", title: "Database sharding only", description: "Fix DB contention.", intendedQuadrant: "bottom-left", explanation: "Low risk, limited value." },
        { id: "opt-4", title: "Modular monolith refactor", description: "Restructure internally.", intendedQuadrant: "bottom-right", explanation: "Moderate all around." },
      ],
    },
    generative: {
      title: "Migration Decision Analysis",
      scenario: SHARED_SCENARIO,
      prompts: [
        { id: "gen-1", question: "What are the key risks of proceeding before Q3?", draftText: "", hints: ["Team experience", "Timeline pressure"], spareHint: "What if launch slips?" },
        { id: "gen-2", question: "How would you sequence the migration?", draftText: "", hints: ["Start with least coupled service"], spareHint: "Rollback strategies." },
        { id: "gen-3", question: "What metrics would you track?", draftText: "", hints: ["Latency, error rates"], spareHint: "Developer satisfaction." },
      ],
    },
  };
}

function rootCauseBundle() {
  return {
    preset: "root_cause",
    sharedTitle: "Root Cause: E-commerce Outages",
    sharedScenario: SHARED_SCENARIO,
    sequential: {
      title: "Outage Investigation Sequence",
      scenario: SHARED_SCENARIO,
      steps: [
        { id: "seq-1", text: "Identify the database contention pattern from logs", correctPosition: 1, dependencies: [], isFlexible: false, explanation: "Start with root symptom." },
        { id: "seq-2", text: "Map which services contribute most to write locks", correctPosition: 2, dependencies: ["seq-1"], isFlexible: false, explanation: "Need log data first." },
        { id: "seq-3", text: "Evaluate query optimization vs schema redesign", correctPosition: 3, dependencies: ["seq-2"], isFlexible: true, explanation: "Depends on knowing contributors." },
        { id: "seq-4", text: "Implement read replicas for high-read services", correctPosition: 4, dependencies: ["seq-3"], isFlexible: true, explanation: "Follows analysis." },
      ],
      criticalErrors: [
        { description: "Implementing solutions before identifying root cause", severity: "catastrophic" },
      ],
    },
    systems: makeSystemsPayload(
      "System Dependencies Map",
      [
        { id: "node_1", label: "User Traffic", description: "Incoming API requests", x: 20, y: 20 },
        { id: "node_2", label: "API Gateway", description: "Routes to backend services", x: 50, y: 20 },
        { id: "node_3", label: "Product Service", description: "Catalog and inventory", x: 20, y: 50 },
        { id: "node_4", label: "Order Service", description: "Purchases and payments", x: 50, y: 50 },
        { id: "node_5", label: "Database", description: "PostgreSQL with write locks", x: 80, y: 50 },
        { id: "node_6", label: "Cache Layer", description: "Redis for hot product data", x: 80, y: 20 },
      ],
      {
        description: "Black Friday traffic spike causes 10x normal load",
        directlyAffected: ["node_5", "node_4"],
        indirectlyAffected: ["node_3", "node_2"],
        explanation: "Database contention cascades upstream.",
      },
    ),
    analytical: {
      title: "CTO vs VP Analysis",
      passage: SHARED_SCENARIO,
      embeddedIssues: [
        { description: "False dichotomy", type: "logical_fallacy", severity: "moderate", textSegment: "migrate their monolithic application to microservices", explanation: "Only two options shown." },
        { description: "Assumed velocity gain", type: "hidden_assumption", severity: "subtle", textSegment: "improve scalability and developer velocity", explanation: "Not automatic." },
      ],
      validPoints: [
        { textSegment: "Recent outages have been traced to database contention", explanation: "Empirical root cause." },
      ],
    },
  };
}

function makeSystemsPayload(
  title: string,
  nodes: { id: string; label: string; description: string; x: number; y: number }[],
  shockEvent: { description: string; directlyAffected: string[]; indirectlyAffected: string[]; explanation: string },
) {
  return {
    title,
    scenario: SHARED_SCENARIO,
    nodes,
    intendedConnections: [
      { from: nodes[0]!.id, to: nodes[1]!.id, type: "depends_on", explanation: "Primary dependency." },
      { from: nodes[2]!.id, to: nodes[4]!.id, type: "depends_on", explanation: "Service depends on DB." },
    ],
    shockEvent,
  };
}

function makeMatrixPayload(title: string) {
  return {
    variant: "matrix",
    title,
    scenario: SHARED_SCENARIO,
    axisX: { label: "Risk Level", lowLabel: "Low Risk", highLabel: "High Risk" },
    axisY: { label: "Strategic Value", lowLabel: "Low Value", highLabel: "High Value" },
    options: [
      { id: "opt-1", title: "Full microservices rewrite", description: "Complete decomposition.", intendedQuadrant: "top-right", explanation: "Max value, max risk." },
      { id: "opt-2", title: "Strangler fig migration", description: "Incremental extraction.", intendedQuadrant: "top-left", explanation: "High value, controlled risk." },
      { id: "opt-3", title: "Database-only fix", description: "Sharding and read replicas.", intendedQuadrant: "bottom-left", explanation: "Low risk, low value." },
      { id: "opt-4", title: "Modular monolith", description: "Internal modularisation.", intendedQuadrant: "bottom-right", explanation: "Moderate all around." },
    ],
  };
}

export { makeMockComboBundle };
