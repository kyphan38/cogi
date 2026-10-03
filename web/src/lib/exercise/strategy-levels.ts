import type { PracticeLevel } from "@/lib/exercise/levels";

/** What each level changes for strategic situations (PLAN-learning.md L2). */
export interface StrategyLevelConfig {
  description: string;
  /** How many choices player A has (B always has 2). */
  aOptionCount: number;
  /** Show the payoff numbers (Guided) or let the user rank outcomes from the story. */
  showPayoffs: boolean;
  /** Extra questions: dominant choices and an outcome better for both. */
  extraQuestions: boolean;
  scenarioWords: string;
  /** Which kinds of game to write. */
  gameTypes: string;
  minutes: string;
}

export const STRATEGY_LEVELS: Record<PracticeLevel, StrategyLevelConfig> = {
  guided: {
    description: "2 players, 2 choices each, numbers shown. Find each side's best reply, then where they end up.",
    aOptionCount: 2,
    showPayoffs: true,
    extraQuestions: false,
    scenarioWords: "90-140",
    gameTypes: "one classic game: prisoners_dilemma, coordination, chicken or stag_hunt",
    minutes: "about 10 minutes",
  },
  standard: {
    description: "No numbers: rank what each side prefers from the story, then predict the outcome.",
    aOptionCount: 2,
    showPayoffs: false,
    extraQuestions: false,
    scenarioWords: "130-190",
    gameTypes: "a real-life game; it may be a classic shape or a variant",
    minutes: "about 15 minutes",
  },
  expert: {
    description: "One side has 3 choices, no numbers. Also find dominant choices and outcomes better for both.",
    aOptionCount: 3,
    showPayoffs: false,
    extraQuestions: true,
    scenarioWords: "160-230",
    gameTypes: "a richer real-life game (business, policy or trade); avoid textbook framing",
    minutes: "15-20 minutes",
  },
};

/** Topic areas offered as quick picks at setup. */
export const STRATEGY_AREAS = ["Business & prices", "Work & teams", "Daily life", "Negotiation", "Countries & trade"] as const;
