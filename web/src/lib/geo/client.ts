import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { listCompletedExercises, putExercise } from "@/lib/db/exercises";
import type { ChokepointId, RouteId } from "@/lib/geo/chokepoints";
import type { Exercise, GeoLabExerciseRow, GeoStraitExplanation } from "@/lib/types/exercise";

/**
 * Every finished exercise. The Geo Lab uses its own rows (type "geo") for the quiz and
 * searches the others for place names. The type filter always ran in code, so this
 * reads no more rows than asking for geo rows only.
 */
export function listRecentExercises(): Promise<Exercise[]> {
  return listCompletedExercises();
}

export function saveGeoLabRow(row: GeoLabExerciseRow): Promise<void> {
  return putExercise(row);
}

/** The AI's short note on one "Close the strait" guess. */
export async function requestStraitExplanation(input: {
  chokepointId: ChokepointId;
  picked: string[];
  route: RouteId | null;
}): Promise<GeoStraitExplanation> {
  const res = await aiFetch("/api/ai/geo-strait", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await safeAiJson<{ ok: boolean; explanation?: GeoStraitExplanation; error?: string }>(res);
  if (!json.ok || !json.explanation) throw new Error(json.error || "Could not load the note.");
  return json.explanation;
}
