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
  return new Request("http://localhost/api/ai/combo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  preset: "decision_sprint",
  domain: "technology",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  mockDocGet.mockResolvedValue({ exists: false });
  mockDocSet.mockResolvedValue(undefined);
});

describe("POST /api/ai/combo", () => {
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

  it("returns 400 for invalid JSON", async () => {
    authOk();
    const req = new Request("http://localhost", { method: "POST", body: "bad" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid preset", async () => {
    authOk();
    const res = await POST(makeRequest({ ...validBody, preset: "invalid_preset" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when neither domain nor customScenario provided", async () => {
    authOk();
    const res = await POST(makeRequest({ ...validBody, domain: "" }));
    expect(res.status).toBe(400);
  });

  it("returns cached result on duplicate request", async () => {
    authOk();
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        route: "combo",
        comboData: { preset: "decision_sprint", sharedScenario: "s" },
        createdAt: "2025-01-01T00:00:00Z",
      }),
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.preset).toBe("decision_sprint");
    expect(data.saved.saved).toBe(true);
    expect(mockGenerateRaw).not.toHaveBeenCalled();
  });

  it("returns 422 when model returns unparseable JSON", async () => {
    authOk();
    mockGenerateRaw.mockResolvedValue("not json");
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(422);
  });

  it("returns 500 on AI generation failure", async () => {
    authOk();
    mockGenerateRaw.mockRejectedValue(new Error("timeout"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });
});
