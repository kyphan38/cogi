import type { ResultRating } from "@/lib/exercise/levels";
import { HUMOR_STEPS, type HumorStep } from "@/lib/exercise/humor-levels";
import type { HumorGrade, HumorQuality, HumorRound } from "@/lib/ai/validators/humor";

export interface HumorRoundResult {
  /** Choose mode: the picked option index (original order), and its quality. */
  picked: number | null;
  quality: HumorQuality | null;
  /** Write mode: which of the four checks the reply passed (graded by the AI). */
  steps: Record<HumorStep, boolean> | null;
  strong?: string;
  missing?: string;
  /** A better reply in the user's voice. */
  better?: string;
}

export interface HumorResult {
  mode: "choose" | "write";
  rounds: HumorRoundResult[];
  /** 0..1: best = 1, ok = 0.5, poor = 0 (choose); checks passed / checks possible (write). */
  score: number;
  /** Write mode: one or two sentences on the pattern across all replies. */
  overall?: string;
}

const QUALITY_POINTS: Record<HumorQuality, number> = { best: 1, ok: 0.5, poor: 0 };

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Choose mode: scored in code from the picked options. */
export function scoreHumorChoices(rounds: HumorRound[], picks: (number | null | undefined)[]): HumorResult {
  const rows = rounds.map((r, i): HumorRoundResult => {
    const p = picks[i];
    const quality = p != null ? (r.options[p]?.quality ?? null) : null;
    return { picked: p ?? null, quality, steps: null };
  });
  const points = rows.reduce((sum, r) => sum + (r.quality ? QUALITY_POINTS[r.quality] : 0), 0);
  return { mode: "choose", rounds: rows, score: rounds.length > 0 ? round2(points / rounds.length) : 0 };
}

/** Write mode: the AI's grade, counted in code. */
export function scoreHumorWritten(grade: HumorGrade, roundCount: number): HumorResult {
  const rows = Array.from({ length: roundCount }, (_, i): HumorRoundResult => {
    const g = grade.rounds[i];
    return {
      picked: null,
      quality: null,
      steps: g ? g.steps : (Object.fromEntries(HUMOR_STEPS.map((s) => [s, false])) as Record<HumorStep, boolean>),
      strong: g?.strong,
      missing: g?.missing,
      better: g?.better,
    };
  });
  const hit = rows.reduce((sum, r) => sum + HUMOR_STEPS.filter((s) => r.steps?.[s]).length, 0);
  const total = roundCount * HUMOR_STEPS.length;
  return { mode: "write", rounds: rows, score: total > 0 ? round2(hit / total) : 0, overall: grade.overall };
}

/** How often each check passed across written rounds. */
export function humorStepCounts(r: HumorResult): Record<HumorStep, number> {
  const counts = Object.fromEntries(HUMOR_STEPS.map((s) => [s, 0])) as Record<HumorStep, number>;
  for (const row of r.rounds) for (const s of HUMOR_STEPS) if (row.steps?.[s]) counts[s] += 1;
  return counts;
}

export function rateHumor(r: HumorResult): ResultRating {
  if (r.score >= 0.75) return "good";
  if (r.score < 0.4) return "poor";
  return "ok";
}
