import { z } from "zod";
import type { AnalyticalDeepDive } from "@/lib/types/perspective";

/** One "Go deeper" reply for a single Analytical answer-key item. */
export const analyticalDeepDiveSchema = z.object({
  core: z.string().min(1),
  examples: z.array(z.string().min(1)).min(2).max(4),
  fairer: z.string().min(1),
});

export type ParseDeepDiveResult =
  | { success: true; data: AnalyticalDeepDive }
  | { success: false; error: string };

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (m?.[1]) return m[1].trim();
  return trimmed;
}

export function parseAnalyticalDeepDiveJson(text: string): ParseDeepDiveResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = analyticalDeepDiveSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}

/** Letters only Vietnamese uses (ă đ ơ ư and the tone-marked block U+1EA0-U+1EF9). */
const VIETNAMESE_LETTERS = /[ăĂđĐơƠưƯ\u1EA0-\u1EF9]/;

export function hasVietnamese(text: string): boolean {
  return VIETNAMESE_LETTERS.test(text);
}

/**
 * Drop bracketed Vietnamese glosses, e.g. "False dilemma (song đề sai)" -> "False
 * dilemma". Analyses saved before the English-only rule still carry them.
 */
export function stripVietnameseGlosses(text: string): string {
  return text.replace(/\s*\(([^()]*)\)/g, (m, inner: string) => (hasVietnamese(inner) ? "" : m));
}

/** Semantic check: every field is in English (no Vietnamese words). */
export function validateAnalyticalDeepDive(d: AnalyticalDeepDive): string[] {
  const texts = [d.core, ...d.examples, d.fairer];
  return texts.some(hasVietnamese) ? ["Write English only: remove every Vietnamese word"] : [];
}

export const DEEP_DIVE_RETRY_SUFFIX = `Your previous answer was not valid or did not match the required shape.
Return ONLY a single JSON object (no markdown fences) with: core (string), examples (2-4 strings), fairer (string). English only.`;
