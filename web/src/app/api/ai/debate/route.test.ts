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
  return new Request("http://localhost/api/ai/debate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

describe("POST /api/ai/debate", () => {
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

  it("returns 400 when domain or title is missing", async () => {
    authOk();
    const res = await POST(makeRequest({ domain: "", title: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/domain/);
  });

  it("returns 400 when start mode is missing qa", async () => {
    authOk();
    const res = await POST(makeRequest({ domain: "tech", title: "T", mode: "start" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/qa/);
  });

  it("returns 200 for start mode with valid input", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("AI debate response");
    const res = await POST(
      makeRequest({
        domain: "tech",
        title: "Title",
        mode: "start",
        scenario: "test scenario",
        qa: [{ id: "q1", question: "Q?", answer: "A" }],
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.text).toBe("AI debate response");
  });

  it("returns 400 when continue mode is missing userReply", async () => {
    authOk();
    const res = await POST(
      makeRequest({ domain: "tech", title: "T", mode: "continue", userReply: "" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/userReply/);
  });

  it("returns 200 for continue mode with valid input", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("Continued debate");
    const res = await POST(
      makeRequest({
        domain: "tech",
        title: "Title",
        mode: "continue",
        userReply: "My reply",
        history: [{ role: "assistant", content: "Hello" }],
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).text).toBe("Continued debate");
  });

  it("threads generativeVariant into the start-mode prompt", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("AI debate response");
    await POST(
      makeRequest({
        domain: "tech",
        title: "Title",
        mode: "start",
        scenario: "test scenario",
        qa: [{ id: "q1", question: "Q?", answer: "A" }],
        generativeVariant: "inversion",
      }),
    );
    const prompt = mockGeneratePlain.mock.calls[0]![0] as string;
    expect(prompt).toContain("Inversion / pre-mortem focus");
  });

  it("threads generativeVariant into the continue-mode prompt", async () => {
    authOk();
    mockGeneratePlain.mockResolvedValue("Continued debate");
    await POST(
      makeRequest({
        domain: "tech",
        title: "Title",
        mode: "continue",
        userReply: "My reply",
        history: [],
        generativeVariant: "reframing",
      }),
    );
    const prompt = mockGeneratePlain.mock.calls[0]![0] as string;
    expect(prompt).toContain("Problem-reframing focus");
  });

  it("returns 500 on AI generation failure", async () => {
    authOk();
    mockGeneratePlain.mockRejectedValue(new Error("AI down"));
    const res = await POST(
      makeRequest({
        domain: "tech",
        title: "Title",
        mode: "start",
        qa: [{ id: "q1", question: "Q?", answer: "A" }],
      }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("AI down");
  });
});
