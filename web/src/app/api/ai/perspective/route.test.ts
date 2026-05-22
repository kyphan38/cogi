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

function structuredPerspectiveJson() {
  return JSON.stringify({
    embedded: [{ id: "e1", title: "Issue 1", body: "Explanation", suitableFor: "beginner" }],
    userFound: [{ id: "u1", title: "Found 1", body: "Good catch", suitableFor: "intermediate" }],
    additional: [{ id: "a1", title: "Additional 1", body: "More context", suitableFor: "advanced" }],
    openQuestions: [{ id: "o1", title: "Question 1", body: "Think about this", suitableFor: "beginner" }],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

describe("POST /api/ai/perspective — common", () => {
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

describe("POST /api/ai/perspective — analytical", () => {
  it("returns 400 when required fields are missing", async () => {
    authOk();
    const res = await POST(makeRequest({ kind: "analytical" }));
    expect(res.status).toBe(400);
  });

  it("returns structured perspective on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(structuredPerspectiveJson());
    const res = await POST(
      makeRequest({
        kind: "analytical",
        passage: "A test passage",
        title: "Test Title",
        domain: "tech",
        confidenceBefore: 60,
        embeddedIssues: [],
        validPoints: [],
        userHighlights: [],
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.structured).toBeDefined();
    expect(data.text).toBeDefined();
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

describe("POST /api/ai/perspective — sequential", () => {
  it("returns 400 when required fields are missing", async () => {
    authOk();
    const res = await POST(makeRequest({ kind: "sequential", title: "", scenario: "" }));
    expect(res.status).toBe(400);
  });

  it("returns perspective on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(structuredPerspectiveJson());
    const res = await POST(
      makeRequest({
        kind: "sequential",
        title: "Seq Title",
        scenario: "Seq Scenario",
        domain: "crisis",
        confidenceBefore: 70,
        steps: [{ id: "s1", label: "Step 1", position: 1, flexibility: "rigid" }],
        userOrderedStepIds: ["s1"],
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});

describe("POST /api/ai/perspective — systems", () => {
  it("returns 400 when required fields are missing", async () => {
    authOk();
    const res = await POST(makeRequest({ kind: "systems", title: "T" }));
    expect(res.status).toBe(400);
  });

  it("returns perspective on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(structuredPerspectiveJson());
    const res = await POST(
      makeRequest({
        kind: "systems",
        title: "Sys Title",
        scenario: "Sys Scenario",
        domain: "tech",
        confidenceBefore: 65,
        nodes: [{ id: "n1", label: "N1", description: "desc" }],
        intendedConnections: [],
        shockEvent: {
          description: "shock",
          directlyAffected: ["n1"],
          indirectlyAffected: [],
          explanation: "why",
        },
        userEdges: [],
        nodeImpact: {},
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});

describe("POST /api/ai/perspective — evaluative-matrix", () => {
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

  it("returns perspective on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(structuredPerspectiveJson());
    const res = await POST(
      makeRequest({
        kind: "evaluative-matrix",
        title: "Eval Title",
        domain: "tech",
        confidenceBefore: 55,
        exercise: {
          type: "evaluative",
          variant: "matrix",
          scenario: "scenario",
          axisX: { label: "X", lowLabel: "Low", highLabel: "High" },
          axisY: { label: "Y", lowLabel: "Low", highLabel: "High" },
          options: [
            { id: "o1", label: "Opt", correctQuadrant: "top-right", explanation: "why" },
          ],
          placements: { o1: "top-right" },
        },
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});

describe("POST /api/ai/perspective — generative", () => {
  it("returns 400 when exercise type is wrong", async () => {
    authOk();
    const res = await POST(
      makeRequest({
        kind: "generative",
        exercise: { type: "analytical" },
        confidenceBefore: 60,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns perspective on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(structuredPerspectiveJson());
    const res = await POST(
      makeRequest({
        kind: "generative",
        exercise: {
          type: "generative",
          domain: "tech",
          title: "Gen Title",
          scenario: "scenario",
          stageAtStart: "edit",
          prompts: [{ id: "p1", question: "Q?" }],
          answers: { p1: "A" },
          draftBaseline: {},
          debateOpening: null,
          debateTurns: [],
          rubricScore: null,
          confidenceBefore: null,
          aiPerspective: null,
          createdAt: "2025-01-01",
          completedAt: null,
        },
        confidenceBefore: 75,
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});
