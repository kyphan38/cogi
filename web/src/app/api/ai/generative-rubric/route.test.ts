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
  return new Request("http://localhost/api/ai/generative-rubric", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validExercise = {
  type: "generative" as const,
  id: "ex1",
  domain: "tech",
  title: "Title",
  scenario: "scenario",
  stageAtStart: "edit",
  prompts: [{ id: "p1", question: "Q?" }],
  answers: { p1: "My answer" },
  draftBaseline: {},
  debateOpening: null,
  debateTurns: [],
  rubricScore: null,
  confidenceBefore: null,
  aiPerspective: null,
  createdAt: "2025-01-01",
  completedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

describe("POST /api/ai/generative-rubric", () => {
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

  it("returns 400 when exercise is missing", async () => {
    authOk();
    const res = await POST(makeRequest({ exercise: null }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when exercise type is not generative", async () => {
    authOk();
    const res = await POST(makeRequest({ exercise: { type: "analytical" } }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with overall score on success", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(JSON.stringify({ overall: 72 }));
    const res = await POST(makeRequest({ exercise: validExercise }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.overall).toBe(72);
  });

  it("clamps overall to 0-100 range", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue(JSON.stringify({ overall: 150 }));
    const res = await POST(makeRequest({ exercise: validExercise }));
    expect((await res.json()).overall).toBe(100);
  });

  it("returns 422 when model returns invalid rubric", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue("not json at all");
    const res = await POST(makeRequest({ exercise: validExercise }));
    expect(res.status).toBe(422);
  });

  it("returns 500 on AI generation failure", async () => {
    authOk();
    mockGenerateRaw.mockRejectedValue(new Error("model overloaded"));
    const res = await POST(makeRequest({ exercise: validExercise }));
    expect(res.status).toBe(500);
  });
});
