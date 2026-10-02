import type { AnalyticalResult } from "@/lib/types/exercise";
import type { PracticeLevel, ResultRating } from "@/lib/exercise/levels";

/** What each level changes for analytical exercises (plan phase 4, P4.3). */
export interface AnalyticalLevelConfig {
  /** One line shown on the level picker. */
  description: string;
  /** Passage length asked of the generator. */
  passageWords: string;
  /** "sentence": tap whole sentences; "free": select any text. */
  selectionMode: "sentence" | "free";
  /** Tell the user how many issues (and traps) to look for. */
  countHint: "issues-and-traps" | "issues" | null;
  /** The four check questions: always shown, behind a toggle, or hidden. */
  checkQuestions: "shown" | "toggle" | "hidden";
  /** Guided walkthrough: main-claim quiz, then suggested sentences one by one. */
  walkthrough: boolean;
  /** Passages with no planned issues (sound reasoning) can appear. */
  allowSoundReasoning: boolean;
}

export const ANALYTICAL_LEVELS: Record<PracticeLevel, AnalyticalLevelConfig> = {
  guided: {
    description: "Short passage. Find the main claim, then check suggested sentences one by one.",
    passageWords: "150-200",
    selectionMode: "sentence",
    countHint: "issues-and-traps",
    checkQuestions: "shown",
    walkthrough: true,
    allowSoundReasoning: false,
  },
  standard: {
    description: "Tap the sentences you think have a problem. You know how many issues to find.",
    passageWords: "220-280",
    selectionMode: "sentence",
    countHint: "issues",
    checkQuestions: "toggle",
    walkthrough: false,
    allowSoundReasoning: false,
  },
  expert: {
    description: "Longer passage, free text selection, no hints. Some passages have no issues.",
    passageWords: "250-350",
    selectionMode: "free",
    countHint: null,
    checkQuestions: "hidden",
    walkthrough: false,
    allowSoundReasoning: true,
  },
};

/**
 * Rate one finished exercise for level suggestions. Good: at least 3 of 4 issues
 * found and at most 1 trap hit. Poor: at most 1 of 4 found. A sound-reasoning passage
 * (no planned issues) rates on traps alone.
 */
export function rateAnalytical(result: AnalyticalResult): ResultRating {
  if (result.total === 0) {
    if (result.trapsHit === 0) return "good";
    return result.trapsHit >= 2 ? "poor" : "ok";
  }
  const share = result.found / result.total;
  if (share >= 0.75 && result.trapsHit <= 1) return "good";
  if (share <= 0.25) return "poor";
  return "ok";
}
