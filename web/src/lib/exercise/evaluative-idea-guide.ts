import type { TakeWithYouGuide } from "@/lib/exercise/take-with-you";

/** A "Take with you" card key for Evaluative: one decision idea. */
export const EVALUATIVE_IDEAS = [
  "two_criteria",
  "weighing",
  "hidden_criteria",
  "dealbreakers",
  "expected_value",
  "stakeholders",
] as const;
export type EvaluativeIdea = (typeof EVALUATIVE_IDEAS)[number];

export const EVALUATIVE_IDEA_NAMES: Record<EvaluativeIdea, string> = {
  two_criteria: "The two criteria that matter",
  weighing: "Weighing what matters",
  hidden_criteria: "Hidden criteria",
  dealbreakers: "Dealbreakers",
  expected_value: "Expected value",
  stakeholders: "Who else is affected",
};

/**
 * How to use each decision idea in real life, after the exercise. Fixed text, the same
 * in every exercise; the AI only adds examples (see take-with-you.ts).
 */
export const EVALUATIVE_IDEA_GUIDE: Record<EvaluativeIdea, TakeWithYouGuide> = {
  two_criteria: {
    spot: "A choice feels hard because everything seems to matter. Usually two things decide it, and the rest is noise.",
    signals: ["there are so many factors", "I can't decide", "pros and cons list", "it depends"],
    ask: "If I could judge this on only two things, which two would they be?",
    fix: "Draw a 2x2 with those two things as axes and place each option. Then look at the top-right corner.",
    othersTip: "Ask which two things matter most to them, then help them place the options.",
    practice: "For one choice this week, name the two criteria that decide it, before you look at the options.",
  },
  weighing: {
    spot: "All criteria get the same weight, or the loudest one wins. Some things matter far more than others.",
    signals: ["everything is important", "it's the cheapest", "but it looks nice", "price is all that matters"],
    ask: "If I could improve only one criterion, which would I choose? Which would I give up first?",
    fix: "Give each criterion a weight from 1 to 5 before you score the options. Do not change the weights after you see the totals.",
    othersTip: "Ask what they would give up first. That shows what matters least.",
    practice: "For one purchase or plan, write the weights before you compare the options.",
  },
  hidden_criteria: {
    spot: "A criterion nobody wrote down decides the outcome later: upkeep, time, stress, lock-in, how others react.",
    signals: ["we'll figure that out later", "that's a detail", "it's only the price", "no one will mind"],
    ask: "What will matter in six months that nobody has mentioned yet?",
    fix: "Before you choose, ask one person who has lived with a similar choice what they wish they had weighed.",
    othersTip: "Ask what they might regret not thinking about.",
    practice: "Add one hidden criterion to a decision this week and see if it changes the ranking.",
  },
  dealbreakers: {
    spot: "Some limits cannot be traded: safety, the law, a hard budget. A high score elsewhere cannot make up for failing one.",
    signals: ["it's great except...", "we can live with the risk", "it's only slightly over budget", "the rest makes up for it"],
    ask: "Is there anything this option must not fail, whatever else it offers?",
    fix: "Name your dealbreakers first and remove every option that fails one. Only then compare the rest.",
    othersTip: "Ask what would make them say no to an option straight away.",
    practice: "Write your dealbreakers before your next big choice, and check each option against them first.",
  },
  expected_value: {
    spot: "A choice has several possible results. The best-sounding result or the scariest one is not the whole picture.",
    signals: ["what if it goes really well?", "it could go wrong", "it's a sure thing", "the upside is huge"],
    ask: "What are the possible results, how likely is each, and what is each worth?",
    fix: "Multiply each result by its chance and add them up. Then ask if you can live with the worst case.",
    othersTip: "Ask how likely each result really is, not only how good or bad it would be.",
    practice: "For one risky choice, write the chance and the value of each result before you decide.",
  },
  stakeholders: {
    spot: "A decision looks best for the one who decides, but other groups pay the costs or can block it.",
    signals: ["everyone will accept it", "it's our decision", "they'll get used to it", "no one else is affected"],
    ask: "Who else gains or loses from this, and what can they do about it?",
    fix: "List every group affected. For the two biggest, say how they will react.",
    othersTip: "Ask who else this touches and how they might respond.",
    practice: "For one decision at work or at home, name two other people it affects and how.",
  },
};
