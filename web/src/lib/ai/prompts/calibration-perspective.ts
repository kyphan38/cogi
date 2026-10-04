import type { CalibrationExerciseRow } from "@/lib/types/exercise";
import type { CalibrationResult } from "@/lib/exercise/calibration-score";

const fmt = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * Coaching for Calibration: right and wrong, hit rates and the Brier score come from
 * code (`scoreCalibration`), and the answers come from the question bank or exact
 * math. The AI only explains them: how to think, not new facts.
 */
export function buildCalibrationPerspectivePrompt(input: {
  exercise: CalibrationExerciseRow;
  result: CalibrationResult;
  requiredRefs: string[];
  userContext?: string;
}): string {
  const ex = input.exercise;
  const r = input.result;
  const answers = ex.answers ?? {};
  const cases = ex.items
    .map((item) => {
      const o = r.items.find((x) => x.id === item.id)!;
      const a = answers[item.id] ?? {};
      if (item.kind === "binary") {
        const user =
          a.choice == null ? "(no answer)" : `picked "${item.options[a.choice]}" at ${a.confidence ?? "?"}% sure - ${o.correct ? "RIGHT" : "WRONG"}`;
        return `item_${item.id} - ${item.question}\n  Answer: ${item.options[item.answerIndex]}. ${item.explanation}\n  User: ${user}`;
      }
      if (item.kind === "interval") {
        const user =
          a.low == null || a.high == null
            ? "(no answer)"
            : `range ${fmt(a.low)} to ${fmt(a.high)} - ${o.correct ? "HIT" : o.missed === "too-low" ? "MISSED: the whole range was too low" : "MISSED: the whole range was too high"}${o.veryWide ? " (very wide: high end over 10 times the low end)" : ""}`;
        return `item_${item.id} - ${item.question}\n  Answer: ${fmt(item.answer)} ${item.unit}. ${item.explanation}\n  User: ${user}`;
      }
      const user =
        a.estimate == null
          ? "(no answer)"
          : `said ${fmt(a.estimate)}% - ${o.correct ? "RIGHT (within 5 points)" : `off by ${fmt(o.error ?? 0)} points`}`;
      return `item_${item.id} - BASE RATE: ${item.story} ${item.question}\n  Answer: about ${item.answer}%. ${item.explanation}\n  User: ${user}`;
    })
    .join("\n\n");

  const hitRate = r.interval.count > 0 ? Math.round((r.interval.hits / r.interval.count) * 100) : null;
  const summary = [
    r.binary.count > 0
      ? `Two-answer questions: ${r.binary.right}/${r.binary.count} right; Brier score ${r.binary.brier ?? "-"} (0 is perfect, 0.25 is what always saying 50% gives). By confidence: ${r.binary.buckets.map((bk) => `${bk.confidence}% sure -> ${bk.right}/${bk.count} right`).join("; ")}.`
      : "",
    hitRate != null
      ? `Ranges: ${r.interval.hits}/${r.interval.count} held the answer (${hitRate}%), target ${r.interval.target}%. Very wide ranges: ${r.interval.veryWide}.`
      : "",
    `Base rates: ${r.baseRate.right}/${r.baseRate.count} within 5 points.`,
    `Before the feedback, the user said they were ${ex.confidenceBefore ?? "?"}% sure overall.`,
  ]
    .filter(Boolean)
    .join("\n");
  const ctx = input.userContext?.trim() ? `\nUser context: ${input.userContext.trim()}` : "";

  return `You are a warm, practical coach helping a beginner become well calibrated: to be as sure as the evidence allows, no more and no less.${ctx}

RESULT (decided by code - final, do not change any answer or number):
${summary}

CASES:
${cases}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "perspectiveFormat": "coaching_v3",
  "title": string (echo: "${ex.title.replace(/"/g, '\\"')}"),
  "items": [ { "ref": string (a ref from CASES, or "pattern"), "why": string, "clue": string, "nextTimeAsk": string } ],
  "takeaways": [string] (1-2 items),
  "metaNote": string (optional)
}

Write one item for each of these refs: ${input.requiredRefs.join(", ") || "(none)"}.

How to write each item:
- "pattern": the overall picture in at most 2 sentences: overconfident, underconfident, or well calibrated, using the numbers above. A few questions say little on their own: say "in this set". "clue": the one number that shows it. "nextTimeAsk": one habit question.
- A missed range: why ranges are often too narrow (anchoring on a first guess) and what a better range would start from. Do not give new facts beyond the answer above.
- A wrong answer given with 80%+ confidence: what made it feel certain, kindly.
- A base-rate problem: walk through the "out of 10,000" counts in one or two sentences. Say plainly when the user ignored how rare the condition is.
- "clue": the words or number in the question that matter most (quote 2-6 words).
- "nextTimeAsk": one question to ask yourself next time, at most 15 words.
"takeaways": 1-2 short habits the user can use this week (for example, a decision journal with a "how sure" number).

Tone: warm and direct. No grade beyond the numbers above. Refs (like item_sci-b1) are only for the "ref" field: in the text, never write ids.`;
}
