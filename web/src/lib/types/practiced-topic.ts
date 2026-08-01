/** Areas a suggested topic can belong to: the 5 exercise thinking types, or a Math topic. */
export type PracticedTopicArea =
  | "analytical"
  | "sequential"
  | "systems"
  | "evaluative"
  | "generative"
  | "expected_value"
  | "graph_theory"
  | "game_theory"
  | "probability_bayes"
  | "causal_literacy"
  | "exponential_power_law";

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
