// One line per exercise step: what to do in it (PLAN-guide G2).
// Keyed by the step label the flow shows in the progress bar.

export const STEP_GOALS: Readonly<
  Record<string, { full: string; short: string }>
> = {
  Setup: { full: "Pick a topic and a level, then start.", short: "topic and level" },
  Answer: { full: "Answer on your own before any help.", short: "on your own" },
  Evaluate: {
    full: "Set your criteria before you score the options.",
    short: "criteria first",
  },
  "Highlight & tag": {
    full: "Mark the claims and the hidden steps.",
    short: "mark the claims",
  },
  "Map the system": {
    full: "Find the parts, then how they push each other.",
    short: "parts, then links",
  },
  "Read the game": {
    full: "Think what each side wants and fears.",
    short: "wants and fears",
  },
  Reply: {
    full: "Write your reply as if it were real.",
    short: "reply for real",
  },
  "Think it through": {
    full: "Write your own view before you see others.",
    short: "your view first",
  },
  "AI feedback": {
    full: "Compare, then keep one line you learned.",
    short: "keep one line",
  },
};

export function stepGoal(
  label: string | undefined,
): { full: string; short: string } | null {
  return label ? (STEP_GOALS[label] ?? null) : null;
}
