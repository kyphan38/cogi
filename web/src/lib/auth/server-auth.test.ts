import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

async function importFresh() {
  vi.resetModules();
  return import("./server-auth");
}

describe("server-auth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe("AUTH_SESSION_COOKIE_NAME", () => {
    it("defaults to cogi_session", async () => {
      vi.stubEnv("AUTH_COOKIE_NAME", "");
      const mod = await importFresh();
      expect(mod.AUTH_SESSION_COOKIE_NAME).toBe("cogi_session");
    });

    it("reads from AUTH_COOKIE_NAME env", async () => {
      vi.stubEnv("AUTH_COOKIE_NAME", "my_cookie");
      const mod = await importFresh();
      expect(mod.AUTH_SESSION_COOKIE_NAME).toBe("my_cookie");
    });
  });

  describe("AUTH_SESSION_TTL_SECONDS", () => {
    it("defaults to 55 minutes when env not set", async () => {
      vi.stubEnv("AUTH_COOKIE_MAX_AGE_SECONDS", "");
      const mod = await importFresh();
      expect(mod.AUTH_SESSION_TTL_SECONDS).toBe(55 * 60);
    });

    it("reads from env when valid", async () => {
      vi.stubEnv("AUTH_COOKIE_MAX_AGE_SECONDS", "7200");
      const mod = await importFresh();
      expect(mod.AUTH_SESSION_TTL_SECONDS).toBe(7200);
    });

    it("defaults when env is non-numeric", async () => {
      vi.stubEnv("AUTH_COOKIE_MAX_AGE_SECONDS", "abc");
      const mod = await importFresh();
      expect(mod.AUTH_SESSION_TTL_SECONDS).toBe(55 * 60);
    });

    it("defaults when env is zero", async () => {
      vi.stubEnv("AUTH_COOKIE_MAX_AGE_SECONDS", "0");
      const mod = await importFresh();
      expect(mod.AUTH_SESSION_TTL_SECONDS).toBe(55 * 60);
    });

    it("defaults when env is negative", async () => {
      vi.stubEnv("AUTH_COOKIE_MAX_AGE_SECONDS", "-100");
      const mod = await importFresh();
      expect(mod.AUTH_SESSION_TTL_SECONDS).toBe(55 * 60);
    });
  });

  describe("hasServerAllowlist", () => {
    it("returns false when no allowlist env vars set", async () => {
      vi.stubEnv("ALLOWED_USER_UID", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
      vi.stubEnv("ALLOWED_USER_EMAIL", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
      const mod = await importFresh();
      expect(mod.hasServerAllowlist()).toBe(false);
    });

    it("returns true when UID allowlist is set", async () => {
      vi.stubEnv("ALLOWED_USER_UID", "uid123");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
      vi.stubEnv("ALLOWED_USER_EMAIL", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
      const mod = await importFresh();
      expect(mod.hasServerAllowlist()).toBe(true);
    });

    it("returns true when email allowlist is set", async () => {
      vi.stubEnv("ALLOWED_USER_UID", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
      vi.stubEnv("ALLOWED_USER_EMAIL", "user@example.com");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
      const mod = await importFresh();
      expect(mod.hasServerAllowlist()).toBe(true);
    });

    it("returns true when NEXT_PUBLIC variants are set", async () => {
      vi.stubEnv("ALLOWED_USER_UID", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "uid456");
      vi.stubEnv("ALLOWED_USER_EMAIL", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
      const mod = await importFresh();
      expect(mod.hasServerAllowlist()).toBe(true);
    });
  });

  describe("isDecodedTokenAllowedUser", () => {
    it("allows matching UID", async () => {
      vi.stubEnv("ALLOWED_USER_UID", "uid123");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
      vi.stubEnv("ALLOWED_USER_EMAIL", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
      const mod = await importFresh();
      expect(mod.isDecodedTokenAllowedUser({ uid: "uid123", email: "any@x.com" })).toBe(true);
    });

    it("rejects non-matching UID", async () => {
      vi.stubEnv("ALLOWED_USER_UID", "uid123");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
      vi.stubEnv("ALLOWED_USER_EMAIL", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
      const mod = await importFresh();
      expect(mod.isDecodedTokenAllowedUser({ uid: "other", email: "" })).toBe(false);
    });

    it("allows matching email (case-insensitive)", async () => {
      vi.stubEnv("ALLOWED_USER_UID", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
      vi.stubEnv("ALLOWED_USER_EMAIL", "User@Example.COM");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
      const mod = await importFresh();
      expect(mod.isDecodedTokenAllowedUser({ uid: "any", email: "user@example.com" })).toBe(true);
    });

    it("rejects non-matching email", async () => {
      vi.stubEnv("ALLOWED_USER_UID", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
      vi.stubEnv("ALLOWED_USER_EMAIL", "allowed@x.com");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
      const mod = await importFresh();
      expect(mod.isDecodedTokenAllowedUser({ uid: "any", email: "other@x.com" })).toBe(false);
    });

    it("rejects when no allowlist configured", async () => {
      vi.stubEnv("ALLOWED_USER_UID", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_USER_UID", "");
      vi.stubEnv("ALLOWED_USER_EMAIL", "");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL", "");
      const mod = await importFresh();
      expect(mod.isDecodedTokenAllowedUser({ uid: "any", email: "any@x.com" })).toBe(false);
    });
  });
});
