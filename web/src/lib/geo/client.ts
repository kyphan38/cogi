import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { listCompletedExercises, putExercise } from "@/lib/db/exercises";
import type { ChokepointId, RouteId } from "@/lib/geo/chokepoints";
import type { Exercise, GeoLabExerciseRow, GeoStraitExplanation } from "@/lib/types/exercise";

/** Finished Geo Lab rows (map quizzes and straits). */
export function listGeoLabRows(): Promise<Exercise[]> {
  return listCompletedExercises({ type: "geo" });
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
