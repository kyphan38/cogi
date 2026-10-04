import { z } from "zod";
import { hasVietnamese } from "@/lib/ai/validators/deep-dive";
import type { GeoStraitExplanation } from "@/lib/types/exercise";

/** The AI's short note after "Close the strait". */
export const geoStraitExplanationSchema = z.object({
  summary: z.string().min(1).max(500),
  points: z.array(z.string().min(1).max(400)).min(2).max(3),
});

export type ParseGeoStraitResult =
  | { success: true; data: GeoStraitExplanation }
  | { success: false; error: string };

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m?.[1] ? m[1].trim() : trimmed;
}

export function parseGeoStraitJson(text: string): ParseGeoStraitResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = geoStraitExplanationSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}

/** Numbers written with digits, without thousands separators ("10,25" stays "10,25"). */
export function numbersIn(text: string): string[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,(?=\d{3}\b)/g, "")).map((n) => n.replace(/,$/, ""));
}

/**
 * Semantic checks: English only, and every number the AI writes must already be in
 * the fixed facts it was given, so it cannot slip in an invented statistic.
 */
export function validateGeoStraitExplanation(d: GeoStraitExplanation, factsText: string): string[] {
  const errors: string[] = [];
  const texts = [d.summary, ...d.points];
  if (texts.some(hasVietnamese)) errors.push("Write English only: remove every Vietnamese word");
  const allowed = new Set(numbersIn(factsText));
  const unknown = [...new Set(texts.flatMap(numbersIn))].filter((n) => !allowed.has(n));
  if (unknown.length) {
    errors.push(`Use only numbers from the FIXED FACTS. Remove or fix: ${unknown.join(", ")}`);
  }
  return errors;
}

export const GEO_STRAIT_RETRY_SUFFIX = `Your previous answer was not valid.
Return ONLY a single JSON object (no markdown fences) with: summary (string), points (2-3 strings). English only. Use no number that is not in the FIXED FACTS.`;
