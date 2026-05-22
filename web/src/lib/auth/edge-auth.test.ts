import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => "mock-jwks"),
  jwtVerify: vi.fn(),
}));

async function importFresh() {
  vi.resetModules();
  return import("./edge-auth");
}

describe("readBearerToken", () => {
  it("extracts token from Bearer header", async () => {
    const mod = await importFresh();
    expect(mod.readBearerToken("Bearer abc123")).toBe("abc123");
  });

  it("is case-insensitive for Bearer prefix", async () => {
    const mod = await importFresh();
    expect(mod.readBearerToken("bearer mytoken")).toBe("mytoken");
  });

  it("returns null for null header", async () => {
    const mod = await importFresh();
    expect(mod.readBearerToken(null)).toBeNull();
  });

  it("returns null for non-Bearer header", async () => {
    const mod = await importFresh();
    expect(mod.readBearerToken("Basic abc123")).toBeNull();
  });

  it("trims whitespace from token", async () => {
    const mod = await importFresh();
    expect(mod.readBearerToken("Bearer  token_with_spaces  ")).toBe("token_with_spaces");
  });
});

describe("hasEdgeAllowlistConfig", () => {
  beforeEach(() => vi.unstubAllEnvs());

  it("returns false when no env vars set", async () => {
    vi.stubEnv("ALLOWED_USER_UID", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
    vi.stubEnv("ALLOWED_USER_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
    const mod = await importFresh();
    expect(mod.hasEdgeAllowlistConfig()).toBe(false);
  });

  it("returns true when UID env is set", async () => {
    vi.stubEnv("ALLOWED_USER_UID", "uid123");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
    vi.stubEnv("ALLOWED_USER_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
    const mod = await importFresh();
    expect(mod.hasEdgeAllowlistConfig()).toBe(true);
  });
});

describe("isEdgeAllowedUser", () => {
  beforeEach(() => vi.unstubAllEnvs());

  it("allows matching user_id", async () => {
    vi.stubEnv("ALLOWED_USER_UID", "uid123");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
    vi.stubEnv("ALLOWED_USER_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
    const mod = await importFresh();
    expect(mod.isEdgeAllowedUser({ user_id: "uid123" })).toBe(true);
  });

  it("allows matching sub field as fallback", async () => {
    vi.stubEnv("ALLOWED_USER_UID", "uid456");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
    vi.stubEnv("ALLOWED_USER_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
    const mod = await importFresh();
    expect(mod.isEdgeAllowedUser({ sub: "uid456" })).toBe(true);
  });

  it("allows matching email (case-insensitive)", async () => {
    vi.stubEnv("ALLOWED_USER_UID", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
    vi.stubEnv("ALLOWED_USER_EMAIL", "User@Example.COM");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
    const mod = await importFresh();
    expect(mod.isEdgeAllowedUser({ email: "user@example.com" })).toBe(true);
  });

  it("rejects non-matching user", async () => {
    vi.stubEnv("ALLOWED_USER_UID", "uid123");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
    vi.stubEnv("ALLOWED_USER_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
    const mod = await importFresh();
    expect(mod.isEdgeAllowedUser({ user_id: "other" })).toBe(false);
  });
});

describe("verifyFirebaseJwt", () => {
  beforeEach(() => vi.unstubAllEnvs());

  it("returns null when projectId is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");
    vi.stubEnv("ALLOWED_USER_UID", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
    vi.stubEnv("ALLOWED_USER_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
    const mod = await importFresh();
    expect(await mod.verifyFirebaseJwt("some-token")).toBeNull();
  });

  it("returns null when token is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "my-project");
    vi.stubEnv("ALLOWED_USER_UID", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
    vi.stubEnv("ALLOWED_USER_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
    const mod = await importFresh();
    expect(await mod.verifyFirebaseJwt("")).toBeNull();
  });

  it("returns payload on successful verification", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "my-project");
    vi.stubEnv("ALLOWED_USER_UID", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
    vi.stubEnv("ALLOWED_USER_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
    const { jwtVerify } = await import("jose");
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { user_id: "uid1", email: "a@b.com" },
      protectedHeader: { alg: "RS256" },
    } as never);
    const mod = await importFresh();
    const result = await mod.verifyFirebaseJwt("valid-token");
    expect(result).toEqual({ user_id: "uid1", email: "a@b.com" });
  });

  it("returns null on verification failure", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "my-project");
    vi.stubEnv("ALLOWED_USER_UID", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
    vi.stubEnv("ALLOWED_USER_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
    const { jwtVerify } = await import("jose");
    vi.mocked(jwtVerify).mockRejectedValue(new Error("invalid"));
    const mod = await importFresh();
    const result = await mod.verifyFirebaseJwt("bad-token");
    expect(result).toBeNull();
  });
});
