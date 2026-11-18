import type { HumorExerciseRow } from "@/lib/types/exercise";
import { HUMOR_STEPS } from "@/lib/exercise/humor-levels";
import { HUMOR_STEPS_TEXT } from "@/lib/ai/prompts/humor";
import { learnerFor } from "@/lib/ai/prompts/learner";

/** Grade written light replies against the four checks, one item per round. */
export function buildHumorGradePrompt(input: { exercise: HumorExerciseRow; userContext?: string }): string {
  const ex = input.exercise;
  const ctx = input.userContext?.trim() ? `\nUser context: ${input.userContext.trim()}` : "";
  const rounds = ex.rounds
    .map((r, i) => {
      const model = r.options.find((o) => o.quality === "best")?.text ?? "";
      const answer = (ex.answers?.[i] ?? "").trim() || "(no reply)";
      return `Round ${i + 1}${r.serious ? " (SERIOUS moment)" : ""}: ${r.moment}
  Common mistake: ${r.trap} (${r.trapWhy})
  A model reply: "${model}"
  The user said: "${answer}"`;
    })
    .join("\n\n");

  return `You are a warm, practical coach helping ${learnerFor(ex.level)} reply with light, kind humor.${ctx}
Setting: ${ex.context === "vietnam" ? "Vietnam - respect Vietnamese norms (seniority, saving face, harmony in the group)." : "general."}

${ex.setting}

The four checks of a good light reply:
${HUMOR_STEPS_TEXT}

${rounds}

Grade each round on its own. A check counts (true) only when the user's words really pass it. The model reply is one good way, not the only one.
- "kind": false if the reply puts down a person (including harsh self put-downs).
- "fits": false if it jokes in a SERIOUS moment, or is too bold for the people there.
- "short": false if it is long or explains itself.
- "twist": in a SERIOUS moment, a warm, plain reply with no joke counts as true (holding back is the skill). Otherwise it needs a small light surprise.

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "rounds": [ { "steps": { ${HUMOR_STEPS.map((s) => `"${s}": boolean`).join(", ")} }, "strong": string, "missing": string, "better": string } ] (exactly ${ex.rounds.length}, in order),
  "overall": string
}

- "strong": one short sentence on what works in the reply ("" if nothing).
- "missing": one short sentence on the most useful change ("" if nothing).
- "better": a better reply the user could say, first person, close to their own idea and style, at most 30 words.
- "overall": 1-2 sentences on the pattern across all replies and one thing to try next time.
Tone: warm, direct, a little playful. No numeric grade. Plain words, short sentences.`;
}
