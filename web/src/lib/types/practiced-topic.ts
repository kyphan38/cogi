/** Areas a suggested topic can belong to: one of the exercise types. */
export type PracticedTopicArea = "analytical" | "systems" | "evaluative" | "judgment" | "strategy" | "reframe" | "calibration";

export interface PracticedTopicEntry {
  id: string;
  area: PracticedTopicArea;
  /** Display title as shown to the user. */
  title: string;
  /** Normalized (trimmed, lowercased, collapsed whitespace) - used for exclusion matching. */
  titleKey: string;
  origin: "suggested" | "manual";
  /** ISO timestamp. */
  completedAt: string;
}
