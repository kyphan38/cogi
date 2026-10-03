import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { saveDeepDive } from "@/lib/db/exercises";
import type { AnalyticalExerciseRow } from "@/lib/types/exercise";
import { isAnalyticalCoachingStructured, type AnalyticalDeepDive } from "@/lib/types/perspective";

/**
 * Ask for a "Go deeper" analysis of one answer-key item and save it on the exercise
 * (a merge, so parallel requests are safe). Callers add it to their own state.
 */
export async function requestAnalyticalDeepDive(
  ex: AnalyticalExerciseRow,
  ref: string,
): Promise<AnalyticalDeepDive> {
  const saved = ex.deepDives?.[ref];
  if (saved) return saved;
  const coaching = isAnalyticalCoachingStructured(ex.aiPerspectiveStructured) ? ex.aiPerspectiveStructured : null;
  const item = coaching?.items.find((it) => it.ref === ref);
  const res = await aiFetch("/api/ai/deep-dive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ref,
      title: ex.title,
      domain: ex.domain,
      passage: ex.passage,
      embeddedIssues: ex.embeddedIssues,
      validPoints: ex.validPoints,
      why: item?.why,
      subtypeName: item?.subtypeName,
    }),
  });
  const json = await safeAiJson<{ ok: boolean; deepDive?: AnalyticalDeepDive; error?: string }>(res);
  if (!json.ok || !json.deepDive) throw new Error(json.error || "Could not load the deeper analysis.");
  await saveDeepDive(ex.id, ref, json.deepDive);
  return json.deepDive;
}

/** The row with one more saved analysis (for state updates). */
export function withDeepDive<T extends AnalyticalExerciseRow>(ex: T, ref: string, deepDive: AnalyticalDeepDive): T {
  return { ...ex, deepDives: { ...ex.deepDives, [ref]: deepDive } };
}
