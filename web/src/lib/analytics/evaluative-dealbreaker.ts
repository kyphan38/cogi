import type { EvaluativeScoringRow } from "@/lib/types/exercise";

export const DEALBREAKER_PASS_THRESHOLD = 3;

export interface DealbreakerDisqualification {
  optionId: string;
  optionTitle: string;
  reasons: { criterionId: string; criterionLabel: string; userScore: number }[];
}

export function computeDisqualifiedOptions(
  ex: EvaluativeScoringRow,
  scores: Record<string, Record<string, number>>,
): DealbreakerDisqualification[] {
  const dealbreakers = ex.criteria.filter((c) => c.isDealbreaker);
  if (dealbreakers.length === 0) return [];
  const out: DealbreakerDisqualification[] = [];
  for (const o of ex.options) {
    const reasons = dealbreakers
      .map((c) => ({
        criterionId: c.id,
        criterionLabel: c.label,
        userScore: scores[o.id]?.[c.id] ?? 3,
      }))
      .filter((r) => r.userScore < DEALBREAKER_PASS_THRESHOLD);
    if (reasons.length > 0) out.push({ optionId: o.id, optionTitle: o.title, reasons });
  }
  return out;
}
