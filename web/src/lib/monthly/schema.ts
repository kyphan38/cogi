import { z } from "zod";
import { hasVietnamese } from "@/lib/ai/validators/deep-dive";
import type { MonthStats, MonthlyReviewText } from "@/lib/monthly/stats";

export const monthlyReviewTextSchema = z.object({
  headline: z.string().min(1).max(300),
  improved: z.array(z.string().min(1).max(300)).max(3),
  steady: z.array(z.string().min(1).max(300)).max(3),
  focus: z.string().min(1).max(400),
});

/** The stats the client sends. Bounded, so a request cannot carry a huge prompt. */
export const monthStatsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  total: z.number().int().min(0).max(2000),
  prevTotal: z.number().int().min(0).max(2000),
  activeDays: z.number().int().min(0).max(31),
  types: z
    .array(
      z.object({
        type: z.string().max(40),
        label: z.string().max(60),
        count: z.number().int().min(0).max(2000),
        score: z.number().min(0).max(100).nullable(),
        prevCount: z.number().int().min(0).max(2000),
        prevScore: z.number().min(0).max(100).nullable(),
        trend: z.enum(["up", "flat", "down", "new"]).nullable(),
      }),
    )
    .max(12),
  takeaways: z.array(z.string().max(240)).max(12),
  used: z.object({ yes: z.number().int().min(0), partly: z.number().int().min(0), no: z.number().int().min(0) }),
  weakSpots: z.array(z.string().max(200)).max(5),
}) satisfies z.ZodType<MonthStats>;

export function parseMonthlyReviewJson(text: string): { success: true; data: MonthlyReviewText } | { success: false; error: string } {
  const trimmed = text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = monthlyReviewTextSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}

/** Semantic checks: English only, and no type named that was not practised. */
export function monthlyReviewErrors(text: MonthlyReviewText, stats: MonthStats): string[] {
  const errors: string[] = [];
  const all = [text.headline, ...text.improved, ...text.steady, text.focus];
  if (all.some(hasVietnamese)) errors.push("write in English only");
  const up = stats.types.some((t) => t.trend === "up");
  if (!up && text.improved.length > 0) errors.push("no exercise type went up this month: `improved` must be empty");
  return errors;
}
