import {
  aiPerspectiveStructuredSchema,
  parseStructuredPerspectiveJson,
} from "@/lib/ai/validators/perspective-structured";
import type { ClarityPerspectiveKind } from "@/lib/types/perspective";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import type { PerspectiveKind } from "@/lib/types/disagreement";

export type PerspectiveFetchResult =
  | { ok: true; text: string; structured: AIPerspectiveStructured }
  | { ok: false; error: string };

function clarityKindFromPerspectiveKind(
  kind: PerspectiveKind,
): ClarityPerspectiveKind | "sequential" | null {
  if (kind === "sequential") return "sequential";
  if (
    kind === "analytical" ||
    kind === "systems" ||
    kind === "evaluative-matrix" ||
    kind === "evaluative-scoring" ||
    kind === "evaluative-uncertainty" ||
    kind === "generative"
  ) {
    return kind;
  }
  return null;
}

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
    return { ok: false, error: o.error };
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

  const ck = clarityKindFromPerspectiveKind(perspectiveKind);
  if (ck && ck !== "sequential" && typeof o.text === "string") {
    const reparsed = parseStructuredPerspectiveJson(o.text, ck);
    if (reparsed.success) {
      return { ok: true, text, structured: reparsed.data };
    }
  }

  return {
    ok: false,
    error: "Perspective response missing valid structured field",
  };
}
