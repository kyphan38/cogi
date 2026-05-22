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
  return new Request("http://localhost/api/ai/recall-feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  exerciseId: "ex1",
  exerciseTitle: "Test Exercise",
  summary: "Summary text",
  userRecall: "I remember that...",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  mockDocGet.mockResolvedValue({ exists: false });
  mockDocSet.mockResolvedValue(undefined);
});

describe("POST /api/ai/recall-feedback", () => {
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

  it("returns 400 for invalid body (missing exerciseTitle)", async () => {
    authOk();
    const res = await POST(makeRequest({ ...validBody, exerciseTitle: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid requestId (not UUID)", async () => {
    authOk();
    const res = await POST(makeRequest({ ...validBody, requestId: "not-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns cached result on duplicate request", async () => {
    authOk();
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ feedbackText: "cached feedback", createdAt: "2025-01-01T00:00:00Z" }),
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBe("cached feedback");
    expect(data.saved.saved).toBe(true);
    expect(mockGeneratePlain).not.toHaveBeenCalled();
  });

  it("generates and saves feedback on success", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("Great recall!");
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.text).toBe("Great recall!");
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
