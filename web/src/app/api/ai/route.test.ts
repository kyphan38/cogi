import { describe, expect, it, vi, beforeEach } from "vitest";
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

function validAnalyticalJson() {
  return JSON.stringify({
    title: "Test Exercise",
    passage: "A passage about reasoning and logic.",
    embeddedIssues: [
      {
        description: "A bias issue",
        type: "bias",
        severity: "moderate",
        textSegment: "reasoning",
        explanation: "Explanation",
      },
    ],
    validPoints: [{ textSegment: "logic", explanation: "why" }],
  });
}

function validSequentialJson() {
  return JSON.stringify({
    title: "Sequential Exercise",
    scenario: "A crisis scenario",
    steps: Array.from({ length: 6 }, (_, i) => ({
      id: `s${i + 1}`,
      text: `Step ${i + 1}`,
      correctPosition: i,
      dependencies: i > 0 ? [`s${i}`] : [],
      isFlexible: false,
      explanation: `Step ${i + 1} explanation`,
    })),
    criticalErrors: [{ description: "Error 1", severity: "catastrophic" }],
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

function validGenerativeJson() {
  return JSON.stringify({
    title: "Generative Exercise",
    scenario: "Write about technology.",
    prompts: [
      { id: "p1", question: "Question 1?", draftText: "Draft text for p1." },
      { id: "p2", question: "Question 2?", draftText: "Draft text for p2." },
      { id: "p3", question: "Question 3?", draftText: "Draft text for p3." },
      { id: "p4", question: "Question 4?", draftText: "Draft text for p4." },
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

describe("POST /api/ai - sequential", () => {
  it("returns parsed exercise on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validSequentialJson());
    const res = await POST(
      makeRequest({ domain: "tech", exerciseType: "sequential" }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.title).toBe("Sequential Exercise");
  });

  it("returns 422 when model returns invalid JSON", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue("not valid json");
    const res = await POST(
      makeRequest({ domain: "tech", exerciseType: "sequential" }),
    );
    expect(res.status).toBe(422);
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
});

describe("POST /api/ai - generative", () => {
  it("returns 400 when generativeStage is missing", async () => {
    authOk();
    const res = await POST(
      makeRequest({ domain: "tech", exerciseType: "generative" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/generativeStage/);
  });

  it("returns parsed exercise on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validGenerativeJson());
    const res = await POST(
      makeRequest({
        domain: "tech",
        exerciseType: "generative",
        generativeStage: "edit",
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
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
});

describe("POST /api/ai - analytical generated", () => {
  it("returns parsed exercise on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(validAnalyticalJson());
    const res = await POST(makeRequest({ domain: "tech" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.title).toBe("Test Exercise");
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
        userText: "A test passage for analysis.",
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.passage).toBe("A test passage for analysis.");
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
