import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockVerifyIdToken = vi.fn();
vi.mock("@/lib/firebaseAdmin", () => ({
  getFirebaseAdminAuth: vi.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

const mockHasAllowlist = vi.fn(() => false);
const mockIsAllowed = vi.fn(() => true);
vi.mock("@/lib/auth/server-auth", () => ({
  AUTH_SESSION_COOKIE_NAME: "session",
  AUTH_SESSION_TTL_SECONDS: 3600,
  hasServerAllowlist: (...a: unknown[]) => mockHasAllowlist(...a),
  isDecodedTokenAllowedUser: (...a: unknown[]) => mockIsAllowed(...a),
}));

import { POST, DELETE } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/auth/session", () => {
  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost", { method: "POST", body: "not-json" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when idToken is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/idToken/);
  });

  it("returns 400 when idToken is empty string", async () => {
    const res = await POST(makeRequest({ idToken: "   " }));
    expect(res.status).toBe(400);
  });

  it("returns 401 for invalid Firebase token", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad"));
    const res = await POST(makeRequest({ idToken: "bad-token" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when allowlist rejects user", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid1", email: "a@b.com" });
    mockHasAllowlist.mockReturnValue(true);
    mockIsAllowed.mockReturnValue(false);
    const res = await POST(makeRequest({ idToken: "valid" }));
    expect(res.status).toBe(403);
  });

  it("sets session cookie on success", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid1", email: "a@b.com" });
    mockHasAllowlist.mockReturnValue(false);
    const res = await POST(makeRequest({ idToken: "valid" }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("session=");
    expect(cookie).toContain("HttpOnly");
  });
});

describe("DELETE /api/auth/session", () => {
  it("clears session cookie with maxAge 0", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("Max-Age=0");
  });
});
