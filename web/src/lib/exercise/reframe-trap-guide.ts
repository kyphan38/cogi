import type { ReframeTag } from "@/lib/ai/validators/reframe";
import type { TakeWithYouGuide } from "@/lib/exercise/take-with-you";

/**
 * How to use each thinking trap in real life, after the exercise: spot it, handle it in
 * yourself, respond when someone else says it, and a small practice. Written once and
 * checked by hand (CBT basics), so it is the same in every exercise; the AI only adds
 * examples for the exercise at hand (see take-with-you.ts).
 */
export const REFRAME_TRAP_GUIDE: Record<ReframeTag, TakeWithYouGuide> = {
  all_or_nothing: {
    spot: "The thought sees only two boxes: perfect or useless, success or failure. One flaw puts everything in the bad box.",
    signals: ["completely", "totally ruined", "useless", "if it's not perfect..."],
    ask: "Is there a middle? What score out of 10 would a fair person give it?",
    fix: "Split it into parts. Name one part that went badly and one part that went well.",
    othersTip: "Ask about the parts before you talk about the whole.",
    practice: "When you judge something as all bad or all good, give it a score out of 10 instead.",
  },
  catastrophizing: {
    spot: "The thought jumps from a problem to the worst ending, one step at a time, as if every step were sure.",
    signals: ["disaster", "I'll lose everything", "what if...", "it's over"],
    ask: "What is the worst result, the best result, and the most likely one?",
    fix: "Write down the most likely result, and one thing you could do if the worst did happen.",
    othersTip: "Take the worry seriously first, then ask what is most likely to happen.",
    practice: "When a \"what if\" chain starts, stop and write the most likely result next to it.",
  },
  mind_reading: {
    spot: "The thought says what other people think, but nobody said it. It often comes from a face, a silence or a late reply.",
    signals: ["they think...", "everyone could see...", "she must be angry", "he hates me"],
    ask: "What did they actually say or do?",
    fix: "Think of two other reasons for their face or silence. If it still matters, ask them.",
    othersTip: "Ask what the other person actually said. Do not tell your friend they are wrong.",
    practice: "Once a day, when you guess what someone thinks, write the guess and one fact next to it.",
  },
  should_statements: {
    spot: "The thought turns a wish into a hard rule for you or for others. When the rule breaks, you feel guilty or angry.",
    signals: ["should", "must", "have to", "never allowed to"],
    ask: "Who made this rule? Would I hold a good friend to it?",
    fix: "Change \"I should\" into \"I would like to\". Keep the goal and drop the punishment.",
    othersTip: "Ask what would really happen if the rule were broken once.",
    practice: "Count your \"shoulds\" for one day. Rewrite one of them as \"I would like to\".",
  },
  overgeneralizing: {
    spot: "One event becomes a rule about everything: always, never, every time.",
    signals: ["always", "never", "every time", "nothing ever works"],
    ask: "Is this one time, or really every time? When was it different?",
    fix: "Replace \"always\" or \"never\" with what really happened this time.",
    othersTip: "Ask about a time it went differently, and let them find it themselves.",
    practice: "When you say \"always\" or \"never\", find one exception and write it down.",
  },
  fortune_telling: {
    spot: "The thought states the future as a fact: it will go badly, they will say no.",
    signals: ["it will fail", "they'll say no", "there's no point", "I just know"],
    ask: "What do I really know now? What else could happen?",
    fix: "Turn the prediction into a test: find one small step that shows what really happens.",
    othersTip: "Ask what they know for sure, and what is still a guess.",
    practice: "Write down one prediction this week. Later, check what really happened.",
  },
  labeling: {
    spot: "One action becomes a label for the whole person: \"I'm an idiot\", \"he's lazy\".",
    signals: ["I'm such a...", "he's a...", "loser", "failure"],
    ask: "Am I describing one action, or judging a whole person?",
    fix: "Describe the action instead: \"I forgot the meeting\", not \"I'm useless\".",
    othersTip: "Talk about what happened, not about who they are.",
    practice: "When a label comes into your head, rewrite it as one sentence about the action.",
  },
  personalizing: {
    spot: "The thought takes all the blame for something with many causes, or reads events as being about you.",
    signals: ["it's all my fault", "because of me", "they did it to hurt me"],
    ask: "What else played a part? How much of it was really mine?",
    fix: "List every cause and give each one a share, yours too.",
    othersTip: "Ask what else played a part. Do not just say \"it wasn't your fault\".",
    practice: "When you blame yourself, draw a quick pie chart of all the causes.",
  },
  emotional_reasoning: {
    spot: "The thought treats a feeling as proof: \"I feel stupid, so I am\", \"I feel scared, so it is dangerous\".",
    signals: ["I feel like...", "it feels wrong, so...", "I just feel it"],
    ask: "What are the facts, apart from how I feel?",
    fix: "Name the feeling, then list the facts. Treat the feeling as a signal, not as proof.",
    othersTip: "Accept the feeling first, then ask what the facts are.",
    practice: "When a strong feeling comes, write \"I feel...\" and then \"The facts are...\".",
  },
  discounting_positive: {
    spot: "The thought brushes off something good: it was luck, anyone could do it, it doesn't count.",
    signals: ["just luck", "anyone could", "it doesn't count", "yes, but..."],
    ask: "If a friend did this, would I say it counts?",
    fix: "Say what you did to make the good thing happen. Take the praise without a \"but\".",
    othersTip: "Name the good thing they did, in concrete words.",
    practice: "Each evening, write one thing that went well and what you did to make it happen.",
  },
};
