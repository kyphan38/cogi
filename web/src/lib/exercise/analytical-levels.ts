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

/** The four geopolitics issue types, in the order the picker shows them. */
export const GEO_ISSUE_TYPES = ["framing_bias", "missing_actor", "assumed_causation", "analogy_misuse"] as const;
export type GeoIssueType = (typeof GEO_ISSUE_TYPES)[number];

/** What each level changes for geopolitics passages (PLAN-geopolitics.md G1.1). */
export interface GeoAnalyticalLevelConfig {
  description: string;
  passageWords: string;
  /** Issue types planted in the passage (one of each). */
  issueTypes: readonly GeoIssueType[];
  /** Sound statements that look biased (traps). */
  decoys: number;
  selectionMode: "sentence" | "free";
  countHint: "issues-and-traps" | "issues" | null;
  checkQuestions: "shown" | "toggle" | "hidden";
  /** Perspective and missing actors: pick from options, or write first and then pick. */
  guess: "choice" | "write-then-choose";
  /** The four lenses: pick a reading, or write one sentence each. */
  lenses: "choice" | "free";
}

export const GEO_ANALYTICAL_LEVELS: Record<PracticeLevel, GeoAnalyticalLevelConfig> = {
  guided: {
    description: "Short brief with 2 issues and 1 trap. Pick whose view it is and who is missing from a list.",
    passageWords: "150-200",
    issueTypes: ["framing_bias", "missing_actor"],
    decoys: 1,
    selectionMode: "sentence",
    countHint: "issues-and-traps",
    checkQuestions: "shown",
    guess: "choice",
    lenses: "choice",
  },
  standard: {
    description: "All 4 issue types and 2 traps. You know how many issues there are. Pick the viewpoint from a list.",
    passageWords: "250-300",
    issueTypes: GEO_ISSUE_TYPES,
    decoys: 2,
    selectionMode: "sentence",
    countHint: "issues",
    checkQuestions: "toggle",
    guess: "choice",
    lenses: "choice",
  },
  expert: {
    description: "Full brief, free selection, no hints. Write whose view it is before you see options; write each lens yourself.",
    passageWords: "300-400",
    issueTypes: GEO_ISSUE_TYPES,
    decoys: 2,
    selectionMode: "free",
    countHint: null,
    checkQuestions: "hidden",
    guess: "write-then-choose",
    lenses: "free",
  },
};

/** The four lenses a geopolitics passage is read through after tagging (G1.3). */
export const GEO_LENSES = ["realist", "liberal", "constructivist", "political_economy"] as const;
export type GeoLens = (typeof GEO_LENSES)[number];

export const GEO_LENS_INFO: Record<GeoLens, { name: string; question: string }> = {
  realist: { name: "Realist", question: "Who gains power or security, and who fears losing it?" },
  liberal: { name: "Liberal", question: "Which rules, institutions or shared gains could hold this together?" },
  constructivist: { name: "Constructivist", question: "Which identities, memories or stories shape how each side sees it?" },
  political_economy: { name: "Political economy", question: "Who makes or loses money, and who pays the cost?" },
};
