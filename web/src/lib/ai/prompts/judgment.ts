import type { JudgmentContext, JudgmentLevelConfig } from "@/lib/exercise/judgment-levels";
import { LENS_INFO } from "@/lib/exercise/judgment-levels";
import { JUDGMENT_LENSES } from "@/lib/ai/validators/judgment";

const CONTEXT_LINES: Record<JudgmentContext, string> = {
  vietnam:
    "Set the situation in Vietnam. Names, workplaces and family life should feel natural there (respect for seniority, saving face, family obligations, money between relatives). The best response must work in that culture, not only in a Western one. Write in English only: no Vietnamese words (say 'older colleague', not 'anh' or 'chi'), and write names without accent marks (Minh, Lan, Huong).",
  general: "Set the situation in a neutral, international setting.",
};

/**
 * A life-situation exercise (situational judgment): a scenario, terms to learn
 * first, one question per lens, and responses an expert ranks.
 */
export function buildJudgmentGenerationPrompt(input: {
  area: string;
  context: JudgmentContext;
  level: JudgmentLevelConfig;
  userContext?: string;
  /** "My situation": what really happened, in the user's words. */
  ownSituation?: string;
  adaptationAppendix?: string;
}): string {
  const n = input.level.responseCount;
  const ctx = input.userContext?.trim() ? `\nUser context (optional): ${input.userContext.trim()}` : "";
  const scenarioLine = input.ownSituation
    ? `Build the exercise from this situation the user really faced. Keep its facts; rewrite it in the second person ("you"), ${input.level.scenarioWords} words, and leave out names or details that identify real people:
"""
${input.ownSituation}
"""`
    : `Write ${input.level.stakes} in this area of life: ${input.area}. Use the second person ("you"), ${input.level.scenarioWords} words. End at the moment the reader must decide what to do.`;

  return `You are writing a practice exercise in real-life judgment for a learner who is still a beginner.${ctx}

${CONTEXT_LINES[input.context]}

${scenarioLine}

The learner reads the situation through three lenses:
${JUDGMENT_LENSES.map((l) => `- ${l} = ${LENS_INFO[l].name}: ${LENS_INFO[l].question}`).join("\n")}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "title": string (short, plain),
  "scenario": string,
  "concepts": [ { "term": string, "plain": string (one simple sentence), "example": string (one everyday example) } ] (exactly 3 ideas that help in THIS situation, e.g. "naming emotions", "what is in my control", "the cost of waiting"),
  "conceptChecks": [ { "question": string, "options": [string, string, string], "answerIndex": 0 | 1 | 2, "explanation": string } ] (exactly 1, testing one of the concepts),
  "lensQuestions": [
    { "lens": "think" | "people" | "steady", "question": string, "options": [string, string, string], "answerIndex": 0 | 1 | 2, "explanation": string }
  ] (exactly 3: one for each lens, about THIS situation; the right option is the most useful way to see it, the others are common but less useful readings),
  "responses": [ { "id": "r1", "text": string (what you would do or say, 1-2 sentences), "expertRank": number, "why": string (1-2 sentences, through the lenses), "lens": "think" | "people" | "steady" (the lens that best explains why it ranks where it does) } ] (exactly ${n}, ids r1..r${n})
}

Rules:
- expertRank: 1 = best, ${n} = worst, each used once. Shuffle so r1 is NOT always the best.
- All responses must be things real people often do. The best one is not perfect or saintly - it is realistic. The worst is tempting (e.g. avoiding, snapping back, giving in), not absurd.
- Vary which option index is correct across questions.
- A lens answer is a way to SEE the situation (what the real problem is, what someone feels, what you can control), never an action to take. It must not describe or repeat any of the responses: the learner sees the lens answers before ranking the responses.
- Plain, warm language. No therapy jargon unless it is one of the concepts.${input.adaptationAppendix ? `\n\n${input.adaptationAppendix}` : ""}`;
}
