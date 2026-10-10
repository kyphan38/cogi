import type { JudgmentLens, JudgmentResponse } from "@/lib/ai/validators/judgment";
import type { JudgmentResult } from "@/lib/exercise/judgment-score";
import { firstKeys } from "@/lib/exercise/take-with-you";
import { JUDGMENT_LENSES } from "@/lib/ai/validators/judgment";

/**
 * Which lenses get a "Take with you" card, decided in code so the server prompt and the
 * answer key agree: lenses the user read differently first, then the lens of the
 * responses they ranked furthest from the expert, then the lens of the best response,
 * then the rest in their usual order.
 */
export function pickLensCards(responses: Pick<JudgmentResponse, "id" | "expertRank" | "lens">[], result: Pick<JudgmentResult, "responses" | "lenses">): JudgmentLens[] {
  const gap = (id: string) => {
    const r = result.responses.find((x) => x.id === id);
    return r ? Math.abs(r.userRank - r.expertRank) : 0;
  };
  const byGap = responses.filter((r) => gap(r.id) > 0).sort((a, b) => gap(b.id) - gap(a.id) || a.expertRank - b.expertRank);
  return firstKeys([
    ...result.lenses.filter((l) => l.correct === false).map((l) => l.lens),
    ...byGap.map((r) => r.lens),
    responses.find((r) => r.expertRank === 1)?.lens,
    ...JUDGMENT_LENSES,
  ]) as JudgmentLens[];
}
