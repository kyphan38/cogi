import { NextResponse } from "next/server";
import { generateAnalyticalExerciseRaw, type GeminiModel } from "@/lib/ai/gemini";

type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

export type ValidatedJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "parse"; error: string; raw: string }
  | { ok: false; kind: "semantic"; errors: string[] };

/**
 * Ask Gemini for JSON, parse it, run the semantic checks, and retry once with the
 * reason appended (plus `retrySuffix`, the per-task hint) when either step fails.
 */
export async function generateValidatedJson<T>(opts: {
  prompt: string;
  parse: (raw: string) => ParseResult<T>;
  validate?: (data: T) => string[];
  retrySuffix?: string;
  responseJsonSchema?: unknown;
  model?: GeminiModel;
  timeoutMs?: number;
}): Promise<ValidatedJsonResult<T>> {
  const { prompt, parse, validate, retrySuffix, responseJsonSchema } = opts;
  const model = opts.model ?? "thinking";

  const attempt = async (p: string): Promise<ValidatedJsonResult<T>> => {
    const raw = await generateAnalyticalExerciseRaw(p, model, opts.timeoutMs, responseJsonSchema);
    const parsed = parse(raw);
    if (!parsed.success) return { ok: false, kind: "parse", error: parsed.error, raw };
    const errors = validate?.(parsed.data) ?? [];
    if (errors.length > 0) return { ok: false, kind: "semantic", errors };
    return { ok: true, data: parsed.data };
  };

  const first = await attempt(prompt);
  if (first.ok) return first;
  const reason =
    first.kind === "parse"
      ? `Invalid JSON from model: ${first.error}`
      : `Semantic validation failed:\n${first.errors.join("\n")}`;
  return attempt(retrySuffix ? `${prompt}\n${retrySuffix}\n${reason}` : `${prompt}\n${reason}`);
}

/** 422 for a reply that still failed after the retry. */
export function validatedJsonFailureResponse(
  result: Extract<ValidatedJsonResult<unknown>, { ok: false }>,
  invalidMessage = "AI generated an invalid exercise. Please try again.",
): NextResponse {
  if (result.kind === "parse") {
    return NextResponse.json(
      { ok: false, error: result.error, rawSnippet: result.raw.slice(0, 500) },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: false, error: invalidMessage }, { status: 422 });
}
