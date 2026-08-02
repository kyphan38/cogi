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
  return new Request("http://localhost/api/ai/evaluative-criteria-feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validScoringBody = {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  variant: "scoring",
  title: "Career pivot",
  domain: "career",
  scenario: "Deciding how to transition into AI.",
  userProposedCriteria: [
    { name: "Speed", rationale: "Fast is good" },
    { name: "Cost", rationale: "Budget matters" },
  ],
  criteria: [
    { id: "c1", label: "Risk", description: "How risky", suggestedWeight: 3 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  mockDocGet.mockResolvedValue({ exists: false });
  mockDocSet.mockResolvedValue(undefined);
});

describe("POST /api/ai/evaluative-criteria-feedback", () => {
  it("returns 401 when auth fails", async () => {
    authFail();
    const res = await POST(makeRequest(validScoringBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body (fewer than 2 user criteria)", async () => {
    authOk();
    const res = await POST(
      makeRequest({ ...validScoringBody, userProposedCriteria: [validScoringBody.userProposedCriteria[0]] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when variant/discriminated fields mismatch", async () => {
    authOk();
    const res = await POST(makeRequest({ ...validScoringBody, variant: "matrix" }));
    expect(res.status).toBe(400);
  });

  it("returns cached result on duplicate request", async () => {
    authOk();
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        route: "evaluative-criteria-feedback",
        text: "cached feedback",
        createdAt: "2025-01-01T00:00:00Z",
      }),
    });
    const res = await POST(makeRequest(validScoringBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBe("cached feedback");
    expect(data.saved.saved).toBe(true);
    expect(mockGeneratePlain).not.toHaveBeenCalled();
  });

  it("generates and saves feedback on success (scoring variant)", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("Some feedback text");
    const res = await POST(makeRequest(validScoringBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.text).toBe("Some feedback text");
    expect(mockDocSet).toHaveBeenCalledOnce();
  });

  it("generates feedback for the matrix variant", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("Matrix feedback");
    const matrixBody = {
      requestId: "550e8400-e29b-41d4-a716-446655440001",
      variant: "matrix",
      title: "Career pivot",
      domain: "career",
      scenario: "Deciding how to transition into AI.",
      userProposedCriteria: validScoringBody.userProposedCriteria,
      axisX: { label: "Impact", lowLabel: "Low", highLabel: "High" },
      axisY: { label: "Effort", lowLabel: "Low", highLabel: "High" },
    };
    const res = await POST(makeRequest(matrixBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBe("Matrix feedback");
  });

  it("returns 500 on AI failure", async () => {
    authOk();
    mockGeneratePlain.mockRejectedValue(new Error("AI error"));
    const res = await POST(makeRequest(validScoringBody));
    expect(res.status).toBe(500);
  });
});
