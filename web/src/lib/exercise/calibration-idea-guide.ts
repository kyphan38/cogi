import type { TakeWithYouGuide } from "@/lib/exercise/take-with-you";

/** A "Take with you" card key for Calibration: one idea about how sure to be. */
export const CALIBRATION_IDEAS = ["overconfidence", "wide_ranges", "underconfidence", "base_rates", "keep_score"] as const;
export type CalibrationIdea = (typeof CALIBRATION_IDEAS)[number];

export const CALIBRATION_IDEA_NAMES: Record<CalibrationIdea, string> = {
  overconfidence: "Overconfidence",
  wide_ranges: "Wide enough ranges",
  underconfidence: "Underconfidence",
  base_rates: "Base rates",
  keep_score: "Keep score",
};

/**
 * How to use each calibration idea in real life, after the exercise. Fixed text, the
 * same in every exercise; the AI only adds examples (see take-with-you.ts).
 */
export const CALIBRATION_IDEA_GUIDE: Record<CalibrationIdea, TakeWithYouGuide> = {
  overconfidence: {
    spot: "You feel sure, but your \"sure\" is right less often than it feels. Strong feelings and a good story make it worse.",
    signals: ["I'm certain", "no doubt", "everyone knows", "it's obvious"],
    ask: "How often have I been wrong when I felt this sure?",
    fix: "Before you act, name one way you could be wrong. If you can name it easily, lower your number.",
    othersTip: "Ask what would change their mind, not whether they are sure.",
    practice: "For three predictions this week, write how sure you are as a number, then check later.",
  },
  wide_ranges: {
    spot: "Your guess for a number starts from a first idea and stays too close to it, so the true value often falls outside.",
    signals: ["about...", "roughly the same as...", "it should take two days", "the budget will be enough"],
    ask: "What number would really surprise me on the low side? And on the high side?",
    fix: "Start from a number that is surely too low and one that is surely too high, then move in carefully.",
    othersTip: "Ask for a low and a high estimate, not a single number.",
    practice: "For one plan this week, give a time range you are 80% sure of, and see if it holds.",
  },
  underconfidence: {
    spot: "You say \"maybe\" or 50% when you actually know. That hides useful knowledge and slows decisions.",
    signals: ["I'm probably wrong", "it's just a guess", "who knows?", "I can't really say"],
    ask: "What do I actually know here, and how often am I right on things like this?",
    fix: "When your record is good, say a higher number and act on it.",
    othersTip: "Ask what they already know, and how often they have been right before.",
    practice: "Notice one time this week you said \"maybe\" when you knew, and say a number instead.",
  },
  base_rates: {
    spot: "A clue feels strong, so you forget how rare the thing is. A positive test for a rare problem is often a false alarm.",
    signals: ["the test was positive", "it fits the profile", "it looks just like...", "I saw one case"],
    ask: "How common is this before the clue? Out of 1,000 people, how many really have it?",
    fix: "Start from how common it is, then count true and false alarms out of 1,000 before you decide.",
    othersTip: "Ask how common it is in general before they trust one clue.",
    practice: "When you read a scary statistic this week, ask \"out of how many?\"",
  },
  keep_score: {
    spot: "Without a record, you remember the times you were right and forget the misses.",
    signals: ["I knew it", "I always had a feeling", "I was nearly right", "it doesn't count"],
    ask: "Did I write down how sure I was, before I knew the answer?",
    fix: "Keep a short decision journal: the guess, how sure you are, and later the result.",
    othersTip: "Suggest writing the guess and a number before the result is known.",
    practice: "Write down three guesses with a number this week, and check them at the end of the week.",
  },
};
