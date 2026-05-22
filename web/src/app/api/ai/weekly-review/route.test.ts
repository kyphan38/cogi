import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

const mockRequireAuth = vi.fn();
vi.mock("@/lib/auth/server-route-auth", () => ({
  requireAuthenticatedRouteUser: (...a: unknown[]) => mockRequireAuth(...a),
}));

const mockGeneratePlain = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  generatePlainTextRaw: (...a: unknown[]) => mockGeneratePlain(...a),
}));

const mockDocGet = vi.fn();
const mockDocSet = vi.fn();
vi.mock("@/lib/firebaseAdminFirestore", () => ({
  getFirebaseAdminFirestore: vi.fn(() => ({
    doc: vi.fn(() => ({ get: mockDocGet, set: mockDocSet })),
  })),
  getUserDocPath: vi.fn((_u: string, col: string, id: string) => `users/uid1/${col}/${id}`),
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
  return new Request("http://localhost/api/ai/weekly-review", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeExerciseSlice(i: number) {
  return {
    type: "analytical",
    domain: "tech",
    title: `Exercise ${i}`,
    completedAt: "2025-01-01T00:00:00Z",
    summary: "summary",
    aiPerspectiveSnippet: "snippet",
    journalBlob: "journal",
  };
}

const validBody = {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  exercises: Array.from({ length: 7 }, (_, i) => makeExerciseSlice(i)),
  decisions: [],
  actions: [],
  emotionHistogram: {},
  perspectiveDisagreementCount: 0,
  triggeredAtCompletedExerciseCount: 7,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  mockDocGet.mockResolvedValue({ exists: false });
  mockDocSet.mockResolvedValue(undefined);
});

describe("POST /api/ai/weekly-review", () => {
  it("returns 401 when auth fails", async () => {
    authFail();
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 500 when GEMINI_API_KEY is missing", async () => {
    authOk();
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });

  it("returns 400 for invalid body (exercises must be length 7)", async () => {
    authOk();
    const res = await POST(makeRequest({ ...validBody, exercises: [] }));
    expect(res.status).toBe(400);
  });

  it("returns cached result on duplicate request", async () => {
    authOk();
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        id: validBody.requestId,
        markdown: "# Weekly Review\ncached",
        createdAt: "2025-01-01T00:00:00Z",
      }),
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.markdown).toBe("# Weekly Review\ncached");
    expect(data.saved.saved).toBe(true);
    expect(mockGeneratePlain).not.toHaveBeenCalled();
  });

  it("generates and saves weekly review on success", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("# Weekly Review\nGreat week!");
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.markdown).toBe("# Weekly Review\nGreat week!");
    expect(data.saved.saved).toBe(true);
    expect(mockDocSet).toHaveBeenCalledOnce();
  });

  it("returns 500 on AI failure", async () => {
    authOk();
    mockGeneratePlain.mockRejectedValue(new Error("AI error"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });
});
