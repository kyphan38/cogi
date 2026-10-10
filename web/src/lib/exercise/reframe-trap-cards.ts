import type { ReframeRewrite, ReframeTag, ReframeThought } from "@/lib/ai/validators/reframe";
import type { ReframeResult } from "@/lib/exercise/reframe-score";
import { firstKeys } from "@/lib/exercise/take-with-you";

/**
 * Which traps get a "Take with you" card, decided in code so the server prompt and the
 * answer key agree: first the traps the user missed or named wrong, then the trap they
 * put on a fair thought, then the trap of the thought they rewrote, then the rest.
 */
export function pickTrapCards(
  thoughts: Pick<ReframeThought, "id" | "trap">[],
  rewrite: Pick<ReframeRewrite, "thoughtId">,
  result: Pick<ReframeResult, "thoughts">,
): ReframeTag[] {
  const outcome = (id: string) => result.thoughts.find((o) => o.id === id);
  const traps = thoughts.filter((t) => t.trap !== "realistic");
  return firstKeys([
    ...traps.filter((t) => !outcome(t.id)?.found).map((t) => t.trap),
    ...traps.filter((t) => outcome(t.id)?.found && !outcome(t.id)?.tagMatched).map((t) => t.trap),
    ...thoughts.filter((t) => outcome(t.id)?.trapped).map((t) => outcome(t.id)?.userAnswer),
    traps.find((t) => t.id === rewrite.thoughtId)?.trap,
    ...traps.map((t) => t.trap),
  ]) as ReframeTag[];
}
