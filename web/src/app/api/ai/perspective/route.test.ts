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
  return new Request("http://localhost/api/ai/perspective", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

describe("POST /api/ai/perspective - common", () => {
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

  it("returns 400 for invalid JSON", async () => {
    authOk();
    const req = new Request("http://localhost", { method: "POST", body: "bad" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/ai/perspective - analytical", () => {
  it("returns 400 when required fields are missing", async () => {
    authOk();
    const res = await POST(makeRequest({ kind: "analytical" }));
    expect(res.status).toBe(400);
  });

  const passage = "Sales rose after the ad, so the ad caused it. Costs fell last year.";
  const analyticalBody = {
    kind: "analytical",
    passage,
    title: "Test Title",
    domain: "tech",
    confidenceBefore: 60,
    embeddedIssues: [
      { description: "d", type: "logical_fallacy", severity: "obvious", textSegment: "so the ad caused it", explanation: "e" },
    ],
    validPoints: [{ textSegment: "Costs fell last year", explanation: "e" }],
    userHighlights: [
      { id: "h1", startOffset: 0, endOffset: 44, text: passage.slice(0, 44), tag: "logical_fallacy" },
    ],
  };
  const coaching = (items: { ref: string }[]) =>
    JSON.stringify({
      perspectiveFormat: "analytical_v3",
      title: "Test Title",
      items: items.map((it) => ({ ...it, why: "w", clue: "c", nextTimeAsk: "q?" })),
      takeaways: ["Look for causes claimed from timing alone."],
    });

  it("scores in code and returns v3 coaching on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(coaching([{ ref: "issue_1" }]));
    const res = await POST(makeRequest(analyticalBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.structured.perspectiveFormat).toBe("analytical_v3");
    expect(data.result).toMatchObject({ found: 1, total: 1, tagsCorrect: 1, trapsHit: 0 });
    expect(data.text).toContain('Issue: "so the ad caused it"');
    const prompt = mockGenerateRaw.mock.calls[0]![0] as string;
    expect(prompt).toContain("CORRECT - found it");
  });

  it("retries when an issue has no coaching item", async () => {
    authOk();
    mockGenerateRaw
      .mockResolvedValueOnce(coaching([{ ref: "decoy_1" }]))
      .mockResolvedValueOnce(coaching([{ ref: "issue_1" }]));
    const res = await POST(makeRequest(analyticalBody));
    expect(res.status).toBe(200);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(2);
    expect(mockGenerateRaw.mock.calls[1]![0]).toContain("items missing for refs: issue_1");
  });

  it("retries on parse failure then returns 500 if still invalid", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue("not json");
    const res = await POST(
      makeRequest({
        kind: "analytical",
        passage: "text",
        title: "T",
        domain: "tech",
        confidenceBefore: 50,
      }),
    );
    expect(res.status).toBe(500);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(2);
  });
});

describe("POST /api/ai/perspective - systems", () => {
  const coachingJson = (refs: string[], metaNote?: string) =>
    JSON.stringify({
      perspectiveFormat: "coaching_v3",
      title: "Sys Title",
      items: refs.map((ref) => ({ ref, why: "w", clue: "c", nextTimeAsk: "q?" })),
      takeaways: ["Follow the arrows from the shock."],
      ...(metaNote ? { metaNote } : {}),
    });
  const base = {
    kind: "systems",
    title: "Sys Title",
    scenario: "Sys Scenario",
    domain: "tech",
    confidenceBefore: 65,
    nodes: [
      { id: "n1", label: "Supply", description: "desc" },
      { id: "n2", label: "Price", description: "desc" },
    ],
    intendedConnections: [{ from: "n1", to: "n2", type: "enables", explanation: "e" }],
    shockEvent: { description: "shock", directlyAffected: ["n1"], indirectlyAffected: ["n2"], explanation: "why" },
    userEdges: [{ id: "e1", source: "n2", target: "n1", type: "enables" }],
    nodeImpact: { n1: "direct", n2: "none" },
  };

  it("returns 400 when required fields are missing", async () => {
    authOk();
    const res = await POST(makeRequest({ kind: "systems", title: "T" }));
    expect(res.status).toBe(400);
  });

  it("scores in code and returns coaching with the result", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(coachingJson(["node_n2", "conn_1"]));
    const res = await POST(makeRequest(base));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.structured.perspectiveFormat).toBe("coaching_v3");
    expect(data.result).toMatchObject({ connectionsFound: 1, connectionsExact: 0, impactsCorrect: 1, impactsTotal: 2 });
    expect(data.text).toContain("Connection: Supply -> Price");
    const prompt = mockGenerateRaw.mock.calls[0]![0] as string;
    expect(prompt).toContain("FOUND BUT REVERSED");
    expect(prompt).toContain("DIFFERENT - marked not affected; the model says indirectly affected.");
    expect(prompt).not.toContain("remediationAlternative");
  });

  it("retries when a wrongly marked node has no item", async () => {
    authOk();
    mockGenerateRaw
      .mockResolvedValueOnce(coachingJson(["conn_1"]))
      .mockResolvedValueOnce(coachingJson(["node_n2", "conn_1"]));
    const res = await POST(makeRequest(base));
    expect(res.status).toBe(200);
    expect(mockGenerateRaw.mock.calls[1]![0]).toContain("items missing for refs: node_n2");
  });

  it("asks for a metaNote on resilience exercises", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(coachingJson(["node_n2", "conn_1"], "Supply was under-rated."));
    const res = await POST(
      makeRequest({
        ...base,
        variantKind: "resilience",
        criticalityGroundTruth: [
          { nodeId: "n1", criticalityRank: 1, rationale: "hub" },
          { nodeId: "n2", criticalityRank: 2, rationale: "leaf" },
        ],
        userCriticalityRanking: { n1: 2, n2: 1 },
        secondShockEvent: { description: "cascade", directlyAffected: ["n2"], indirectlyAffected: [], explanation: "cascades from n2" },
      }),
    );
    expect(res.status).toBe(200);
    const prompt = mockGenerateRaw.mock.calls[0]![0] as string;
    expect(prompt).toContain("RESILIENCE (criticality and cascade)");
    expect(prompt).toContain("cascades from n2");
    expect(prompt).toContain('"metaNote": string');
  });

  it("omits the resilience block otherwise", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(coachingJson(["node_n2", "conn_1"]));
    await POST(makeRequest(base));
    expect(mockGenerateRaw.mock.calls[0]![0]).not.toContain("RESILIENCE");
  });
});

describe("POST /api/ai/perspective - evaluative-matrix", () => {
  it("returns 400 when exercise variant is wrong", async () => {
    authOk();
    const res = await POST(
      makeRequest({
        kind: "evaluative-matrix",
        title: "T",
        domain: "d",
        confidenceBefore: 50,
        exercise: { type: "evaluative", variant: "scoring" },
      }),
    );
    expect(res.status).toBe(400);
  });

  const coaching = (refs: string[], metaNote?: string) =>
    JSON.stringify({
      perspectiveFormat: "coaching_v3",
      title: "Eval Title",
      items: refs.map((ref) => ({ ref, why: "w", clue: "c", nextTimeAsk: "q?" })),
      takeaways: ["Check both axes for each option."],
      ...(metaNote ? { metaNote } : {}),
    });
  const matrixExercise = {
    type: "evaluative",
    variant: "matrix",
    scenario: "scenario",
    axisX: { label: "Cost", lowLabel: "Low", highLabel: "High" },
    axisY: { label: "Value", lowLabel: "Low", highLabel: "High" },
    options: [
      { id: "o1", title: "Cloud", description: "d", intendedQuadrant: "top-right", explanation: "why" },
      { id: "o2", title: "On-prem", description: "d", intendedQuadrant: "bottom-left", explanation: "why" },
    ],
    placements: { o1: "top-right", o2: "top-left" },
  };

  it("scores matrix placements in code and returns coaching", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(coaching(["option_o2"]));
    const res = await POST(
      makeRequest({ kind: "evaluative-matrix", title: "Eval Title", domain: "tech", confidenceBefore: 55, exercise: matrixExercise }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.structured.perspectiveFormat).toBe("coaching_v3");
    expect(data.result).toMatchObject({ variant: "matrix", correct: 1, total: 2 });
    expect(data.text).toContain("Option: On-prem");
    const prompt = mockGenerateRaw.mock.calls[0]![0] as string;
    expect(prompt).toContain("ONE AXIS RIGHT - placed in top-left (Cost: Low, Value: High); the model puts it in bottom-left (Cost: Low, Value: Low).");
    expect(prompt).not.toContain("Clarity Blueprint");
  });

  it("requires a metaNote for scoring tables", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(coaching(["criterion_c1"]));
    const res = await POST(
      makeRequest({
        kind: "evaluative-scoring",
        title: "Eval Title",
        domain: "tech",
        confidenceBefore: 55,
        exercise: {
          type: "evaluative",
          variant: "scoring",
          scenario: "s",
          criteria: [{ id: "c1", label: "Cost", description: "d", suggestedWeight: 1 }],
          options: [{ id: "a", title: "A", description: "d", suggestedScores: { c1: 2 }, explanation: "e" }],
          hiddenCriteria: [],
          criterionWeights: { c1: 5 },
          scores: { a: { c1: 5 } },
        },
      }),
    );
    // Both tries lack the note, so the request fails after the retry.
    expect(res.status).toBe(500);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(2);
    expect(mockGenerateRaw.mock.calls[0]![0]).toContain("BIG WEIGHT GAP - user 5/5, model 1/5 (user weighted it higher).");
  });
});

