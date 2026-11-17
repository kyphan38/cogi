import type { TrickyExerciseRow } from "@/lib/types/exercise";
import { TRICKY_STEPS } from "@/lib/exercise/tricky-levels";
import { TRICKY_STEPS_TEXT } from "@/lib/ai/prompts/tricky";
import { learnerFor } from "@/lib/ai/prompts/learner";

/** Grade written answers to a tricky question against the four steps, one item per round. */
export function buildTrickyGradePrompt(input: { exercise: TrickyExerciseRow; userContext?: string }): string {
  const ex = input.exercise;
  const ctx = input.userContext?.trim() ? `\nUser context: ${input.userContext.trim()}` : "";
  const rounds = ex.rounds
    .map((r, i) => {
      const model = r.options.find((o) => o.quality === "best")?.text ?? "";
      const answer = (ex.answers?.[i] ?? "").trim() || "(no answer)";
      return `Round ${i + 1} - ${ex.asker}: "${r.question}"
  Trap: ${r.trap} (${r.trapWhy})
  A model answer: "${model}"
  The user said: "${answer}"`;
    })
    .join("\n\n");

  return `You are a warm, practical coach helping ${learnerFor(ex.level)} answer tricky questions wisely.${ctx}
Setting: ${ex.context === "vietnam" ? "Vietnam - respect Vietnamese norms (seniority, saving face, harmony in the group)." : "general."}

${ex.setting}

The four steps of a wise answer:
${TRICKY_STEPS_TEXT}
When the question is about personality or private life, refusing softly and bringing it back to the work counts as "view".

${rounds}

Grade each round on its own. A step counts (true) only when the user's words really do it, even if briefly. The model answer is one good way, not the only one. A dodge with no view ("I can't say") is "view": false. Putting someone down is "fair": false.

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "rounds": [ { "steps": { ${TRICKY_STEPS.map((s) => `"${s}": boolean`).join(", ")} }, "strong": string, "missing": string, "better": string } ] (exactly ${ex.rounds.length}, in order),
  "overall": string
}

- "strong": one short sentence on what works in the answer ("" if nothing).
- "missing": one short sentence on the most useful thing to add ("" if nothing).
- "better": a stronger answer the user could say, first person, in their own style, at most 45 words.
- "overall": 1-2 sentences on the pattern across all answers and one thing to try next time.
Tone: warm and direct. No numeric grade. Plain words, short sentences.`;
}
