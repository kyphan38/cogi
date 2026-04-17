export interface JournalPromptItem {
  id: string;
  text: string;
}

/** ≥12 prompts with stable ids (Phase 1.5 rotation). */
export const JOURNAL_PROMPTS: JournalPromptItem[] = [
  { id: "p_hesitate", text: "What made you hesitate the most while reading?" },
  { id: "p_assumption", text: "What assumption did you make without verifying?" },
  { id: "p_emotion", text: "What emotion might have influenced your judgment?" },
  { id: "p_evidence", text: "Which claim felt least supported by evidence?" },
  { id: "p_stakes", text: "What would be the cost if you were wrong about the main claim?" },
  { id: "p_alternative", text: "What alternative explanation did you briefly consider?" },
  { id: "p_time", text: "What time horizon were you implicitly using (days vs years)?" },
  { id: "p_stakeholder", text: "Which stakeholder perspective did you not model?" },
  { id: "p_contradict", text: "Did you notice any tension between two parts of the text?" },
  { id: "p_confidence", text: "What would change your mind about your top highlight?" },
  { id: "p_bias_self", text: "Where might your professional identity bias your reading?" },
  { id: "p_next_check", text: "What is one concrete fact you would look up next?" },
];

/**
 * Pick 3 prompts uniformly from ids not in `excludedIds`.
 * If fewer than 3 remain, refill from full pool (reset window behavior).
 */
export function pickJournalPrompts(excludedIds: Set<string>): JournalPromptItem[] {
  const available = JOURNAL_PROMPTS.filter((p) => !excludedIds.has(p.id));
  const pool = available.length >= 3 ? available : [...JOURNAL_PROMPTS];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}
