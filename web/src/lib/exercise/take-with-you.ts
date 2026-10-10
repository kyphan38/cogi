import { mostlyRepeats } from "@/lib/text/overlap";

/**
 * "Take with you" cards at the end of an answer key (Reframe, Analytical): one per
 * trap or issue type, for real life. The guide is fixed text, checked by hand; the AI
 * only adds examples for the exercise at hand, checked here.
 */
export interface TakeWithYouGuide {
  /** What it is or does, in one or two plain sentences. */
  spot: string;
  /** Words or moments that often signal it. */
  signals: readonly string[];
  /** The question to ask yourself when you catch it. */
  ask: string;
  /** One concrete step to take next. */
  fix: string;
  /** How to respond when someone else does it. */
  othersTip: string;
  /** A small practice for this week. */
  practice: string;
}

/** At most this many cards end an exercise: enough to go deeper, short enough to read. */
export const MAX_TRAP_CARDS = 2;

/** The AI's part of a card. `trap` is the card's key (a trap or an issue type). */
export interface TrapCardAi {
  trap: string;
  /** Something another person might say or write with this problem. */
  othersSay: string;
  /** A kind reply that asks, not corrects. */
  youCouldSay: string;
  /** The same problem in another area of life. */
  elsewhere: { area: string; thought: string; balanced: string };
}

/** Add keys in order, once each, at most MAX_TRAP_CARDS. */
export function firstKeys(candidates: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const k of candidates) if (k && !out.includes(k)) out.push(k);
  return out.slice(0, MAX_TRAP_CARDS);
}

/**
 * Keep the AI cards that are usable: one per picked key, in pick order, with every
 * field filled. An "elsewhere" example in the exercise's own area, or one that repeats
 * `ctx.avoid` (e.g. the rewrite), is dropped; the card still shows the fixed guide.
 */
export function sanitizeTrapCards(raw: unknown, picked: readonly string[], ctx: { domain: string; avoid: string }): TrapCardAi[] {
  if (!Array.isArray(raw)) return [];
  const filled = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
  const out: TrapCardAi[] = [];
  for (const trap of picked) {
    const c = raw.find((x): x is Record<string, unknown> => !!x && typeof x === "object" && (x as { trap?: unknown }).trap === trap);
    if (!c || !filled(c.othersSay) || !filled(c.youCouldSay)) continue;
    const e = (c.elsewhere ?? {}) as Record<string, unknown>;
    const elsewhereOk =
      filled(e.area) &&
      filled(e.thought) &&
      filled(e.balanced) &&
      e.area.trim().toLowerCase() !== ctx.domain.trim().toLowerCase() &&
      !(ctx.avoid && (mostlyRepeats(ctx.avoid, e.balanced) || mostlyRepeats(ctx.avoid, e.thought)));
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
