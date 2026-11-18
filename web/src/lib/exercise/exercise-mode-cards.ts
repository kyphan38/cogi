export const ALL_EXERCISE_CARDS: {
  type: string;
  href: string;
  label: string;
  title: string;
  /** One short line, shown in the "All exercises" list. */
  desc: string;
}[] = [
  {
    type: "analytical",
    href: "/exercise/analytical",
    label: "Analytical",
    title: "Spot flawed reasoning",
    desc: "Find weak reasoning in a text.",
  },
  {
    type: "systems",
    href: "/exercise/systems",
    label: "Systems",
    title: "Map feedback loops",
    desc: "See how parts affect each other.",
  },
  {
    type: "evaluative",
    href: "/exercise/evaluative",
    label: "Evaluative",
    title: "Compare options fairly",
    desc: "Compare options and weigh what matters.",
  },
  {
    type: "judgment",
    href: "/exercise/judgment",
    label: "Life situations",
    title: "Handle real-life situations",
    desc: "Handle real moments through three lenses.",
  },
  {
    type: "tricky",
    href: "/exercise/tricky",
    label: "Tricky questions",
    title: "Answer tricky questions wisely",
    desc: "Answer a loaded question wisely.",
  },
  {
    type: "humor",
    href: "/exercise/humor",
    label: "Light replies",
    title: "Reply with light humor",
    desc: "Kind, short, a little funny.",
  },
  {
    type: "strategy",
    href: "/exercise/strategy",
    label: "Strategic situations",
    title: "Think like a game theorist",
    desc: "Best replies and where things settle.",
  },
  {
    type: "reframe",
    href: "/exercise/reframe",
    label: "Reframe",
    title: "Spot thinking traps",
    desc: "Rewrite a thought that is too dark.",
  },
  {
    type: "calibration",
    href: "/exercise/calibration",
    label: "Calibration",
    title: "Know how sure to be",
    desc: "Know how sure to be.",
  },
];

/**
 * Exercise types offered in the app, most used first (2026-10-02: evaluative 4,
 * systems 3, analytical 1 of 9 exercises). Old exercises of removed types still
 * show in History, under their raw type name.
 */
export const PRACTICE_EXERCISE_TYPES = ["evaluative", "systems", "analytical", "judgment", "tricky", "humor", "strategy", "reframe", "calibration"] as const;

export const PRACTICE_EXERCISE_CARDS = PRACTICE_EXERCISE_TYPES.map(
  (type) => ALL_EXERCISE_CARDS.find((c) => c.type === type)!,
);

/** The "All exercises" list: every practice type in one of three groups, by what it trains. */
export const EXERCISE_GROUPS: { title: string; types: (typeof PRACTICE_EXERCISE_TYPES)[number][] }[] = [
  { title: "Reason well", types: ["analytical", "evaluative", "calibration"] },
  { title: "Systems and games", types: ["systems", "strategy"] },
  { title: "People and yourself", types: ["judgment", "tricky", "humor", "reframe"] },
];

export const TYPE_LABEL: Record<string, string> = {
  analytical: "Analytical",
  systems: "Systems",
  evaluative: "Evaluative",
  judgment: "Life situations",
  tricky: "Tricky questions",
  humor: "Light replies",
  strategy: "Strategic situations",
  reframe: "Reframe",
  calibration: "Calibration",
  geo: "Geo Lab",
  quick: "5-minute question",
};
