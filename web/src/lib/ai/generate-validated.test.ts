import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateRaw = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  generateAnalyticalExerciseRaw: (...a: unknown[]) => mockGenerateRaw(...a),
}));

import { generateValidatedJson, validatedJsonFailureResponse } from "./generate-validated";

const parse = (raw: string) => {
  try {
    return { success: true as const, data: JSON.parse(raw) as { n: number } };
  } catch {
    return { success: false as const, error: "not json" };
  }
};
const validate = (d: { n: number }) => (d.n > 0 ? [] : ["n must be positive"]);

describe("generateValidatedJson", () => {
  beforeEach(() => mockGenerateRaw.mockReset());

  it("returns data from the first good reply without retrying", async () => {
    mockGenerateRaw.mockResolvedValueOnce('{"n":1}');
    const schema = { type: "object" };
    const r = await generateValidatedJson({ prompt: "P", parse, validate, responseJsonSchema: schema });
    expect(r).toEqual({ ok: true, data: { n: 1 } });
    expect(mockGenerateRaw).toHaveBeenCalledTimes(1);
    expect(mockGenerateRaw.mock.calls[0]).toEqual(["P", "thinking", undefined, schema]);
  });

  it("retries once with the suffix and the parse error", async () => {
    mockGenerateRaw.mockResolvedValueOnce("oops").mockResolvedValueOnce('{"n":2}');
    const r = await generateValidatedJson({ prompt: "P", parse, validate, retrySuffix: "FIX IT" });
    expect(r).toEqual({ ok: true, data: { n: 2 } });
    expect(mockGenerateRaw.mock.calls[1][0]).toBe("P\nFIX IT\nInvalid JSON from model: not json");
  });

  it("retries with the semantic errors and no suffix line when none is given", async () => {
    mockGenerateRaw.mockResolvedValueOnce('{"n":0}').mockResolvedValueOnce('{"n":0}');
    const r = await generateValidatedJson({ prompt: "P", parse, validate });
    expect(r).toEqual({ ok: false, kind: "semantic", errors: ["n must be positive"] });
    expect(mockGenerateRaw).toHaveBeenCalledTimes(2);
    expect(mockGenerateRaw.mock.calls[1][0]).toBe("P\nSemantic validation failed:\nn must be positive");
  });

  it("reports a parse failure with the raw reply after the retry", async () => {
    mockGenerateRaw.mockResolvedValue("still bad");
    const r = await generateValidatedJson({ prompt: "P", parse });
    expect(r).toEqual({ ok: false, kind: "parse", error: "not json", raw: "still bad" });
  });
});

describe("validatedJsonFailureResponse", () => {
  it("sends a 422 with a raw snippet for parse failures", async () => {
    const res = validatedJsonFailureResponse({ ok: false, kind: "parse", error: "bad", raw: "x".repeat(900) });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("bad");
    expect(body.rawSnippet).toHaveLength(500);
  });

  it("sends a 422 with the friendly message for semantic failures", async () => {
    const res = validatedJsonFailureResponse({ ok: false, kind: "semantic", errors: ["e"] }, "Try again.");
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ ok: false, error: "Try again." });
  });
});
