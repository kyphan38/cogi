import type { EmbeddedIssue } from "@/lib/types/exercise";
import type { TakeWithYouGuide } from "@/lib/exercise/take-with-you";

/** A "Take with you" card key for Analytical: an issue type, or sound reasoning. */
export type AnalyticalCardKey = EmbeddedIssue["type"] | "sound_reasoning";

export const SOUND_REASONING_NAME = "Sound reasoning";

/**
 * How to use each reasoning issue in real life, after the exercise: spot it in what you
 * read, check it, respond when someone argues this way, and a small practice. Fixed
 * text, the same in every exercise; the AI only adds examples (see take-with-you.ts).
 */
export const ANALYTICAL_ISSUE_GUIDE: Record<AnalyticalCardKey, TakeWithYouGuide> = {
  logical_fallacy: {
    spot: "The logic jumps: only two options when there are more, or a conclusion that goes further than the facts.",
    signals: ["either... or...", "so it must be", "that proves", "if we allow this, then..."],
    ask: "Does the conclusion really follow, or is there a step missing?",
    fix: "Write the argument as \"because A, so B\". Then look for a third option, or a B that A does not prove.",
    othersTip: "Ask about the missing step, not about the person's logic.",
    practice: "Find one \"either... or...\" this week and name a third option.",
  },
  hidden_assumption: {
    spot: "The text quietly takes something as true that it never shows. If that thing is false, the argument falls.",
    signals: ["of course", "obviously", "everyone knows", "naturally", "as long as..."],
    ask: "What must be true for this to work? Has anyone shown it?",
    fix: "Say the assumption out loud in one sentence, then ask how you would check it.",
    othersTip: "Name the assumption as a question: \"This works if X is true. Do we know X?\"",
    practice: "In one plan or ad this week, write down one thing it assumes without saying.",
  },
  weak_evidence: {
    spot: "A big claim rests on very little: one story, a small poll, a short period, or \"studies show\" with no study named.",
    signals: ["studies show", "many people say", "in my experience", "last month proves"],
    ask: "How many cases is this based on, and who counted them?",
    fix: "Look for one number or source that could prove the claim wrong, and check it.",
    othersTip: "Ask for the evidence with interest, not doubt: \"Where did that come from?\"",
    practice: "Pick one headline this week and find the number or source behind it.",
  },
  bias: {
    spot: "The writer shows only one side, or gains from the view they push. Facts that do not fit are left out.",
    signals: ["the only sensible choice", "critics simply don't understand", "best in class", "no downside"],
    ask: "Who wrote this, what do they gain, and what would the other side say?",
    fix: "Write the strongest point for the other side before you decide.",
    othersTip: "Ask what the other side would say, and listen to the answer.",
    practice: "Read one opinion this week, then find one fair point for the other side.",
  },
  framing_bias: {
    spot: "The text treats one side's interests as the normal, reasonable view, so the other side looks strange or extreme.",
    signals: ["the international community", "provocation", "a reasonable response", "stability"],
    ask: "Whose interests are described as \"normal\" here?",
    fix: "Rewrite one sentence from the other side's point of view and see what changes.",
    othersTip: "Ask how the same event would sound if the other side told it.",
    practice: "Compare two news reports on the same event from different countries.",
  },
  missing_actor: {
    spot: "Someone who is affected, or who could change the result, is never mentioned.",
    signals: ["both sides", "the two powers", "the deal", "everyone agrees"],
    ask: "Who else is affected, or could change the outcome, and why are they not here?",
    fix: "List every group that pays a cost or gains, then check which ones the text left out.",
    othersTip: "Ask \"What about...?\" for one group that was left out.",
    practice: "For one news story this week, name one actor the story never mentions.",
  },
  assumed_causation: {
    spot: "The text says A caused B only because B came after A, or because the two happen together.",
    signals: ["since then", "after", "led to", "as a result", "ever since"],
    ask: "Could something else have caused B, or could B have happened anyway?",
    fix: "Name one other cause, and ask what happened in a similar case without A.",
    othersTip: "Ask \"What else changed at the same time?\"",
    practice: "Find one \"since X, Y has...\" claim this week and name another possible cause.",
  },
  analogy_misuse: {
    spot: "A comparison with the past, or with another case, fits on the surface but breaks on an important point.",
    signals: ["just like", "another Munich", "history repeats", "the same as in..."],
    ask: "Where does the comparison break? What is really different this time?",
    fix: "List two ways the cases are alike and two ways they differ, then judge the comparison.",
    othersTip: "Ask what is different this time, not only what is the same.",
    practice: "When you hear \"this is just like...\" this week, name one big difference.",
  },
  sound_reasoning: {
    spot: "Good reasoning can look suspicious: a strong word, a firm rule, or a single example that is backed up by real evidence.",
    signals: ["based on data from...", "in this case", "with limits", "measured over..."],
    ask: "Is the strong claim backed by evidence that fits it, with its limits stated?",
    fix: "Before you call something a problem, say exactly what is wrong. If you cannot, it may be sound.",
    othersTip: "When someone argues well, say what made it convincing. Don't look for a flaw just to find one.",
    practice: "Find one well-argued text this week and name the evidence that makes it strong.",
  },
};
