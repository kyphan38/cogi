export const ALL_EXERCISE_CARDS: {
  type: string;
  href: string;
  label: string;
  title: string;
  desc?: string;
}[] = [
  {
    type: "analytical",
    href: "/exercise/analytical",
    label: "Analytical",
    title: "Spot flawed reasoning",
    desc: "Find embedded issues and decoys in a short passage.",
  },
  {
    type: "systems",
    href: "/exercise/systems",
    label: "Systems",
    title: "Map feedback loops",
    desc: "Draw nodes and edges, then trace a shock ripple.",
  },
  {
    type: "evaluative",
    href: "/exercise/evaluative",
    label: "Evaluative",
    title: "Compare options fairly",
    desc: "Matrix or weighted scoring against hidden tradeoffs.",
  },
];

/**
 * Exercise types offered in the app, most used first (2026-10-02: evaluative 4,
 * systems 3, analytical 1 of 9 exercises). Old exercises of removed types still
 * show in History, under their raw type name.
 */
export const PRACTICE_EXERCISE_TYPES = ["evaluative", "systems", "analytical"] as const;

export const PRACTICE_EXERCISE_CARDS = PRACTICE_EXERCISE_TYPES.map(
  (type) => ALL_EXERCISE_CARDS.find((c) => c.type === type)!,
);

export const TYPE_LABEL: Record<string, string> = {
  analytical: "Analytical",
  systems: "Systems",
  evaluative: "Evaluative",
};
