import type { PracticeLevel } from "@/lib/exercise/levels";
import type { JudgmentContext } from "@/lib/exercise/judgment-levels";

/** The four checks of a good light reply. */
export const HUMOR_STEPS = ["kind", "fits", "short", "twist"] as const;
export type HumorStep = (typeof HUMOR_STEPS)[number];

export const HUMOR_STEP_INFO: Record<HumorStep, { name: string; question: string }> = {
  kind: {
    name: "Kind",
    question: "Does nobody get hurt? Laugh at the moment or at yourself, not at a person.",
  },
  fits: {
    name: "Fits the room",
    question: "Does it fit the people and the mood? If the moment is serious, stay warm and skip the joke.",
  },
  short: {
    name: "Short",
    question: "Is it one or two lines, said lightly, with no long explaining?",
  },
  twist: {
    name: "Light twist",
    question: "Is there a small surprise: an honest admission, a playful exaggeration, or a link back to something said before?",
  },
};

/** What each level changes for light replies. */
export interface HumorLevelConfig {
  /** The level this config is for (prompts say who the learner is). */
  id: PracticeLevel;
  description: string;
  /** Moments in a row. */
  rounds: number;
  /** Pick the best of 3 replies, or write your own. */
  answerMode: "choose" | "write";
  /** Show the four checks while answering. */
  showSteps: boolean;
  /** What kind of moments to write. */
  pressure: string;
  /** One moment is serious, so the best reply is warm and has no joke. */
  seriousRound: boolean;
  /** "My situation": build the exercise from something that really happened. */
  ownSituation: boolean;
  /** Rough time, shown at setup. */
  minutes: string;
}

export const HUMOR_LEVELS: Record<PracticeLevel, HumorLevelConfig> = {
  guided: {
    id: "guided",
    description: "3 moments. Pick the best of 3 replies, with the four checks shown.",
    rounds: 3,
    answerMode: "choose",
    showSteps: true,
    pressure: "easy, friendly moments: a small mistake, a light tease from a friend, an awkward pause",
    seriousRound: false,
    ownSituation: false,
    minutes: "about 6 minutes",
  },
  standard: {
    id: "standard",
    description: "3 moments, one of them serious. Write your own replies. You can use a moment of your own.",
    rounds: 3,
    answerMode: "write",
    showSteps: true,
    pressure: "everyday moments with a little tension: a tease in front of others, your mistake in a meeting, a dull wait",
    seriousRound: true,
    ownSituation: true,
    minutes: "about 10 minutes",
  },
  expert: {
    id: "expert",
    description: "4 moments, one of them serious, with an audience. Write your replies, no hints.",
    rounds: 4,
    answerMode: "write",
    showSteps: false,
    pressure:
      "harder moments with people watching: a sharp tease from a senior person, a joke that fell flat, a tense group; one moment can call back to an earlier one",
    seriousRound: true,
    ownSituation: true,
    minutes: "about 14 minutes",
  },
};

/** Where the moment happens, offered as quick picks at setup. */
export const HUMOR_PLACES = ["At work", "Team chat", "With friends", "Family dinner", "Meeting someone new", "Online comments"] as const;

export type HumorContext = JudgmentContext;
