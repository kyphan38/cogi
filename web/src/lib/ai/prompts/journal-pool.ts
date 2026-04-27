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

export interface JournalPromptContext {
  exerciseType: string;
  missedIssueTypes?: string[];
  accuracy?: number;
  confidenceBefore?: number;
  /** confidence - accuracy > 20 */
  overconfident?: boolean;
  /** accuracy - confidence > 20 */
  underconfident?: boolean;
}

export const MISS_AWARE_PROMPTS: {
  condition: (ctx: JournalPromptContext) => boolean;
  prompt: JournalPromptItem;
}[] = [
  {
    condition: (ctx) => ctx.missedIssueTypes?.includes("hidden_assumption") ?? false,
    prompt: {
      id: "p_miss_assumption",
      text: "You missed a hidden assumption in this exercise. Looking back at the passage, what specifically caused you to overlook it? Was it speed, familiarity with the topic, or something else?",
    },
  },
  {
    condition: (ctx) => ctx.missedIssueTypes?.includes("weak_evidence") ?? false,
    prompt: {
      id: "p_miss_evidence",
      text: "You accepted weak evidence without flagging it. What made it feel convincing in the moment?",
    },
  },
  {
    condition: (ctx) => ctx.missedIssueTypes?.includes("bias") ?? false,
    prompt: {
      id: "p_miss_bias",
      text: "A bias-related issue slipped past you. Do you think the topic triggered a personal blind spot? What was your gut reaction to the passage?",
    },
  },
  {
    condition: (ctx) => ctx.overconfident === true,
    prompt: {
      id: "p_overconfident",
      text: "Your confidence was significantly higher than your accuracy. What felt certain that turned out to be wrong?",
    },
  },
  {
    condition: (ctx) => ctx.underconfident === true,
    prompt: {
      id: "p_underconfident",
      text: "You were much less confident than your actual performance. What did you think you got wrong that you actually got right?",
    },
  },
  {
    condition: (ctx) =>
      ctx.exerciseType === "sequential" &&
      ctx.accuracy !== undefined &&
      ctx.accuracy < 70,
    prompt: {
      id: "p_miss_dependency",
      text: "Some dependencies in your ordering were off. Did you rush the ordering, or did you misunderstand a causal relationship? Which specific step surprised you?",
    },
  },
  {
    condition: (ctx) =>
      ctx.exerciseType === "systems" && ctx.accuracy !== undefined && ctx.accuracy < 70,
    prompt: {
      id: "p_miss_ripple",
      text: "Your shock impact assessment differed from the model. Did you trace the ripple step-by-step, or did you estimate holistically? Which node surprised you?",
    },
  },
];

/**
 * Pick 3 prompts uniformly from ids not in `excludedIds`.
 * If fewer than 3 remain, refill from full pool (reset window behavior).
 */
export function pickJournalPrompts(
  excludedIds: Set<string>,
  context?: JournalPromptContext,
): JournalPromptItem[] {
  const picks: JournalPromptItem[] = [];

  if (context) {
    const applicable = MISS_AWARE_PROMPTS.filter(
      (m) => m.condition(context) && !excludedIds.has(m.prompt.id),
    ).map((m) => m.prompt);
    if (applicable.length > 0) picks.push(applicable[0]!);
  }

  const remaining = 3 - picks.length;
  const usedIds = new Set([...excludedIds, ...picks.map((p) => p.id)]);
  const available = JOURNAL_PROMPTS.filter((p) => !usedIds.has(p.id));
  const pool = available.length >= remaining ? available : [...JOURNAL_PROMPTS];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  picks.push(...shuffled.slice(0, remaining));

  return picks;
}
