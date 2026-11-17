import { describe, expect, it, vi } from "vitest";
import { isTimeoutError, retryOnTimeout } from "./retry-on-timeout";

const timeout = () => Object.assign(new Error("aborted"), { name: "AbortError" });

describe("retryOnTimeout", () => {
  it("tries again once after a timeout", async () => {
    const fn = vi.fn().mockRejectedValueOnce(timeout()).mockResolvedValueOnce("ok");
    await expect(retryOnTimeout(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second timeout", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Gemini request timed out"));
    await expect(retryOnTimeout(fn)).rejects.toThrow("timed out");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry other errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("bad key"));
    await expect(retryOnTimeout(fn)).rejects.toThrow("bad key");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("knows a timeout", () => {
    expect(isTimeoutError(timeout())).toBe(true);
    expect(isTimeoutError(new Error("Request timeout"))).toBe(true);
    expect(isTimeoutError(new Error("quota"))).toBe(false);
  });
});
