import type { TrickyContext, TrickyLevelConfig } from "@/lib/exercise/tricky-levels";
import { TRICKY_STEP_INFO, TRICKY_STEPS } from "@/lib/exercise/tricky-levels";
import { safetyFirstRule } from "@/lib/exercise/crisis-safety";
import { learnerFor } from "@/lib/ai/prompts/learner";

const CONTEXT_LINES: Record<TrickyContext, string> = {
  vietnam:
    "Set it in Vietnam. Workplaces and families should feel natural there (respect for seniority, saving face, harmony in the group). The best answer must work in that culture: polite to the senior person, no public loss of face for anyone. Write in English only: no Vietnamese words (say 'your manager', not 'anh' or 'chi'), and write names without accent marks (Minh, Lan, Huong).",
  general: "Set it in a neutral, international setting.",
};

export const TRICKY_STEPS_TEXT = TRICKY_STEPS.map((s, i) => `${i + 1}. ${TRICKY_STEP_INFO[s].name}: ${TRICKY_STEP_INFO[s].question}`).join("\n");

/**
 * A tricky-question exercise: someone asks a loaded question (pick A or B, rank two
 * colleagues, "what if"), then pushes harder in follow-ups. Each round has three
 * answers (best, ok, poor); the best one is also the model answer.
 */
export function buildTrickyGenerationPrompt(input: {
  asker: string;
  context: TrickyContext;
  level: TrickyLevelConfig;
  userContext?: string;
  /** "My situation": the tricky question the user really faced. */
  ownSituation?: string;
  adaptationAppendix?: string;
}): string {
  const n = input.level.rounds;
  const ctx = input.userContext?.trim() ? `\nUser context (optional): ${input.userContext.trim()}` : "";
  const source = input.ownSituation
    ? `Build the exercise from this moment the user really faced. Keep its facts and the real question; leave out names or details that identify real people:
"""
${input.ownSituation}
"""

${safetyFirstRule("title, setting, concepts, conceptChecks and rounds")}`
    : `The person who asks: ${input.asker}. Invent the moment. Set "safety": "ok".`;

  return `You are writing a practice exercise for ${learnerFor(input.level.id)}: answering a tricky, loaded question wisely.${ctx}

${CONTEXT_LINES[input.context]}

${source}

A tricky question puts the listener in a bad spot: a forced choice between two people ("A or B?"), ranking colleagues, a loyalty test, a "just imagine" question, a leading question, or a question about someone who is not there. Dodging looks weak; answering head-on can hurt someone or the listener.

A wise answer uses four steps:
${TRICKY_STEPS_TEXT}
When the question is about personality or private life, a wise answer refuses softly and brings it back to the work.

Pressure: ${input.level.pressure}.

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "safety": "ok" | "concern",
  "title": string (short, plain),
  "setting": string (2-4 sentences, second person "you": who asks, where, who else is listening, and what is going on),
  "asker": string (who asks, 1-3 words, e.g. "Your manager"),
  "concepts": [ { "term": string, "plain": string (one simple sentence), "example": string (one everyday example) } ] (exactly 3 ideas that help here, e.g. "false choice", "criteria before names", "the decision owner"),
  "conceptChecks": [ { "question": string, "options": [string, string, string], "answerIndex": 0 | 1 | 2, "explanation": string } ] (exactly 1, testing one of the concepts),
  "rounds": [
    {
      "question": string (what the person says, in their own voice, 1-2 sentences),
      "trap": string (2-4 words, e.g. "Forced choice"),
      "trapWhy": string (one sentence: why this question is hard to answer well),
      "options": [ { "text": string (an answer the listener could say, 1-3 sentences, first person), "quality": "best" | "ok" | "poor", "why": string (one sentence) } ] (exactly 3: one "best", one "ok", one "poor", in mixed order)
    }
  ] (exactly ${n})
}

Rules:
- Round 1 is the opening question. Each later round is a follow-up that pushes harder. It must make sense whatever the listener said before (e.g. "I hear you, but if you had to pick one?", "So you think B is weaker?", "Others already told me who they prefer.").
- The "best" answer uses the four steps in a natural way, fits the culture, and sounds like a real person, not a script.
- The "poor" answer is tempting: a flat dodge ("I can't answer that"), putting someone down, or giving in to the pressure. Never absurd.
- The "ok" answer gets part of it right (e.g. picks fairly but forgets to hand the decision back, or is fair but gives no view).
- Vary the position of the "best" answer across rounds.
- Plain, warm language. Short sentences.${input.adaptationAppendix ? `\n\n${input.adaptationAppendix}` : ""}`;
}
