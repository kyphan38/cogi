import type { PracticeLevel } from "@/lib/exercise/levels";
import type { JudgmentContext } from "@/lib/exercise/judgment-levels";

/** The four moves of a wise answer to a tricky question. */
export const TRICKY_STEPS = ["criteria", "view", "fair", "handBack"] as const;
export type TrickyStep = (typeof TRICKY_STEPS)[number];

export const TRICKY_STEP_INFO: Record<TrickyStep, { name: string; question: string }> = {
  criteria: {
    name: "Ask what matters",
    question: "Did I ask (or name) what the decision needs, instead of who I like?",
  },
  view: {
    name: "Give a clear view",
    question: "Did I give a real view on the work, not a dodge?",
  },
  fair: {
    name: "Be fair to everyone",
    question: "Did I say something good about the other side and put nobody down?",
  },
  handBack: {
    name: "Hand the decision back",
    question: "Did I leave the final call with the person who owns it?",
  },
};

/** What each level changes for tricky questions. */
export interface TrickyLevelConfig {
  /** The level this config is for (prompts say who the learner is). */
  id: PracticeLevel;
  description: string;
  /** Questions in a row: the opening question, then follow-ups that push harder. */
  rounds: number;
  /** Pick the best of 3 answers, or write your own. */
  answerMode: "choose" | "write";
  /** Show the four steps while answering. */
  showSteps: boolean;
  /** What kind of pressure to write. */
  pressure: string;
  /** "My situation": build the exercise from something that really happened. */
  ownSituation: boolean;
  /** Rough time, shown at setup. */
  minutes: string;
}

export const TRICKY_LEVELS: Record<PracticeLevel, TrickyLevelConfig> = {
  guided: {
    id: "guided",
    description: "2 questions. Pick the best of 3 answers, with the four steps shown.",
    rounds: 2,
    answerMode: "choose",
    showSteps: true,
    pressure: "a friendly person asks in private; the follow-up pushes once, politely",
    ownSituation: false,
    minutes: "about 8 minutes",
  },
  standard: {
    id: "standard",
    description: "2 questions. Write your own answers. You can use a situation of your own.",
    rounds: 2,
    answerMode: "write",
    showSteps: true,
    pressure: "the person wants a real answer; the follow-up says your first answer was not enough",
    ownSituation: true,
    minutes: "about 12 minutes",
  },
  expert: {
    id: "expert",
    description: "3 questions, more pressure, others listening. Write your answers, no step hints.",
    rounds: 3,
    answerMode: "write",
    showSteps: false,
    pressure:
      "others are listening or the stakes are high; each follow-up closes an exit (for example 'I know you like both, but you must pick one now')",
    ownSituation: true,
    minutes: "about 15 minutes",
  },
};

/** Who asks the question, offered as quick picks at setup. */
export const TRICKY_ASKERS = ["Your boss", "A colleague", "A job interviewer", "A client", "Family", "A friend"] as const;

export type TrickyContext = JudgmentContext;
