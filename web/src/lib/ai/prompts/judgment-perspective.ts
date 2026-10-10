import type { JudgmentExerciseRow } from "@/lib/types/exercise";
import type { JudgmentResult } from "@/lib/exercise/judgment-score";
import { LENS_INFO } from "@/lib/exercise/judgment-levels";
import { JUDGMENT_LENS_GUIDE } from "@/lib/exercise/judgment-lens-guide";
import type { JudgmentLens } from "@/lib/ai/validators/judgment";

/**
 * Coaching for a life situation: the comparison with the expert comes from code
 * (`scoreJudgment`); the AI explains it through the three lenses and the concepts
 * the user learned first.
 */
export function buildJudgmentPerspectivePrompt(input: {
  exercise: JudgmentExerciseRow;
  result: JudgmentResult;
  requiredRefs: string[];
  /** Lenses that get a "Take with you" card, picked in code (pickLensCards). */
  cardLenses?: JudgmentLens[];
  userContext?: string;
}): string {
  const ex = input.exercise;
  const r = input.result;
  const n = ex.responses.length;
  const responseCases = ex.responses
    .map((resp) => {
      const row = r.responses.find((x) => x.id === resp.id)!;
      const gap = Math.abs(row.userRank - row.expertRank);
      const verdict = gap === 0 ? "SAME PLACE" : gap === 1 ? "CLOSE" : "FAR APART";
      return `response_${resp.id} - "${resp.text}"\n  Expert's view (#${resp.expertRank} of ${n}): ${resp.why}\n  User: ${verdict} - ranked it #${row.userRank}; the expert ranks it #${row.expertRank}.`;
    })
    .join("\n\n");
  const lensCases = ex.lensQuestions
    .map((q) => {
      const l = r.lenses.find((x) => x.lens === q.lens)!;
      const best = q.options[q.answerIndex];
      const user =
        l.correct === null
          ? `WROTE: "${(ex.lensText?.[q.lens] ?? "").trim() || "(nothing)"}" - judge it fairly against the most useful reading.`
          : l.correct
            ? "SAME READING as the most useful one."
            : `DIFFERENT READING - chose "${q.options[ex.lensAnswers?.[q.lens] ?? -1] ?? "(nothing)"}".`;
      return `lens_${q.lens} - ${LENS_INFO[q.lens].name}: ${q.question}\n  Most useful reading: ${best} (${q.explanation})\n  User: ${user}`;
    })
    .join("\n\n");
  const own = ex.ownResponse?.trim()
    ? `\n\nown - the user's own way to respond: "${ex.ownResponse.trim()}"\n  Judge it through the three lenses: what works, and the one thing that would make it stronger.`
    : "";
  const ctx = input.userContext?.trim() ? `\nUser context: ${input.userContext.trim()}` : "";
  const cardLines = (input.cardLenses ?? [])
    .map((l) => `- ${l} (${LENS_INFO[l].name}): ${JUDGMENT_LENS_GUIDE[l].spot} How to help others: ${JUDGMENT_LENS_GUIDE[l].othersTip}`)
    .join("\n");

  return `You are a warm, practical coach helping a beginner get better at real-life judgment.${ctx}
Setting: ${ex.context === "vietnam" ? "Vietnam - respect Vietnamese norms (seniority, saving face, family duty)." : "general."}

Situation (${ex.domain}): ${ex.scenario}

Ideas the user studied first: ${ex.concepts.map((c) => `${c.term} (${c.plain})`).join("; ")}
The three lenses: ${Object.values(LENS_INFO).map((l) => `${l.name} - ${l.question}`).join(" | ")}

COMPARISON (decided by code - final). Social situations have no single right answer: the expert view is a reasoned reference, so say "the expert sees it as...", never "you are wrong".
- First choice matches the expert's best: ${r.topMatch ? "yes" : "no"}
- How close the whole order is: ${Math.round(r.closeness * 100)}%

CASES:
${responseCases}

${lensCases}${own}

The user's reason for their first choice: "${ex.userWhy?.trim() || "(none given)"}"

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "perspectiveFormat": "coaching_v3",
  "title": string (echo: "${ex.title.replace(/"/g, '\\"')}"),
  "items": [ { "ref": string (a ref from CASES), "why": string, "clue": string, "nextTimeAsk": string } ],
  "takeaways": [] (always empty: the cards below replace them),
  "metaNote": string,
  "trapCards": [ { "trap": string (a lens id from TAKE-WITH-YOU CARDS), "othersSay": string, "youCouldSay": string, "elsewhere": { "area": string, "thought": string, "balanced": string } } ] (exactly one per lens below, same order)
}

TAKE-WITH-YOU CARDS (the user takes these lenses into real life; the app already shows when each one is needed and what to ask):
${cardLines || "(none)"}

Write one item for each of these refs: ${input.requiredRefs.join(", ") || "(none)"}.

How to write each item:
- "why": at most 2 short sentences. Name the lens that matters most here (Think clearly / Understand people / Stay steady) and, where it fits, one of the ideas the user studied. SAME PLACE: confirm plainly. CLOSE or FAR APART: explain what the expert weighs differently, kindly.
- "clue": the words in the situation that point to it (quote 2-6 words).
- "nextTimeAsk": one question to ask yourself in a real situation like this, at most 15 words.
"metaNote": 1-2 sentences on the user's reason for their first choice: what it gets right, and what it leaves out.
How to write each card (plain words, not from this situation):
- "othersSay": one short sentence a friend or family member might say when they need this lens, in a hard moment of their own.
- "youCouldSay": a kind reply that helps them use the lens: name their feeling, then ask one question. Never lecture and never name the lens. At most 25 words.
- "elsewhere": the same lens in a different area of life than "${ex.domain}" (for example work, family, friends, money, study, health). "area" is that area in 1-3 words; "thought" is what someone does or thinks without the lens; "balanced" is what they could do with it.

Tone: warm and direct. No numeric grade. No "stronger alternative". No therapy jargon beyond the studied ideas. Refs (like response_r2, lens_think) are only for the "ref" field: in the text, never write ids.`;
}
