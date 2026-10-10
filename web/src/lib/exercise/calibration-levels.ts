import type { PracticeLevel } from "@/lib/exercise/levels";

/** What each level changes for Calibration exercises (PLAN-psychology.md P2). */
export interface CalibrationLevelConfig {
  description: string;
  /** Pick A or B, then say how sure you are. */
  binaryCount: number;
  /** Give a low and a high number. */
  intervalCount: number;
  /** How sure the range should be, in percent (80 or 90). */
  intervalTarget: number;
  /** Base-rate problems ("a test is positive: what is the chance?"). */
  baseRateCount: number;
  /** Also ask about a second positive test on the last base-rate problem. */
  twoStepBaseRate: boolean;
  /** The "out of 10,000 people" table: always shown, behind a button, or never. */
  frequencyTable: "shown" | "toggle" | "none";
  /** The tip for ranges ("a number surely too low, one surely too high"). */
  rangeTip: "shown" | "toggle" | "none";
  minutes: string;
}

export const CALIBRATION_LEVELS: Record<PracticeLevel, CalibrationLevelConfig> = {
  guided: {
    description: "8 questions with two answers: pick one and say how sure you are. 1 base-rate problem with a table.",
    binaryCount: 8,
    intervalCount: 0,
    intervalTarget: 80,
    baseRateCount: 1,
    twoStepBaseRate: false,
    frequencyTable: "shown",
    rangeTip: "shown",
    minutes: "about 10 minutes",
  },
  standard: {
    description: "4 two-answer questions, 4 ranges you are 80% sure of, and 2 base-rate problems. Tips are behind a button.",
    binaryCount: 4,
    intervalCount: 4,
    intervalTarget: 80,
    baseRateCount: 2,
    twoStepBaseRate: false,
    frequencyTable: "toggle",
    rangeTip: "toggle",
    minutes: "about 12 minutes",
  },
  expert: {
    description: "7 ranges you are 90% sure of and 3 base-rate problems, one with two tests. No tips.",
    binaryCount: 0,
    intervalCount: 7,
    intervalTarget: 90,
    baseRateCount: 3,
    twoStepBaseRate: true,
    frequencyTable: "none",
    rangeTip: "none",
    minutes: "about 15 minutes",
  },
};

/** How sure you can say you are about a two-answer question. 50% = a pure guess. */
export const BINARY_CONFIDENCE_STEPS = [50, 60, 70, 80, 90, 100] as const;

/** A base-rate answer counts as right within this many percentage points, at most. */
export const BASE_RATE_TOLERANCE = 5;

/**
 * How far off a base-rate answer may be: half the true value, between 1 and 5 points.
 * A flat 5 points let "6%" pass for 1.9%, and seeing how rare it is is the lesson.
 */
export function baseRateTolerance(answer: number): number {
  return Math.min(BASE_RATE_TOLERANCE, Math.max(1, answer / 2));
}

/** A range is "very wide" when its high end is more than this many times its low end. */
export const VERY_WIDE_RATIO = 10;

/** "Learn first" for every Calibration exercise: fixed ideas, so they never drift. */
export const CALIBRATION_CONCEPTS = [
  {
    term: "Calibration",
    plain: "Your confidence matches how often you are right.",
    example: "Of all the times you say \"80% sure\", you are right about 8 times in 10.",
  },
  {
    term: "Overconfidence",
    plain: "Being more sure than your results show.",
    example: "Most people's \"90% sure\" ranges hold the answer only about half the time.",
  },
  {
    term: "Base rate",
    plain: "How common something is before you get any new clue.",
    example: "If 1 in 100 people has a condition, start from 1%, then update with the test result.",
  },
] as const;

export const CALIBRATION_CHECKS = [
  {
    question: "You say \"90% sure\" on 10 questions. If you are well calibrated, how many do you get right?",
    options: ["All 10", "About 9", "About 5"],
    answerIndex: 1,
    explanation: "90% sure means wrong about 1 time in 10. Getting all 10 every time means you could be more sure.",
  },
];
