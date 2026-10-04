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
  {
    type: "judgment",
    href: "/exercise/judgment",
    label: "Life situations",
    title: "Handle real-life situations",
    desc: "Read a situation through three lenses, then choose how to respond.",
  },
  {
    type: "strategy",
    href: "/exercise/strategy",
    label: "Strategic situations",
    title: "Think like a game theorist",
    desc: "Find each side's best reply and predict where they end up.",
  },
  {
    type: "reframe",
    href: "/exercise/reframe",
    label: "Reframe",
    title: "Spot thinking traps",
    desc: "Name the traps in a hard moment, then rewrite one thought fairly.",
  },
  {
    type: "calibration",
    href: "/exercise/calibration",
    label: "Calibration",
    title: "Know how sure to be",
    desc: "Answer, say how sure you are, and see if your confidence matches your results.",
  },
];

/**
 * Exercise types offered in the app, most used first (2026-10-02: evaluative 4,
 * systems 3, analytical 1 of 9 exercises). Old exercises of removed types still
 * show in History, under their raw type name.
 */
export const PRACTICE_EXERCISE_TYPES = ["evaluative", "systems", "analytical", "judgment", "strategy", "reframe", "calibration"] as const;

export const PRACTICE_EXERCISE_CARDS = PRACTICE_EXERCISE_TYPES.map(
  (type) => ALL_EXERCISE_CARDS.find((c) => c.type === type)!,
);

export const TYPE_LABEL: Record<string, string> = {
  analytical: "Analytical",
  systems: "Systems",
  evaluative: "Evaluative",
  judgment: "Life situations",
  strategy: "Strategic situations",
  reframe: "Reframe",
  calibration: "Calibration",
  geo: "Geo Lab",
};
