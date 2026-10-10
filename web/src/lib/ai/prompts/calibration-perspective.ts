import type { CalibrationExerciseRow } from "@/lib/types/exercise";
import type { CalibrationResult } from "@/lib/exercise/calibration-score";
import { baseRateTolerance } from "@/lib/exercise/calibration-levels";
import { CALIBRATION_IDEA_GUIDE, CALIBRATION_IDEA_NAMES, type CalibrationIdea } from "@/lib/exercise/calibration-idea-guide";

/** A repeat from an earlier exercise: the answer may be memory, not judgment. */
const seenNote = (seen?: boolean) => (seen ? " (ASKED BEFORE in an earlier exercise: the user may remember the answer)" : "");

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
  /** Calibration ideas that get a "Take with you" card, picked in code (pickCalibrationCards). */
  cardIdeas?: CalibrationIdea[];
  userContext?: string;
}): string {
  const ex = input.exercise;
  const r = input.result;
  const answers = ex.answers ?? {};
  const cardLines = (input.cardIdeas ?? [])
    .map((k) => `- ${k} (${CALIBRATION_IDEA_NAMES[k]}): ${CALIBRATION_IDEA_GUIDE[k].spot} How to help others: ${CALIBRATION_IDEA_GUIDE[k].othersTip}`)
    .join("\n");
  const cases = ex.items
    .map((item) => {
      const o = r.items.find((x) => x.id === item.id)!;
      const a = answers[item.id] ?? {};
      if (item.kind === "binary") {
        const user =
          a.choice == null ? "(no answer)" : `picked "${item.options[a.choice]}" at ${a.confidence ?? "?"}% sure - ${o.correct ? "RIGHT" : "WRONG"}`;
        return `item_${item.id} - ${item.question}${seenNote(item.seenBefore)}\n  Answer: ${item.options[item.answerIndex]}. ${item.explanation}\n  User: ${user}`;
      }
      if (item.kind === "interval") {
        const user =
          a.low == null || a.high == null
            ? "(no answer)"
            : `range ${fmt(a.low)} to ${fmt(a.high)} - ${o.correct ? "HIT" : o.missed === "too-low" ? "MISSED: the whole range was too low" : "MISSED: the whole range was too high"}${o.veryWide ? " (very wide: high end over 10 times the low end)" : ""}`;
        return `item_${item.id} - ${item.question}${seenNote(item.seenBefore)}\n  Answer: ${item.unit === "$" ? `$${fmt(item.answer)}` : `${fmt(item.answer)} ${item.unit}`}. ${item.explanation}\n  User: ${user}`;
      }
      const user =
        a.estimate == null
          ? "(no answer)"
          : `said ${fmt(a.estimate)}% - ${o.correct ? `RIGHT (within ${fmt(baseRateTolerance(item.answer))} points)` : `off by ${fmt(o.error ?? 0)} points`}`;
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
    `Base rates: ${r.baseRate.right}/${r.baseRate.count} close enough (within half the true value, 1 to 5 points).`,
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
  "takeaways": [] (always empty: the cards below replace them),
  "metaNote": string (optional),
  "trapCards": [ { "trap": string (an idea id from TAKE-WITH-YOU CARDS), "othersSay": string, "youCouldSay": string, "elsewhere": { "area": string, "thought": string, "balanced": string } } ] (exactly one per idea below, same order)
}

TAKE-WITH-YOU CARDS (the user takes these ideas into real life; the app already shows how to spot each one and what to ask):
${cardLines || "(none)"}

Write one item for each of these refs: ${input.requiredRefs.join(", ") || "(none)"}.

How to write each item:
- "pattern": the overall picture in at most 2 sentences: overconfident, underconfident, or well calibrated, using the numbers above. A few questions say little on their own: say "in this set". "clue": the one number that shows it. "nextTimeAsk": one habit question.
- A missed range: why ranges are often too narrow (anchoring on a first guess) and what a better range would start from. Do not give new facts beyond the answer above.
- A wrong answer given with 80%+ confidence: what made it feel certain, kindly.
- A base-rate problem: walk through the "out of 10,000" counts in one or two sentences. Say plainly when the user ignored how rare the condition is.
- "clue": the words or number in the question that matter most (quote 2-6 words).
- "nextTimeAsk": one question to ask yourself next time, at most 15 words.
How to write each card (plain words, everyday life, not the quiz questions):
- "othersSay": one short sentence a friend or colleague might say that shows the problem (for example "This project will take two weeks, I'm sure").
- "youCouldSay": a kind reply that asks one question about how sure they should be. Never lecture. At most 25 words.
- "elsewhere": the same idea in a part of life such as work, money, health, travel or news. "area" is that area in 1-3 words; "thought" is a judgment that misses the idea; "balanced" is the same judgment made with it.

Tone: warm and direct. No grade beyond the numbers above. Refs (like item_sci-b1) are only for the "ref" field: in the text, never write ids.`;
}
