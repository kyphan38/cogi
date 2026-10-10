import type { TakeWithYouGuide } from "@/lib/exercise/take-with-you";

/** A "Take with you" card key for Systems: one systems idea. */
export const SYSTEMS_IDEAS = [
  "ripple_effects",
  "hidden_dependencies",
  "trade_offs",
  "risks",
  "feedback_loops",
  "single_points_of_failure",
] as const;
export type SystemsIdea = (typeof SYSTEMS_IDEAS)[number];

export const SYSTEMS_IDEA_NAMES: Record<SystemsIdea, string> = {
  ripple_effects: "Ripple effects",
  hidden_dependencies: "Hidden dependencies",
  trade_offs: "Trade-offs",
  risks: "Risks",
  feedback_loops: "Feedback loops",
  single_points_of_failure: "Single points of failure",
};

/**
 * How to use each systems idea in real life, after the exercise. Fixed text, the same in
 * every exercise; the AI only adds examples (see take-with-you.ts).
 */
export const SYSTEMS_IDEA_GUIDE: Record<SystemsIdea, TakeWithYouGuide> = {
  ripple_effects: {
    spot: "A change hits one part first, then spreads to parts that seem far away. The second wave is often bigger and slower.",
    signals: ["and then what?", "it only affects...", "that's not our problem", "a small change"],
    ask: "Who or what does this touch next, and what does that touch after it?",
    fix: "Before you act, write the chain three steps out: first effect, second effect, third effect.",
    othersTip: "Ask \"And then what happens?\" two times. Let them find the next step.",
    practice: "For one change at work or at home this week, write three steps of what follows from it.",
  },
  hidden_dependencies: {
    spot: "Something works only because something else quietly holds it up. Nobody notices it until it stops.",
    signals: ["it just works", "we've always had...", "someone usually handles that", "it can't fail"],
    ask: "What does this need in order to work, and who or what provides it?",
    fix: "List what one important thing depends on. Mark anything with no backup.",
    othersTip: "Ask what their plan needs to work, and what happens if that thing is missing.",
    practice: "Pick one thing you rely on every day and name two things it depends on.",
  },
  trade_offs: {
    spot: "Two goals pull against each other: more of one means less of the other. A plan that ignores this breaks later.",
    signals: ["we can have both", "faster and cheaper", "no downside", "just add more"],
    ask: "If this goes up, what goes down?",
    fix: "Name what you give up for what you gain, then decide if the price is worth it.",
    othersTip: "Ask what they are willing to give up for it.",
    practice: "For one choice this week, write what you gain and what you give up.",
  },
  risks: {
    spot: "One part can put another in danger, even when everything looks fine today.",
    signals: ["what could go wrong?", "it's never happened", "we'll deal with it if...", "only one supplier"],
    ask: "What could this part break, and how would I know early?",
    fix: "Pick the biggest risk and set one early warning sign to watch.",
    othersTip: "Ask what would hurt most if it went wrong, and how early they would see it.",
    practice: "Name one risk in a plan of yours and one early sign that it is starting.",
  },
  feedback_loops: {
    spot: "A goes up, which pushes B, which pushes A again. Loops make things grow fast, or keep them stuck.",
    signals: ["the more..., the more...", "vicious circle", "it keeps getting worse", "snowball"],
    ask: "Does the result feed back into the cause?",
    fix: "Draw the loop as a circle of arrows, then find the one link you can weaken or strengthen.",
    othersTip: "Ask what keeps the problem going, not only what started it.",
    practice: "Find one \"the more..., the more...\" loop in your week and draw it.",
  },
  single_points_of_failure: {
    spot: "Many parts depend on one person, tool or supplier. If it fails, everything stops.",
    signals: ["only she knows how", "our one supplier", "the main server", "everything goes through..."],
    ask: "If this one thing fails tomorrow, what stops with it?",
    fix: "Find the part that most others depend on, and give it a backup or a second person.",
    othersTip: "Ask what happens if that one person or tool is not there next week.",
    practice: "Name one single point of failure in your work or home, and one way to back it up.",
  },
};
