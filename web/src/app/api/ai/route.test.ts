import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

const mockRequireAuth = vi.fn();
vi.mock("@/lib/auth/server-route-auth", () => ({
  requireAuthenticatedRouteUser: (...a: unknown[]) => mockRequireAuth(...a),
}));

const mockGenerateRaw = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  generateAnalyticalExerciseRaw: (...a: unknown[]) => mockGenerateRaw(...a),
}));

import { POST } from "./route";

function authOk() {
  mockRequireAuth.mockResolvedValue({
    ok: true,
    user: { uid: "uid1", email: "a@b.com" },
    idToken: "tok",
  });
}

function authFail() {
  mockRequireAuth.mockResolvedValue({
    ok: false,
    response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
  });
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ANALYTICAL_PASSAGE =
  "Sales rose after the ad, so the ad caused it. Everyone agrees with the plan. The survey had ten people. Our team is the best choice. Costs fell last year. The market is growing.";

function validAnalyticalJson(passage = ANALYTICAL_PASSAGE) {
  return JSON.stringify({
    title: "Test Exercise",
    passage,
    embeddedIssues: [
      { description: "d", type: "logical_fallacy", severity: "obvious", textSegment: "so the ad caused it", explanation: "e" },
      { description: "d", type: "hidden_assumption", severity: "moderate", textSegment: "Everyone agrees with the plan", explanation: "e" },
      { description: "d", type: "weak_evidence", severity: "moderate", textSegment: "The survey had ten people", explanation: "e" },
      { description: "d", type: "bias", severity: "subtle", textSegment: "Our team is the best choice", explanation: "e" },
    ],
    validPoints: [
      { textSegment: "Costs fell last year", explanation: "why" },
      { textSegment: "The market is growing", explanation: "why" },
    ],
  });
}

function validEvaluativeJson() {
  return JSON.stringify({
    variant: "matrix",
    title: "Evaluative Exercise",
    scenario: "A decision scenario",
    axisX: { label: "Impact", lowLabel: "Low", highLabel: "High" },
    axisY: { label: "Effort", lowLabel: "Low", highLabel: "High" },
    options: [
      { id: "o1", title: "Option 1", description: "Desc 1", intendedQuadrant: "top-right", explanation: "why 1" },
      { id: "o2", title: "Option 2", description: "Desc 2", intendedQuadrant: "bottom-left", explanation: "why 2" },
      { id: "o3", title: "Option 3", description: "Desc 3", intendedQuadrant: "top-left", explanation: "why 3" },
      { id: "o4", title: "Option 4", description: "Desc 4", intendedQuadrant: "bottom-right", explanation: "why 4" },
    ],
  });
}

function validSystemsJson() {
  return JSON.stringify({
    title: "Systems Exercise",
    scenario: "A systems scenario",
    nodes: [
      { id: "node_1", label: "Node 1", description: "desc 1", x: 20, y: 20 },
      { id: "node_2", label: "Node 2", description: "desc 2", x: 40, y: 20 },
      { id: "node_3", label: "Node 3", description: "desc 3", x: 60, y: 20 },
      { id: "node_4", label: "Node 4", description: "desc 4", x: 20, y: 60 },
      { id: "node_5", label: "Node 5", description: "desc 5", x: 40, y: 60 },
      { id: "node_6", label: "Node 6", description: "desc 6", x: 60, y: 60 },
    ],
    componentCandidates: [
      "Node 1", "Node 2", "Node 3", "Node 4", "Node 5", "Node 6",
      "Distractor A", "Distractor B", "Distractor C",
    ],
    intendedConnections: [
      { from: "node_1", to: "node_2", type: "depends_on", explanation: "why" },
    ],
    shockEvent: {
      description: "A shock event",
      directlyAffected: ["node_1"],
      indirectlyAffected: ["node_2"],
      explanation: "why",
    },
  });
}

function validGeopoliticsSystemsJson() {
  return JSON.stringify({
    title: "Geopolitics Systems Exercise",
    scenario: "A geopolitical systems scenario",
    nodes: [
      { id: "node_1", label: "Node 1", description: "desc 1", x: 20, y: 20 },
      { id: "node_2", label: "Node 2", description: "desc 2", x: 40, y: 20 },
      { id: "node_3", label: "Node 3", description: "desc 3", x: 60, y: 20 },
      { id: "node_4", label: "Node 4", description: "desc 4", x: 20, y: 60 },
      { id: "node_5", label: "Node 5", description: "desc 5", x: 40, y: 60 },
      { id: "node_6", label: "Node 6", description: "desc 6", x: 60, y: 60 },
    ],
    componentCandidates: [
      "Node 1", "Node 2", "Node 3", "Node 4", "Node 5", "Node 6",
      "Distractor A", "Distractor B", "Distractor C",
    ],
    intendedConnections: [
      { from: "node_1", to: "node_2", type: "depends_on", explanation: "why" },
      { from: "node_2", to: "node_1", type: "enables", explanation: "cycle" },
    ],
    shockEvent: {
      description: "A shock event",
      directlyAffected: ["node_1"],
      indirectlyAffected: ["node_2"],
      explanation: "why",
    },
    perspectiveAName: "United States",
    perspectiveBName: "China",
    intendedConnectionsB: [
      { from: "node_3", to: "node_4", type: "risks", explanation: "why B" },
      { from: "node_4", to: "node_3", type: "depends_on", explanation: "cycle B" },
    ],
    shockEventB: {
      directlyAffected: ["node_3"],
      indirectlyAffected: ["node_4"],
      explanation: "why B",
    },
  });
}

function validResilienceSystemsJson() {
  return JSON.stringify({
    title: "Resilience Systems Exercise",
    scenario: "A resilience systems scenario",
    variantKind: "resilience",
    nodes: [
      { id: "node_1", label: "Node 1", description: "desc 1", x: 20, y: 20 },
      { id: "node_2", label: "Node 2", description: "desc 2", x: 40, y: 20 },
      { id: "node_3", label: "Node 3", description: "desc 3", x: 60, y: 20 },
      { id: "node_4", label: "Node 4", description: "desc 4", x: 20, y: 60 },
      { id: "node_5", label: "Node 5", description: "desc 5", x: 40, y: 60 },
      { id: "node_6", label: "Node 6", description: "desc 6", x: 60, y: 60 },
    ],
    componentCandidates: [
      "Node 1", "Node 2", "Node 3", "Node 4", "Node 5", "Node 6",
      "Distractor A", "Distractor B", "Distractor C",
    ],
    intendedConnections: [
      { from: "node_1", to: "node_2", type: "depends_on", explanation: "why" },
    ],
    criticalityGroundTruth: [
      { nodeId: "node_1", criticalityRank: 1, rationale: "hub" },
      { nodeId: "node_2", criticalityRank: 2, rationale: "r2" },
      { nodeId: "node_3", criticalityRank: 3, rationale: "r3" },
      { nodeId: "node_4", criticalityRank: 4, rationale: "r4" },
      { nodeId: "node_5", criticalityRank: 5, rationale: "r5" },
      { nodeId: "node_6", criticalityRank: 6, rationale: "r6" },
    ],
    shockEvent: {
      description: "A shock event",
      directlyAffected: ["node_1"],
      indirectlyAffected: ["node_2"],
      explanation: "why",
    },
    secondShockEvent: {
      description: "A second, cascading shock",
      directlyAffected: ["node_2"],
      indirectlyAffected: ["node_3"],
      explanation: "cascades from node_2",
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

describe("POST /api/ai - common validation", () => {
  it("returns 401 when auth fails", async () => {
    authFail();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("returns 500 when GEMINI_API_KEY is missing", async () => {
    authOk();
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(500);
  });

  it("returns 400 for invalid JSON body", async () => {
    authOk();
    const req = new Request("http://localhost", { method: "POST", body: "bad" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is not an object", async () => {
    authOk();
    const res = await POST(makeRequest("string"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when domain and customScenario are both missing", async () => {
    authOk();
    const res = await POST(makeRequest({ exerciseType: "analytical" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/domain/);
  });

  it("returns 400 when custom_scenario mode has no customScenario", async () => {
    authOk();
    const res = await POST(
      makeRequest({ domain: "tech", mode: "custom_scenario" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/customScenario/);
  });
});

describe("POST /api/ai - evaluative", () => {
  it("returns parsed exercise on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validEvaluativeJson());
    const res = await POST(
      makeRequest({ domain: "tech", exerciseType: "evaluative" }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("retries on parse failure then returns 422 if still invalid", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue("bad json");
    const res = await POST(
      makeRequest({ domain: "tech", exerciseType: "evaluative" }),
    );
    expect(res.status).toBe(422);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(2);
  });

  it("returns 504 when Gemini times out (the SDK rejects with an AbortError)", async () => {
    authOk();
    const abort = new Error("This operation was aborted");
    abort.name = "AbortError";
    mockGenerateRaw.mockRejectedValue(abort);
    const res = await POST(makeRequest({ domain: "tech", exerciseType: "evaluative" }));
    expect(res.status).toBe(504);
    expect((await res.json()).error).toMatch(/timed out/);
  });

  it("sends a response schema that matches the task type", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validEvaluativeJson());
    await POST(
      makeRequest({ domain: "tech", exerciseType: "evaluative", evaluativeTaskType: "uncertainty" }),
    );
    const schema = mockGenerateRaw.mock.calls[0][3] as { properties: Record<string, unknown> };
    expect(schema.properties).toHaveProperty("variant");
    expect(schema.properties).not.toHaveProperty("criteria");
  });
});

describe("POST /api/ai - systems", () => {
  it("returns parsed exercise on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validSystemsJson());
    const res = await POST(
      makeRequest({ domain: "tech", exerciseType: "systems" }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("retries on parse failure", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue("invalid");
    const res = await POST(
      makeRequest({ domain: "tech", exerciseType: "systems" }),
    );
    expect(res.status).toBe(422);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(2);
  });

  it("systemsTaskType: 'geopolitics' forces the dual-perspective payload regardless of domain", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validGeopoliticsSystemsJson());
    const res = await POST(
      makeRequest({ domain: "tech", exerciseType: "systems", systemsTaskType: "geopolitics" }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.perspectiveAName).toBe("United States");
    expect(mockGenerateRaw).toHaveBeenCalledTimes(1);
    expect(mockGenerateRaw.mock.calls[0][0]).toContain("perspectiveAName");
  });

  it("systemsTaskType: 'resilience' dispatches to the resilience prompt and validator", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validResilienceSystemsJson());
    const res = await POST(
      makeRequest({ domain: "tech", exerciseType: "systems", systemsTaskType: "resilience" }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.variantKind).toBe("resilience");
    expect(data.data.criticalityGroundTruth).toHaveLength(6);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(1);
    expect(mockGenerateRaw.mock.calls[0][0]).toContain("criticalityGroundTruth");
  });

  it("retries resilience generation with the resilience retry suffix on semantic failure", async () => {
    authOk();
    const badCascade = JSON.parse(validResilienceSystemsJson());
    badCascade.secondShockEvent = {
      description: "Unrelated",
      directlyAffected: ["node_5"],
      indirectlyAffected: ["node_6"],
      explanation: "does not cascade from node_2",
    };
    mockGenerateRaw
      .mockResolvedValueOnce(JSON.stringify(badCascade))
      .mockResolvedValueOnce(validResilienceSystemsJson());
    const res = await POST(
      makeRequest({ domain: "tech", exerciseType: "systems", systemsTaskType: "resilience" }),
    );
    expect(res.status).toBe(200);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(2);
    expect(mockGenerateRaw.mock.calls[1][0]).toContain("resilience systems JSON failed validation");
  });

  it("defaults systemsTaskType to 'auto' and ignores an unknown value", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validSystemsJson());
    const res = await POST(
      makeRequest({ domain: "tech", exerciseType: "systems", systemsTaskType: "bogus" }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.variantKind).toBeUndefined();
  });
});

describe("POST /api/ai - analytical generated", () => {
  // 0.2 or above skips the sound-reasoning variant.
  let random: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    random = vi.spyOn(Math, "random").mockReturnValue(0.5);
  });
  afterEach(() => {
    random.mockRestore();
  });

  it("returns parsed exercise on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validAnalyticalJson());
    const res = await POST(makeRequest({ domain: "tech" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.title).toBe("Test Exercise");
    expect(data.data.isSoundReasoning).toBe(false);
  });

  it("rejects a passage with too few issues after the retry", async () => {
    authOk();
    const thin = JSON.parse(validAnalyticalJson());
    thin.embeddedIssues = thin.embeddedIssues.slice(0, 1);
    mockGenerateRaw.mockResolvedValue(JSON.stringify(thin));
    const res = await POST(makeRequest({ domain: "tech" }));
    expect(res.status).toBe(422);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(2);
  });

  it("guided level: asks for a short passage and a main-claim quiz, never sound reasoning", async () => {
    authOk();
    random.mockReturnValue(0.1);
    const guided = JSON.parse(validAnalyticalJson());
    guided.mainClaimQuiz = { options: ["Main claim", "A detail", "Not said"], answerIndex: 0, explanation: "e" };
    mockGenerateRaw.mockResolvedValue(JSON.stringify(guided));
    const res = await POST(makeRequest({ domain: "tech", level: "guided" }));
    expect(res.status).toBe(200);
    const data = (await res.json()).data;
    expect(data.isSoundReasoning).toBe(false);
    expect(data.mainClaimQuiz.answerIndex).toBe(0);
    const prompt = mockGenerateRaw.mock.calls[0]![0] as string;
    expect(prompt).toContain("(150-200 words)");
    expect(prompt).toContain('"mainClaimQuiz"');
  });

  it("guided level: rejects a reply without the quiz after the retry", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validAnalyticalJson());
    const res = await POST(makeRequest({ domain: "tech", level: "guided" }));
    expect(res.status).toBe(422);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(2);
  });

  it("standard level: no quiz, medium length", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validAnalyticalJson());
    const res = await POST(makeRequest({ domain: "tech", level: "standard" }));
    expect(res.status).toBe(200);
    const prompt = mockGenerateRaw.mock.calls[0]![0] as string;
    expect(prompt).toContain("(220-280 words)");
    expect(prompt).not.toContain('"mainClaimQuiz"');
  });

  it("marks the sound-reasoning variant from the request, not the model", async () => {
    authOk();
    random.mockReturnValue(0.1);
    const sound = JSON.parse(validAnalyticalJson());
    sound.embeddedIssues = [];
    mockGenerateRaw.mockResolvedValue(JSON.stringify(sound));
    const res = await POST(makeRequest({ domain: "tech" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.isSoundReasoning).toBe(true);
  });

  it("defaults exerciseType to analytical", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validAnalyticalJson());
    const res = await POST(makeRequest({ domain: "tech", exerciseType: "bogus" }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/ai - analytical real_data", () => {
  it("returns 400 when userText is missing for real_data mode", async () => {
    authOk();
    const res = await POST(
      makeRequest({ domain: "tech", mode: "real_data", exerciseType: "analytical" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/userText/);
  });

  it("returns 400 when userText exceeds 2000 words", async () => {
    authOk();
    const longText = Array(2001).fill("word").join(" ");
    const res = await POST(
      makeRequest({ domain: "tech", mode: "real_data", exerciseType: "analytical", userText: longText }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too long/);
  });

  it("returns parsed exercise with original passage on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validAnalyticalJson());
    const res = await POST(
      makeRequest({
        domain: "tech",
        mode: "real_data",
        exerciseType: "analytical",
        userText: ANALYTICAL_PASSAGE,
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.passage).toBe(ANALYTICAL_PASSAGE);
  });

  it("checks segments against the pasted text, not the model's copy of it", async () => {
    authOk();
    // The model paraphrased one sentence, so that segment is not in the user's text.
    mockGenerateRaw.mockResolvedValue(
      validAnalyticalJson(ANALYTICAL_PASSAGE.replace("Everyone agrees", "Everybody agrees")).replace(
        "Everyone agrees",
        "Everybody agrees",
      ),
    );
    const res = await POST(
      makeRequest({
        domain: "tech",
        mode: "real_data",
        exerciseType: "analytical",
        userText: ANALYTICAL_PASSAGE,
      }),
    );
    expect(res.status).toBe(422);
  });
});

describe("POST /api/ai - error handling", () => {
  it("returns 500 with error message on unexpected throw", async () => {
    authOk();
    mockGenerateRaw.mockRejectedValue(new Error("Network error"));
    const res = await POST(makeRequest({ domain: "tech" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Network error");
  });
});
