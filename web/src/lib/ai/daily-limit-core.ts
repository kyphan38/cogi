/** Guard against runaway loops, not normal use: real days stay far below this. */
export const AI_DAILY_LIMIT = 200;

export type AiUsage = { day: string; count: number };

/** Day in Vietnam time, so the counter resets at local midnight. */
export function usageDay(now: number): string {
  return new Date(now + 7 * 3_600_000).toISOString().slice(0, 10);
}

export function nextAiUsage(
  prev: Partial<AiUsage> | undefined,
  now: number,
  max: number,
): { allowed: boolean; usage: AiUsage } {
  const day = usageDay(now);
  const count = prev?.day === day && typeof prev.count === "number" ? prev.count : 0;
  if (count >= max) return { allowed: false, usage: { day, count } };
  return { allowed: true, usage: { day, count: count + 1 } };
}
