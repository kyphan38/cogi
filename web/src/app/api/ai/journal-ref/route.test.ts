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
  return new Request("http://localhost/api/ai/journal-ref", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  domain: "technology",
  snippets: ["snippet one", "snippet two"],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  mockDocGet.mockResolvedValue({ exists: false });
  mockDocSet.mockResolvedValue(undefined);
});

describe("POST /api/ai/journal-ref", () => {
  it("returns 401 when auth fails", async () => {
    authFail();
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body (missing domain)", async () => {
    authOk();
    const res = await POST(makeRequest({ requestId: validBody.requestId, domain: "" }));
    expect(res.status).toBe(400);
  });

  it("returns null line immediately when snippets are empty", async () => {
    authOk();
    const res = await POST(makeRequest({ ...validBody, snippets: [] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.line).toBeNull();
    expect(mockGeneratePlain).not.toHaveBeenCalled();
  });

  it("returns null line when all snippets are whitespace", async () => {
    authOk();
    const res = await POST(makeRequest({ ...validBody, snippets: ["  ", ""] }));
    expect(res.status).toBe(200);
    expect((await res.json()).line).toBeNull();
  });

  it("returns cached result on duplicate request", async () => {
    authOk();
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ route: "journal-ref", line: "cached line", createdAt: "2025-01-01T00:00:00Z" }),
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.line).toBe("cached line");
    expect(data.saved.saved).toBe(true);
    expect(mockGeneratePlain).not.toHaveBeenCalled();
  });

  it("returns null line when model responds with SKIP", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("SKIP");
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).line).toBeNull();
  });

  it("truncates line to 280 chars", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("x".repeat(500));
    const res = await POST(makeRequest(validBody));
    const data = await res.json();
    expect(data.line).toHaveLength(280);
  });

  it("generates and saves line on success", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("A journal reference line");
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.line).toBe("A journal reference line");
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
