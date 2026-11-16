import { z } from "zod";
import { hasVietnamese } from "@/lib/ai/validators/deep-dive";

/**
 * Briefs: a short reading page on one big news story of the last month, written on
 * request by the AI from a web search. Background, facts with their source, a few
 * ways to see it, three check questions, and links to practise.
 */
export const BRIEF_AREAS = ["World", "Economy", "Technology", "Vietnam"] as const;
export type BriefArea = (typeof BRIEF_AREAS)[number];

/** New briefs per calendar month. Each one runs a web search. */
export const BRIEFS_PER_MONTH = 4;
/** Saved briefs kept; older ones drop off. */
export const BRIEFS_KEPT = 30;

export const BRIEF_PRACTICE_TYPES = ["analytical", "systems", "evaluative"] as const;

export const briefContentSchema = z.object({
  title: z.string().min(1).max(120),
  /** What happened and since when, 5-8 sentences. */
  background: z.string().min(1).max(1800),
  facts: z
    .array(
      z.object({
        text: z.string().min(1).max(400),
        /** Publisher and date, e.g. "Reuters, 12 Nov 2026". */
        source: z.string().min(1).max(120),
      }),
    )
    .min(4)
    .max(6),
  views: z.array(z.object({ name: z.string().min(1).max(80), text: z.string().min(1).max(600) })).min(2).max(3),
  checks: z
    .array(
      z.object({
        question: z.string().min(1).max(300),
        options: z.array(z.string().min(1).max(200)).length(3),
        answerIndex: z.number().int().min(0).max(2),
        explanation: z.string().min(1).max(400),
      }),
    )
    .length(3),
  practise: z.array(z.object({ type: z.enum(BRIEF_PRACTICE_TYPES), domain: z.string().min(1).max(100) })).min(2).max(3),
});
export type BriefContent = z.infer<typeof briefContentSchema>;

export interface Brief extends BriefContent {
  id: string;
  area: BriefArea;
  createdAt: string;
  /** Pages the web search used. */
  sources: { title: string; uri: string }[];
  /** The option the user picked for each check question, once answered. */
  answers?: (number | null)[];
}

export function parseBriefJson(text: string): { success: true; data: BriefContent } | { success: false; error: string } {
  const trimmed = text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = briefContentSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}

/** Semantic checks: English only, and the right answer is not always in the same place. */
export function briefErrors(b: BriefContent): string[] {
  const errors: string[] = [];
  const texts = [b.title, b.background, ...b.facts.map((f) => f.text), ...b.views.flatMap((v) => [v.name, v.text]), ...b.checks.flatMap((c) => [c.question, ...c.options, c.explanation])];
  if (texts.some(hasVietnamese)) errors.push("write in English only");
  if (new Set(b.checks.map((c) => c.answerIndex)).size === 1) errors.push("the right answer must not be in the same position in all three checks");
  if (b.checks.some((c) => new Set(c.options.map((o) => o.trim().toLowerCase())).size !== 3)) errors.push("each check needs three different options");
  return errors;
}

/** How many briefs were made in the month of `today` ("YYYY-MM-DD", local). */
export function briefsThisMonth(briefs: Pick<Brief, "createdAt">[], today: string): number {
  const month = today.slice(0, 7);
  return briefs.filter((b) => new Date(b.createdAt).toLocaleDateString("en-CA").slice(0, 7) === month).length;
}

export function briefPractiseHref(p: BriefContent["practise"][number]): string {
  return `/exercise/${p.type}?domain=${encodeURIComponent(p.domain)}`;
}
