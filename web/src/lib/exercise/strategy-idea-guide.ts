import type { TakeWithYouGuide } from "@/lib/exercise/take-with-you";

/** A "Take with you" card key for Strategic situations: one game theory idea. */
export const STRATEGY_IDEAS = ["best_reply", "equilibrium", "dominant_choice", "better_for_both", "two_equilibria"] as const;
export type StrategyIdea = (typeof STRATEGY_IDEAS)[number];

export const STRATEGY_IDEA_NAMES: Record<StrategyIdea, string> = {
  best_reply: "Best reply",
  equilibrium: "Where it settles",
  dominant_choice: "Dominant choice",
  better_for_both: "Better for both",
  two_equilibria: "Two ways it can settle",
};

/**
 * How to use each game theory idea in real life, after the exercise. Fixed text, the
 * same in every exercise; the AI only adds examples (see take-with-you.ts).
 */
export const STRATEGY_IDEA_GUIDE: Record<StrategyIdea, TakeWithYouGuide> = {
  best_reply: {
    spot: "You plan your move as if the other side will not react, or you guess their move from what you would do.",
    signals: ["they won't notice", "they'll just accept it", "I'd do the same in their place", "it only depends on us"],
    ask: "For each thing they might do, what is my best move? And for each thing I do, what is theirs?",
    fix: "Write their two or three likely moves and your best answer to each, before you choose.",
    othersTip: "Ask what the other side will most likely do next, and what they gain from it.",
    practice: "Before one negotiation or offer this week, write the other side's best reply to your plan.",
  },
  equilibrium: {
    spot: "A result lasts only when no side wants to change on its own. A deal that one side would leave is not stable.",
    signals: ["they'll keep to it", "it's a fair deal", "this will last", "why would they change?"],
    ask: "If nothing else changes, does either side gain by moving away from this?",
    fix: "Check each side in turn: could they do better by changing alone? If yes, expect it to move.",
    othersTip: "Ask what would make each side want to change, and whether that is already true.",
    practice: "Pick one habit at work or home that keeps coming back, and say why no one wants to change it alone.",
  },
  dominant_choice: {
    spot: "Some choices are best whatever the other side does. Then guessing their move is not needed.",
    signals: ["it depends on what they do", "let's wait and see", "we need to know their plan first", "whatever happens"],
    ask: "Is one of my options better in every case, whatever they do?",
    fix: "Compare your options case by case. If one wins every time, choose it and stop guessing.",
    othersTip: "Ask whether one option is better for them in every case.",
    practice: "For one choice this week, check if one option is best in every case before you worry about others.",
  },
  better_for_both: {
    spot: "Each side does what is best for itself, and both end up worse off: price wars, arms races, both refusing to share.",
    signals: ["if they cut, we must cut", "we can't be the first to stop", "everyone does it", "they'd take advantage"],
    ask: "Is there an outcome that is better for both of us than where we are heading?",
    fix: "Look for a way to make holding back safe: an agreement, a rule, a deposit, or a long-term relationship.",
    othersTip: "Ask what would make both sides safe to hold back at the same time.",
    practice: "Find one \"if they do it, we must too\" situation this week and name a rule that would help both.",
  },
  two_equilibria: {
    spot: "The same game can settle in two places. Where it ends up depends on what each side expects the other to do.",
    signals: ["who will go first?", "if only we knew their plan", "someone has to back down", "let's both commit"],
    ask: "Where else could this settle, and what would make both sides expect the better place?",
    fix: "Make your move visible and early, or agree on a simple signal, so both sides expect the same outcome.",
    othersTip: "Ask how both sides could know what the other will do, before they choose.",
    practice: "In one plan with others this week, say your choice out loud first and see if it helps everyone match.",
  },
};
