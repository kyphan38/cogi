import { describe, expect, it } from "vitest";
import { safeAiJson } from "./ai-fetch";

function mockResponse(
  body: unknown,
  init: { status?: number; ok?: boolean; headers?: Record<string, string> } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  const json = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok,
    status,
    json: () => Promise.resolve(typeof body === "string" ? JSON.parse(body) : body),
    text: () => Promise.resolve(json),
  } as unknown as Response;
}

function mockHtmlResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: () => Promise.reject(new SyntaxError("Unexpected token '<'")),
    text: () => Promise.resolve("<html>Gateway Timeout</html>"),
  } as unknown as Response;
}

describe("safeAiJson", () => {
  it("returns parsed JSON for a 200 response", async () => {
    const res = mockResponse({ ok: true, data: "hello" });
    const result = await safeAiJson<{ ok: true; data: string }>(res);
    expect(result).toEqual({ ok: true, data: "hello" });
  });

  it("extracts error from JSON body on non-OK response", async () => {
    const res = mockResponse(
      { ok: false, error: "AI generated an invalid exercise. Please try again." },
      { status: 422 },
    );
    await expect(safeAiJson(res)).rejects.toThrow(
      "AI generated an invalid exercise. Please try again.",
    );
  });

  it("falls back to status-based message when body has no error field", async () => {
    const res = mockResponse({ ok: false }, { status: 500 });
    await expect(safeAiJson(res)).rejects.toThrow("Server error (500)");
  });

  it("shows timeout message for 504 HTML response", async () => {
    const res = mockHtmlResponse(504);
    await expect(safeAiJson(res)).rejects.toThrow(
      "Exercise generation timed out. Please try again.",
    );
  });

  it("shows generic server error for non-504 HTML response", async () => {
    const res = mockHtmlResponse(502);
    await expect(safeAiJson(res)).rejects.toThrow(
      "Server error (502). Please try again.",
    );
  });

  it("extracts error from 400 JSON response", async () => {
    const res = mockResponse(
      { ok: false, error: "Provide domain and/or customScenario (non-empty)." },
      { status: 400 },
    );
    await expect(safeAiJson(res)).rejects.toThrow(
      "Provide domain and/or customScenario (non-empty).",
    );
  });

  it("extracts error from 504 JSON response (server-side timeout catch)", async () => {
    const res = mockResponse(
      { ok: false, error: "Exercise generation timed out. Please try again." },
      { status: 504 },
    );
    await expect(safeAiJson(res)).rejects.toThrow(
      "Exercise generation timed out. Please try again.",
    );
  });
});
