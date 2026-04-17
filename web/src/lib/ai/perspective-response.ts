import { aiPerspectiveStructuredSchema } from "@/lib/ai/validators/perspective-structured";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";

export type PerspectiveFetchResult =
  | { ok: true; text: string; structured: AIPerspectiveStructured }
  | { ok: false; error: string };

/** Parse JSON body from `POST /api/ai/perspective`. */
export function parsePerspectiveFetchJson(data: unknown): PerspectiveFetchResult {
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
  const parsed = aiPerspectiveStructuredSchema.safeParse(o.structured);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Perspective response missing valid structured field",
    };
  }
  return { ok: true, text, structured: parsed.data };
}
