import type { ResultRating } from "@/lib/exercise/levels";
import { TRICKY_STEPS, type TrickyStep } from "@/lib/exercise/tricky-levels";
import type { TrickyGrade, TrickyQuality, TrickyRound } from "@/lib/ai/validators/tricky";

export interface TrickyRoundResult {
  /** Choose mode: the picked option index (original order), and its quality. */
  picked: number | null;
  quality: TrickyQuality | null;
  /** Write mode: which of the four steps the answer used (graded by the AI). */
  steps: Record<TrickyStep, boolean> | null;
  strong?: string;
  missing?: string;
  /** A stronger answer in the user's voice. */
  better?: string;
}

export interface TrickyResult {
  mode: "choose" | "write";
  rounds: TrickyRoundResult[];
  /** 0..1: best = 1, ok = 0.5, poor = 0 (choose); steps used / steps possible (write). */
  score: number;
  /** Write mode: one or two sentences on the pattern across all answers. */
  overall?: string;
}

const QUALITY_POINTS: Record<TrickyQuality, number> = { best: 1, ok: 0.5, poor: 0 };

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Choose mode: scored in code from the picked options. */
export function scoreTrickyChoices(rounds: TrickyRound[], picks: (number | null | undefined)[]): TrickyResult {
  const rows = rounds.map((r, i): TrickyRoundResult => {
    const p = picks[i];
    const quality = p != null ? (r.options[p]?.quality ?? null) : null;
    return { picked: p ?? null, quality, steps: null };
  });
  const points = rows.reduce((sum, r) => sum + (r.quality ? QUALITY_POINTS[r.quality] : 0), 0);
  return { mode: "choose", rounds: rows, score: rounds.length > 0 ? round2(points / rounds.length) : 0 };
}

/** Write mode: the AI's grade, counted in code. */
export function scoreTrickyWritten(grade: TrickyGrade, roundCount: number): TrickyResult {
  const rows = Array.from({ length: roundCount }, (_, i): TrickyRoundResult => {
    const g = grade.rounds[i];
    return {
      picked: null,
      quality: null,
      steps: g ? g.steps : (Object.fromEntries(TRICKY_STEPS.map((s) => [s, false])) as Record<TrickyStep, boolean>),
      strong: g?.strong,
      missing: g?.missing,
      better: g?.better,
    };
  });
  const hit = rows.reduce((sum, r) => sum + TRICKY_STEPS.filter((s) => r.steps?.[s]).length, 0);
  const total = roundCount * TRICKY_STEPS.length;
  return { mode: "write", rounds: rows, score: total > 0 ? round2(hit / total) : 0, overall: grade.overall };
}

/** How often each step was used across written rounds. */
export function trickyStepCounts(r: TrickyResult): Record<TrickyStep, number> {
  const counts = Object.fromEntries(TRICKY_STEPS.map((s) => [s, 0])) as Record<TrickyStep, number>;
  for (const row of r.rounds) for (const s of TRICKY_STEPS) if (row.steps?.[s]) counts[s] += 1;
  return counts;
}

export function rateTricky(r: TrickyResult): ResultRating {
  if (r.score >= 0.75) return "good";
  if (r.score < 0.4) return "poor";
  return "ok";
}
