import type { GeoLens } from "@/lib/exercise/analytical-levels";

/** How the perspective, missing-actor and lens answers went (PLAN-geopolitics.md G1.4). */
export interface GeoGuessResult {
  /** Picked the hidden viewpoint from the options. */
  perspectiveCorrect: boolean;
  /** Missing actors picked / how many there are. */
  actorsFound: number;
  actorsTotal: number;
  /** Actors picked that are not missing (they are mentioned, or not relevant). */
  wrongActors: number;
  /** Per lens: the right reading picked, or null when written freely (Expert). */
  lenses: { lens: GeoLens; correct: boolean | null }[];
  /** 0-100, shown as one number: viewpoint 50, actors 30, lenses 20 (scaled up when lenses are written). */
  score: number;
}

const norm = (s: string) => s.trim().toLowerCase();

export function scoreGeoGuess(input: {
  hiddenPerspective: string;
  perspectiveOptions: string[];
  /** Index into `perspectiveOptions` (original order). */
  perspectiveChoice: number | null | undefined;
  missingActors: string[];
  actorChoices: string[];
  lensQuestions: { lens: GeoLens; answerIndex: number }[];
  lensAnswers: Partial<Record<GeoLens, number>>;
  lensFree: boolean;
}): GeoGuessResult {
  const picked = input.perspectiveChoice != null ? input.perspectiveOptions[input.perspectiveChoice] : undefined;
  const perspectiveCorrect = picked != null && norm(picked) === norm(input.hiddenPerspective);
  const missing = new Set(input.missingActors.map(norm));
  const chosen = [...new Set(input.actorChoices.map(norm))];
  const actorsFound = chosen.filter((a) => missing.has(a)).length;
  const wrongActors = chosen.length - actorsFound;
  const lenses = input.lensQuestions.map((q) => ({
    lens: q.lens,
    correct: input.lensFree ? null : input.lensAnswers[q.lens] === q.answerIndex,
  }));

  const actorPart = missing.size > 0 ? Math.max(0, actorsFound / missing.size - wrongActors * 0.25) : 0;
  const checkedLenses = lenses.filter((l) => l.correct !== null);
  const lensPart = checkedLenses.length > 0 ? checkedLenses.filter((l) => l.correct).length / checkedLenses.length : null;
  const raw = (perspectiveCorrect ? 50 : 0) + actorPart * 30 + (lensPart ?? 0) * 20;
  const score = Math.round(lensPart === null ? (raw / 80) * 100 : raw);
  return {
    perspectiveCorrect,
    actorsFound,
    actorsTotal: missing.size,
    wrongActors,
    lenses,
    score: Math.max(0, Math.min(100, score)),
  };
}
