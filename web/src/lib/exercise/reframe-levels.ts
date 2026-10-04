import type { PracticeLevel } from "@/lib/exercise/levels";
import type { ReframeAnswer, ReframeTag } from "@/lib/ai/validators/reframe";

/** What each level changes for Reframe exercises (PLAN-psychology.md P1). */
export interface ReframeLevelConfig {
  description: string;
  /** How many thoughts the character (or you) has. */
  thoughtCount: number;
  /** How many of them are realistic (decoys): [min, max]. */
  realistic: readonly [number, number];
  /** The traps the user can pick from at this level. */
  tags: readonly ReframeTag[];
  /** One thought per screen (answer shown), all thoughts as a list, or one inner monologue. */
  layout: "one-by-one" | "list" | "monologue";
  /** What the user is told up front: traps and realistic thoughts, traps only, or nothing. */
  countHint: "traps-and-realistic" | "traps" | null;
  /** Pick the balanced rewrite from 3, write one, or also write the evidence for and against. */
  rewrite: "choose" | "write" | "evidence";
  /** "My situation": build the exercise from something that really happened. */
  ownSituation: boolean;
  /** Scenario length asked of the generator. */
  scenarioWords: string;
  /** What kind of situation to write. */
  stakes: string;
  /** Rough time, shown at setup. */
  minutes: string;
}

const GUIDED_TAGS: readonly ReframeTag[] = ["all_or_nothing", "catastrophizing", "mind_reading", "should_statements"];
const STANDARD_TAGS: readonly ReframeTag[] = [
  ...GUIDED_TAGS,
  "overgeneralizing",
  "fortune_telling",
  "labeling",
  "personalizing",
];
const EXPERT_TAGS: readonly ReframeTag[] = [...STANDARD_TAGS, "emotional_reasoning", "discounting_positive"];

export const REFRAME_LEVELS: Record<PracticeLevel, ReframeLevelConfig> = {
  guided: {
    description: "An everyday situation. 4 thoughts, one at a time, 4 traps to pick from. Then choose the balanced thought.",
    thoughtCount: 4,
    realistic: [1, 1],
    tags: GUIDED_TAGS,
    layout: "one-by-one",
    countHint: "traps-and-realistic",
    rewrite: "choose",
    ownSituation: false,
    scenarioWords: "70-110",
    stakes: "an everyday, low-stakes setback (a small mistake, a message with no reply, a plan that changed)",
    minutes: "about 10 minutes",
  },
  standard: {
    description: "Work, family or money. 6 thoughts, 8 traps. Write a balanced thought yourself. You can use a situation of your own.",
    thoughtCount: 6,
    realistic: [1, 2],
    tags: STANDARD_TAGS,
    layout: "list",
    countHint: "traps",
    rewrite: "write",
    ownSituation: true,
    scenarioWords: "100-150",
    stakes: "a setback with real stakes at work, in the family or with money",
    minutes: "about 15 minutes",
  },
  expert: {
    description: "One inner monologue, all 10 traps, no hints. Some thoughts are fair. Write the evidence, then a balanced thought.",
    thoughtCount: 6,
    realistic: [0, 3],
    tags: EXPERT_TAGS,
    layout: "monologue",
    countHint: null,
    rewrite: "evidence",
    ownSituation: true,
    scenarioWords: "120-180",
    stakes: "a high-pressure situation with several people involved",
    minutes: "15-20 minutes",
  },
};

/** Name and check question for each trap ("a yes means this trap fits"). */
export const REFRAME_TAG_INFO: Record<ReframeTag, { name: string; question: string }> = {
  all_or_nothing: { name: "All-or-nothing", question: "Does it see only two extremes, with nothing in between?" },
  catastrophizing: { name: "Catastrophizing", question: "Does it jump to the worst possible result?" },
  mind_reading: { name: "Mind reading", question: "Does it guess what others think without asking?" },
  should_statements: { name: "Should statements", question: "Is there a rigid \"should\" or \"must\"?" },
  overgeneralizing: { name: "Overgeneralizing", question: "Does one event become \"always\" or \"never\"?" },
  fortune_telling: { name: "Fortune telling", question: "Does it state the future as if it were certain?" },
  labeling: { name: "Labeling", question: "Does one action become a label for the whole person?" },
  personalizing: { name: "Personalizing", question: "Does it take all the blame for something with many causes?" },
  emotional_reasoning: { name: "Emotional reasoning", question: "\"I feel it, so it must be true\"?" },
  discounting_positive: { name: "Discounting the positive", question: "Does it brush off something good (\"it was just luck\")?" },
};

export const REALISTIC_INFO = {
  name: "Realistic",
  question: "Is it based on facts, in proportion, and fair?",
} as const;

export function answerName(a: ReframeAnswer): string {
  return a === "realistic" ? REALISTIC_INFO.name : REFRAME_TAG_INFO[a].name;
}

/** Specific feeling words: naming a feeling precisely is the first step of a thought record. */
export const FEELING_WORDS = [
  "Anxious",
  "Embarrassed",
  "Ashamed",
  "Hurt",
  "Angry",
  "Frustrated",
  "Disappointed",
  "Guilty",
  "Sad",
  "Lonely",
  "Jealous",
  "Overwhelmed",
] as const;

/** Life areas offered as quick picks at setup. */
export const REFRAME_AREAS = ["Work", "Study", "Family", "Friends", "Relationships", "Money", "Health & habits"] as const;
