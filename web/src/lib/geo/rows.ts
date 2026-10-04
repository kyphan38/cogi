import { CHOKEPOINTS, type ChokepointId, type RouteId } from "@/lib/geo/chokepoints";
import { localDay, type GeoQuizAnswer, type QuizAttempt } from "@/lib/geo/quiz";
import type { StraitResult } from "@/lib/geo/strait";
import type { Exercise, GeoLabExerciseRow, GeoStraitExplanation } from "@/lib/types/exercise";

/** Domain of every Geo Lab row; kept out of topic suggestions. */
export const GEO_LAB_DOMAIN = "Geo Lab";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `geo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function makeQuizRow(answers: GeoQuizAnswer[], startedAt: string, now = new Date()): GeoLabExerciseRow {
  return {
    id: newId(),
    type: "geo",
    variant: "map_quiz",
    domain: GEO_LAB_DOMAIN,
    title: "Map quiz",
    quiz: answers,
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: startedAt,
    completedAt: now.toISOString(),
  };
}

export function makeStraitRow(
  input: { chokepointId: ChokepointId; picked: string[]; route: RouteId | null; result: StraitResult; explanation?: GeoStraitExplanation | null },
  startedAt: string,
  now = new Date(),
): GeoLabExerciseRow {
  const name = CHOKEPOINTS.find((c) => c.id === input.chokepointId)?.name ?? input.chokepointId;
  return {
    id: newId(),
    type: "geo",
    variant: "strait",
    domain: GEO_LAB_DOMAIN,
    title: `Close the strait: ${name}`,
    strait: { ...input, explanation: input.explanation ?? null },
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: startedAt,
    completedAt: now.toISOString(),
  };
}

function isGeoRow(ex: Exercise): ex is GeoLabExerciseRow {
  return ex.type === "geo";
}

/** Finished map-quiz rows, oldest first. */
export function quizRows(rows: Exercise[]): GeoLabExerciseRow[] {
  return rows
    .filter((r): r is GeoLabExerciseRow => isGeoRow(r) && r.variant === "map_quiz" && !!r.completedAt)
    .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!));
}

/** Every answer from finished quizzes, in the order given, for the review schedule. */
export function quizAttempts(rows: Exercise[]): QuizAttempt[] {
  return quizRows(rows).flatMap((r) => {
    const day = localDay(new Date(r.completedAt!));
    return (r.quiz ?? []).map((a) => ({ placeId: a.placeId, correct: a.correct, day }));
  });
}

/** Places already asked on `today` (an extra round asks new ones). */
export function placesAskedOn(rows: Exercise[], today: string): Set<string> {
  return new Set(
    quizRows(rows)
      .filter((r) => localDay(new Date(r.completedAt!)) === today)
      .flatMap((r) => (r.quiz ?? []).map((a) => a.placeId)),
  );
}

/** True when a map quiz was finished on `today`. */
export function quizDoneOn(rows: Exercise[], today: string): boolean {
  return quizRows(rows).some((r) => localDay(new Date(r.completedAt!)) === today);
}
