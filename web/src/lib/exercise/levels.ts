/**
 * Practice levels, shared by every exercise type. The user picks the level; the app
 * only suggests a change, based on results scored in code (not self-reported
 * confidence). Each type decides what a level changes and how a result rates.
 */
export type PracticeLevel = "guided" | "standard" | "expert";

export const PRACTICE_LEVELS: readonly PracticeLevel[] = ["guided", "standard", "expert"];

/** Exercise types that have levels. Systems and Evaluative join later (plan phase 6). */
export type LevelledExerciseType = "analytical" | "systems" | "evaluative";

export const DEFAULT_PRACTICE_LEVEL: PracticeLevel = "guided";

export const LEVEL_LABELS: Record<PracticeLevel, string> = {
  guided: "Guided",
  standard: "Standard",
  expert: "Expert",
};

export function isPracticeLevel(value: unknown): value is PracticeLevel {
  return typeof value === "string" && (PRACTICE_LEVELS as readonly string[]).includes(value);
}

/** How one finished exercise went, as each type rates its own result. */
export type ResultRating = "good" | "ok" | "poor";

/** Good results in a row at the current level before suggesting the next one. */
export const LEVEL_UP_STREAK = 3;
/** Poor results in a row before suggesting the level below. */
export const LEVEL_DOWN_STREAK = 2;

export type LevelSuggestion = { direction: "up" | "down"; to: PracticeLevel } | null;

/**
 * Suggest a level change from the ratings of exercises finished at `level`, newest
 * first. Only exercises finished after the user last dismissed a suggestion should be
 * passed, so "Not now" waits for a fresh streak.
 */
export function suggestLevelChange(level: PracticeLevel, recentNewestFirst: ResultRating[]): LevelSuggestion {
  const i = PRACTICE_LEVELS.indexOf(level);
  const up = PRACTICE_LEVELS[i + 1];
  const down = PRACTICE_LEVELS[i - 1];
  const streak = (rating: ResultRating, n: number) =>
    recentNewestFirst.length >= n && recentNewestFirst.slice(0, n).every((r) => r === rating);
  if (up && streak("good", LEVEL_UP_STREAK)) return { direction: "up", to: up };
  if (down && streak("poor", LEVEL_DOWN_STREAK)) return { direction: "down", to: down };
  return null;
}
