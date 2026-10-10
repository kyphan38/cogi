import type { JudgmentLens } from "@/lib/ai/validators/judgment";
import type { TakeWithYouGuide } from "@/lib/exercise/take-with-you";

/**
 * How to use each lens in real life, after the exercise: notice when you need it, use
 * it, help someone else with it, and a small practice. Fixed text, the same in every
 * exercise; the AI only adds examples (see take-with-you.ts).
 */
export const JUDGMENT_LENS_GUIDE: Record<JudgmentLens, TakeWithYouGuide> = {
  think: {
    spot: "You need this lens when you react to the loudest part of a problem, or see only one option.",
    signals: ["I have no choice", "I just have to...", "there's only one way", "I'll deal with it later"],
    ask: "What is the real problem here, and what are at least three options?",
    fix: "Write the options down. For each one, say what is most likely to happen next.",
    othersTip: "Help them list the options before they choose. Do not choose for them.",
    practice: "For one decision this week, write three options and the likely result of each.",
  },
  people: {
    spot: "You need this lens when you start explaining or defending yourself before you know how the other person feels.",
    signals: ["but I only...", "they're overreacting", "that's not what I meant", "let me explain"],
    ask: "What does the other person feel and need? How can I say this so they can hear it?",
    fix: "Name their feeling first (\"You seem upset about...\"), then say your point in one calm sentence.",
    othersTip: "Ask how the other person might see it, and how your friend could say it more kindly.",
    practice: "In one hard talk this week, name the other person's feeling before you make your point.",
  },
  steady: {
    spot: "You need this lens when a problem feels huge and permanent, or when you blame only yourself or only others.",
    signals: ["this is a disaster", "it's all my fault", "it's all their fault", "nothing will change"],
    ask: "What part can I control? How big will this be in a month?",
    fix: "Split it into what you can control and what you cannot. Take one small step on the first part.",
    othersTip: "Ask what part they can control, and what one small step could be.",
    practice: "When something upsets you this week, write what you can and cannot control.",
  },
};
