import { z } from "zod";
import type { AnalyticalDeepDive } from "@/lib/types/perspective";

/** One "Go deeper" reply for a single Analytical answer-key item. */
export const analyticalDeepDiveSchema = z.object({
  core: z.string().min(1),
  examples: z.array(z.string().min(1)).min(2).max(4),
  alsoCalled: z
    .array(z.object({ name: z.string().min(1), note: z.string().min(1) }))
    .max(2),
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

/** "Non sequitur (kết luận không tất suy)" -> "non sequitur". */
function baseName(name: string): string {
  return name.replace(/\(.*?\)/g, "").trim().toLowerCase();
}

/**
 * Semantic checks: a sound statement has no other names, and an "also called" name
 * must not repeat the planned tag, its subtype, or another tag of the app (that would
 * read as a second problem the learner missed).
 */
export function validateAnalyticalDeepDive(
  d: AnalyticalDeepDive,
  opts: { kind: "issue" | "decoy"; blockedNames: string[] },
): string[] {
  if (opts.kind === "decoy") {
    return d.alsoCalled.length > 0 ? ["alsoCalled must be [] for a sound statement"] : [];
  }
  const blocked = new Set(opts.blockedNames.map(baseName));
  return d.alsoCalled
    .filter((a) => blocked.has(baseName(a.name)))
    .map((a) => `alsoCalled "${a.name}" repeats a tag or the subtype; use another name or leave it out`);
}

export const DEEP_DIVE_RETRY_SUFFIX = `Your previous answer was not valid or did not match the required shape.
Return ONLY a single JSON object (no markdown fences) with: core (string), examples (2-4 strings), alsoCalled ([{ name, note }], 0-2 items, [] for a sound statement), fairer (string).`;
