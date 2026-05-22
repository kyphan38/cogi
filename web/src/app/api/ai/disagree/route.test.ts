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
  return new Request("http://localhost/api/ai/disagree", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  exerciseId: "ex1",
  kind: "analytical",
  section: "embedded",
  exerciseTitle: "Test Exercise",
  domain: "tech",
  pointId: "p1",
  pointBody: "The AI perspective point",
  userReason: "I disagree because this reasoning is flawed in several ways",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  mockDocGet.mockResolvedValue({ exists: false });
  mockDocSet.mockResolvedValue(undefined);
});

describe("POST /api/ai/disagree", () => {
  it("returns 401 when auth fails", async () => {
    authFail();
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body (userReason too short)", async () => {
    authOk();
    const res = await POST(makeRequest({ ...validBody, userReason: "too short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid kind", async () => {
    authOk();
    const res = await POST(makeRequest({ ...validBody, kind: "unknown_kind" }));
    expect(res.status).toBe(400);
  });

  it("returns cached result on duplicate request", async () => {
    authOk();
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        id: validBody.requestId,
        aiReply: "cached disagreement reply",
        createdAt: "2025-01-01T00:00:00Z",
      }),
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBe("cached disagreement reply");
    expect(data.saved.saved).toBe(true);
    expect(mockGeneratePlain).not.toHaveBeenCalled();
  });

  it("generates and saves disagreement reply on success", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("I understand your point...");
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.text).toBe("I understand your point...");
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
