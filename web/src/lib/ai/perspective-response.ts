import {
  aiPerspectiveStructuredSchema,
  parseStructuredPerspectiveJson,
} from "@/lib/ai/validators/perspective-structured";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import type { PerspectiveKind } from "@/lib/types/perspective";

export type PerspectiveFetchResult =
  | { ok: true; text: string; structured: AIPerspectiveStructured }
  /** `safety: "concern"`: what the user wrote needs real support; show the support message. */
  | { ok: false; error: string; safety?: "concern" };

/** Parse JSON body from `POST /api/ai/perspective`. */
export function parsePerspectiveFetchJson(
  data: unknown,
  perspectiveKind: PerspectiveKind,
): PerspectiveFetchResult {
  if (typeof data !== "object" || data === null) {
    return { ok: false, error: "Invalid response" };
  }
  const o = data as Record<string, unknown>;
  if (o.ok === false && typeof o.error === "string") {
    return o.safety === "concern" ? { ok: false, error: o.error, safety: "concern" } : { ok: false, error: o.error };
  }
  if (o.ok !== true) {
    return { ok: false, error: "Invalid response" };
  }
  const text = typeof o.text === "string" ? o.text : "";

  const structuredRaw = o.structured;
  if (structuredRaw !== undefined && structuredRaw !== null) {
    const unionParsed = aiPerspectiveStructuredSchema.safeParse(structuredRaw);
    if (unionParsed.success) {
      return { ok: true, text, structured: unionParsed.data as AIPerspectiveStructured };
    }
  }

  if (typeof o.text === "string") {
    const reparsed = parseStructuredPerspectiveJson(o.text, perspectiveKind);
    if (reparsed.success) {
      return { ok: true, text, structured: reparsed.data };
    }
  }

  return {
    ok: false,
    error: "Perspective response missing valid structured field",
  };
}
