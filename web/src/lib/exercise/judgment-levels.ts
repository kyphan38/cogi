import type { PracticeLevel } from "@/lib/exercise/levels";
import type { JudgmentLens } from "@/lib/ai/validators/judgment";

/** What each level changes for life-situation exercises (PLAN-learning.md L1). */
export interface JudgmentLevelConfig {
  description: string;
  /** How many ways to respond the user ranks. */
  responseCount: number;
  /** Scenario length asked of the generator. */
  scenarioWords: string;
  /** What kind of situation to write. */
  stakes: string;
  /** Lens questions: one per screen with choices, all on one screen with choices, or free text. */
  lensMode: "one-by-one" | "choices" | "free";
  /** "My situation": build the exercise from something that really happened. */
  ownSituation: boolean;
  /** Also write your own response for the AI to comment on. */
  ownResponse: boolean;
  /** Rough time, shown at setup. */
  minutes: string;
}

export const JUDGMENT_LEVELS: Record<PracticeLevel, JudgmentLevelConfig> = {
  guided: {
    description: "Short everyday situation. One question at a time, then rank 3 ways to respond.",
    responseCount: 3,
    scenarioWords: "90-140",
    stakes: "an everyday, low-stakes situation (a small misunderstanding, a minor setback, a simple choice)",
    lensMode: "one-by-one",
    ownSituation: false,
    ownResponse: false,
    minutes: "about 10 minutes",
  },
  standard: {
    description: "Work, money or family. Rank 4 ways to respond. You can use a situation of your own.",
    responseCount: 4,
    scenarioWords: "140-200",
    stakes: "a situation with real stakes at work, with money, or in the family",
    lensMode: "choices",
    ownSituation: true,
    ownResponse: false,
    minutes: "about 15 minutes",
  },
  expert: {
    description: "High stakes, several people. Answer the lens questions in your own words and write your own response.",
    responseCount: 4,
    scenarioWords: "180-250",
    stakes: "a high-stakes situation with several people whose interests clash",
    lensMode: "free",
    ownSituation: true,
    ownResponse: true,
    minutes: "15-20 minutes",
  },
};

export const LENS_INFO: Record<JudgmentLens, { name: string; question: string }> = {
  think: {
    name: "Think clearly",
    question: "What is the real problem? What are the options and what follows from each?",
  },
  people: {
    name: "Understand people",
    question: "What do I feel? What does the other person feel and need? How can I say it so they can hear it?",
  },
  steady: {
    name: "Stay steady",
    question: "What can I control? What is my part? How big and how lasting is this, really?",
  },
};

/** Life areas offered as quick picks at setup. */
export const LIFE_AREAS = ["Work", "Family", "Friends", "Money", "Study", "Relationships", "Health & habits"] as const;

export type JudgmentContext = "vietnam" | "general";
