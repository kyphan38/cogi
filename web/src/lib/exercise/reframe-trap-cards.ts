import type { ReframeRewrite, ReframeTag, ReframeThought } from "@/lib/ai/validators/reframe";
import type { ReframeResult } from "@/lib/exercise/reframe-score";

/** At most this many trap cards end an exercise: enough to go deeper, short enough to read. */
export const MAX_TRAP_CARDS = 2;

/** The AI's part of a trap card: examples for this exercise. The rest is in REFRAME_TRAP_GUIDE. */
export interface TrapCardAi {
  trap: string;
  /** Something another person might say with this trap. */
  othersSay: string;
  /** A kind reply that asks, not corrects. */
  youCouldSay: string;
  /** The same trap in another area of life. */
  elsewhere: { area: string; thought: string; balanced: string };
}

/**
 * Which traps get a card, decided in code so the server prompt and the answer key agree:
 * first the traps the user missed or named wrong, then the trap they put on a fair
 * thought, then the trap of the thought they rewrote, then the rest in order.
 */
export function pickTrapCards(
  thoughts: Pick<ReframeThought, "id" | "trap">[],
  rewrite: Pick<ReframeRewrite, "thoughtId">,
  result: Pick<ReframeResult, "thoughts">,
): ReframeTag[] {
  const ordered: ReframeTag[] = [];
  const add = (t: string | null | undefined) => {
    if (t && t !== "realistic" && !ordered.includes(t as ReframeTag)) ordered.push(t as ReframeTag);
  };
  const outcome = (id: string) => result.thoughts.find((o) => o.id === id);
  for (const t of thoughts) if (t.trap !== "realistic" && !outcome(t.id)?.found) add(t.trap);
  for (const t of thoughts) if (outcome(t.id)?.found && !outcome(t.id)?.tagMatched) add(t.trap);
  for (const t of thoughts) if (outcome(t.id)?.trapped) add(outcome(t.id)?.userAnswer);
  add(thoughts.find((t) => t.id === rewrite.thoughtId)?.trap);
  for (const t of thoughts) add(t.trap);
  return ordered.slice(0, MAX_TRAP_CARDS);
}

const STOP = new Set(
  "about after again also because been before being both could does doing from have here into just like made make more most much must only other over really same should some still such than that their them then there these they this those very want were what when where which while will with would your yours".split(
    " ",
  ),
);

/** Content words: lowercase, 4+ letters, not a common function word. */
export function contentWords(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z']{4,}/g) ?? []).filter((w) => !STOP.has(w)));
}

/**
 * True when `b` repeats most of `a`'s content words: at least 3 of them, and at least
 * half. Used to stop one line giving away another (a fair thought that already is the
 * balanced rewrite; an "elsewhere" example that is the rewrite again).
 */
export function mostlyRepeats(a: string, b: string): boolean {
  const wa = contentWords(a);
  if (wa.size === 0) return false;
  const wb = contentWords(b);
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared >= 3 && shared / wa.size >= 0.5;
}

/**
 * Keep the AI cards that are usable: one per picked trap, in pick order, with every
 * field filled. An "elsewhere" example in the exercise's own area, or one that repeats
 * the rewrite, is dropped (the card still shows the fixed guide).
 */
export function sanitizeTrapCards(
  raw: unknown,
  picked: ReframeTag[],
  ctx: { domain: string; balanced: string },
): TrapCardAi[] {
  if (!Array.isArray(raw)) return [];
  const filled = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
  const out: TrapCardAi[] = [];
  for (const trap of picked) {
    const c = raw.find((x): x is Record<string, unknown> => !!x && typeof x === "object" && (x as { trap?: unknown }).trap === trap);
    if (!c || !filled(c.othersSay) || !filled(c.youCouldSay)) continue;
    const e = c.elsewhere as Record<string, unknown> | undefined;
    const elsewhereOk =
      !!e &&
      filled(e.area) &&
      filled(e.thought) &&
      filled(e.balanced) &&
      e.area.trim().toLowerCase() !== ctx.domain.trim().toLowerCase() &&
      !mostlyRepeats(ctx.balanced, e.balanced) &&
      !mostlyRepeats(ctx.balanced, e.thought);
    out.push({
      trap,
      othersSay: c.othersSay.trim(),
      youCouldSay: c.youCouldSay.trim(),
      elsewhere: elsewhereOk
        ? { area: (e.area as string).trim(), thought: (e.thought as string).trim(), balanced: (e.balanced as string).trim() }
        : { area: "", thought: "", balanced: "" },
    });
  }
  return out;
}
