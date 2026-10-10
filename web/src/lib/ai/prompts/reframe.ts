import type { JudgmentContext } from "@/lib/exercise/judgment-levels";
import { REFRAME_TAG_INFO, type ReframeLevelConfig } from "@/lib/exercise/reframe-levels";

const CONTEXT_LINES: Record<JudgmentContext, string> = {
  vietnam:
    "Set the situation in Vietnam. Names, workplaces and family life should feel natural there (respect for seniority, saving face, family expectations). Write in English only: no Vietnamese words (say 'older colleague', not 'anh' or 'chi'), and write names without accent marks (Minh, Lan, Huong).",
  general: "Set the situation in a neutral, international setting.",
};

/**
 * A Reframe exercise (CBT thought record): a setback, the automatic thoughts that
 * follow it - some distorted, some realistic - and a balanced rewrite of one.
 */
export function buildReframeGenerationPrompt(input: {
  area: string;
  context: JudgmentContext;
  level: ReframeLevelConfig;
  userContext?: string;
  /** "My situation": what really happened, in the user's words. */
  ownSituation?: string;
  adaptationAppendix?: string;
}): string {
  const lv = input.level;
  const n = lv.thoughtCount;
  const [minR, maxR] = lv.realistic;
  const realisticLine =
    minR === maxR ? `exactly ${minR} of them realistic` : `between ${minR} and ${maxR} of them realistic (vary it)`;
  const ctx = input.userContext?.trim() ? `\nUser context (optional): ${input.userContext.trim()}` : "";
  const scenarioLine = input.ownSituation
    ? `Build the exercise from this situation the user really faced. Keep its facts; rewrite it in the second person ("you"), ${lv.scenarioWords} words, and leave out names or details that identify real people. The thoughts are thoughts "you" might have.
"""
${input.ownSituation}
"""

SAFETY FIRST: if the situation mentions self-harm, suicide, abuse, violence, danger, or a crisis that needs real help, set "safety": "concern" and return empty strings and empty arrays for everything else (rewrite: thoughtId "", options ["", "", ""], answerIndex 0, explanation "", balancedExample ""). Otherwise set "safety": "ok".`
    : `Write ${lv.stakes} in this area of life: ${input.area}. Tell it in the third person about one named character, ${lv.scenarioWords} words. End right after the setback, when the thoughts start. Set "safety": "ok".`;
  const thoughtForm =
    lv.layout === "monologue"
      ? "The thoughts run together as one inner monologue, so each must read naturally after the one before (one or two sentences each, first person)."
      : "Each thought is one or two sentences, in the first person, as the person would say it to themselves.";

  return `You are writing a practice exercise in spotting thinking traps (cognitive distortions, as in CBT) for a learner who is still a beginner. This is thinking practice, not therapy.${ctx}

${CONTEXT_LINES[input.context]}

${scenarioLine}

Thinking traps allowed at this level (use only these ids):
${lv.tags.map((t) => `- ${t} = ${REFRAME_TAG_INFO[t].name}: ${REFRAME_TAG_INFO[t].question}`).join("\n")}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "safety": "ok" | "concern",
  "title": string (short, plain),
  "scenario": string,
  "concepts": [ { "term": string, "plain": string (one simple sentence), "example": string (one everyday example) } ] (exactly 3: the traps that matter most in THIS exercise, or the idea "a realistic thought is not the same as a positive thought"),
  "conceptChecks": [ { "question": string, "options": [string, string, string], "answerIndex": 0 | 1 | 2, "explanation": string } ] (exactly 1, testing one of the concepts),
  "thoughts": [ { "id": "t1", "text": string, "trap": one of the trap ids above, or "realistic" for a fair thought, "alsoAccepted": [trap ids] (other traps from the list that ALSO fairly fit; [] when none, always [] for a realistic thought), "why": string (1-2 sentences: what makes it a trap, or why it is fair) } ] (exactly ${n}, ids t1..t${n}, ${realisticLine}),
  "rewrite": {
    "thoughtId": string (the id of one distorted thought, the one that hurts most),
    "question": "Which is the most balanced way to think about it?",
    "options": [string, string, string],
    "answerIndex": 0 | 1 | 2,
    "explanation": string,
    "balancedExample": string (a balanced version of that thought, 1-2 sentences)
  }
}

Rules:
- ${thoughtForm}
- Thoughts must sound like real automatic thoughts, not textbook examples. Each distorted thought shows one main trap clearly.
- A realistic thought is fair and based on facts, but it may still be unpleasant ("I made a mistake in the numbers, and I need to fix it today."). It must not be a happy or positive thought: the learner must learn that "realistic" is not "positive".
- A realistic thought must be about a different part of the situation than the thought in "rewrite". It must not already be a balanced version of that thought: the learner should find the balanced thought, not copy it from the list.
- Do not use the trap's name inside a thought.
- Rewrite options: exactly one balanced thought (fair to the facts, including the bad ones, and useful); one "positive thinking" option with no evidence ("Everything will be fine, it does not matter."); one that falls into another trap. Vary which index is right.
- Plain, warm language. No therapy jargon beyond the trap names.${input.adaptationAppendix ? `\n\n${input.adaptationAppendix}` : ""}`;
}
