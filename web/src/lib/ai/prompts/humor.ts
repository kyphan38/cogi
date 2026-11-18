import type { HumorContext, HumorLevelConfig } from "@/lib/exercise/humor-levels";
import { HUMOR_STEP_INFO, HUMOR_STEPS } from "@/lib/exercise/humor-levels";
import { safetyFirstRule } from "@/lib/exercise/crisis-safety";
import { learnerFor } from "@/lib/ai/prompts/learner";

const CONTEXT_LINES: Record<HumorContext, string> = {
  vietnam:
    "Set it in Vietnam. People and places should feel natural there (respect for seniority, saving face, harmony in the group). A good reply must work in that culture: a light joke at a senior person's expense is risky; laughing at yourself is safer. Write in English only: no Vietnamese words (say 'your manager', not 'anh' or 'chi'), and write names without accent marks (Minh, Lan, Huong).",
  general: "Set it in a neutral, international setting.",
};

export const HUMOR_STEPS_TEXT = HUMOR_STEPS.map((s, i) => `${i + 1}. ${HUMOR_STEP_INFO[s].name}: ${HUMOR_STEP_INFO[s].question}`).join("\n");

/**
 * A light-replies exercise: short social moments (a tease, a small mistake, an awkward
 * pause) where a light, kind reply works best. Each round has three replies (best, ok,
 * poor); the best one is also the model reply.
 */
export function buildHumorGenerationPrompt(input: {
  place: string;
  context: HumorContext;
  level: HumorLevelConfig;
  userContext?: string;
  /** "My situation": a moment the user really faced. */
  ownSituation?: string;
  adaptationAppendix?: string;
}): string {
  const n = input.level.rounds;
  const ctx = input.userContext?.trim() ? `\nUser context (optional): ${input.userContext.trim()}` : "";
  const source = input.ownSituation
    ? `Build the exercise from this moment the user really faced. Keep its facts; the first round is that moment. Leave out names or details that identify real people:
"""
${input.ownSituation}
"""

${safetyFirstRule("title, setting, concepts, conceptChecks and rounds")}`
    : `Where: ${input.place}. Invent the moments. Set "safety": "ok".`;
  const serious = input.level.seriousRound
    ? `Exactly one round (not the first) is serious ("serious": true): someone shares bad news, is upset, or the stakes are real. There the "best" reply has no joke: it is warm and plain. The "poor" reply jokes anyway. This teaches when not to joke.`
    : `No round is serious: set "serious": false for every round.`;

  return `You are writing a practice exercise for ${learnerFor(input.level.id)}: replying with light, kind humor in everyday social moments.${ctx}

${CONTEXT_LINES[input.context]}

${source}

The goal is not to be a comedian. It is to ease a moment, show you are relaxed, and make people feel good. Useful moves: laughing at yourself (gently, not putting yourself down), an honest admission said lightly, a playful exaggeration, calling back to something said earlier, agreeing with a tease and making it bigger.

A good light reply passes four checks:
${HUMOR_STEPS_TEXT}

Moments: ${input.level.pressure}.
${serious}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "safety": "ok" | "concern",
  "title": string (short, plain),
  "setting": string (2-3 sentences, second person "you": where you are, who is there, and the mood),
  "concepts": [ { "term": string, "plain": string (one simple sentence), "example": string (one everyday example, with the actual words) } ] (exactly 3 moves that help here, e.g. "laugh at yourself", "agree and exaggerate", "callback"),
  "conceptChecks": [ { "question": string, "options": [string, string, string], "answerIndex": 0 | 1 | 2, "explanation": string } ] (exactly 1, testing one of the moves),
  "rounds": [
    {
      "moment": string (what happens or what someone says, with their words in quotes, 1-2 sentences),
      "serious": boolean,
      "trap": string (2-4 words: the common mistake here, e.g. "Hitting back", "Over-explaining", "Joking at the wrong time"),
      "trapWhy": string (one sentence: why people fall into it),
      "options": [ { "text": string (what you could say, 1-2 short sentences, first person), "quality": "best" | "ok" | "poor", "why": string (one sentence) } ] (exactly 3: one "best", one "ok", one "poor", in mixed order)
    }
  ] (exactly ${n})
}

Rules:
- Every moment must work on its own, whatever the user said before.
- The "best" reply is something a relaxed, warm person would really say. Clever is fine; mean is never fine. It should make a reader smile, not groan.
- The "poor" reply is tempting: a sharp comeback that hurts someone, getting defensive, a long explanation, or a joke that ignores the mood. Never absurd.
- The "ok" reply is safe but flat, or a little too long, or a joke that half lands.
- No jokes about looks, body, gender, religion, region, money troubles or anyone who is not there.
- Vary the position of the "best" reply across rounds.
- Plain, warm language. Short sentences.${input.adaptationAppendix ? `\n\n${input.adaptationAppendix}` : ""}`;
}
