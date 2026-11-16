import { z } from "zod";
import { hasVietnamese } from "@/lib/ai/validators/deep-dive";

/**
 * The 5-minute question: one short situation, one open question, a few sentences
 * from the user (typed or spoken), one short feedback.
 */
export const QUICK_SKILLS = ["evidence", "assumptions", "causes", "trade-offs", "other views", "second effects", "base rates"] as const;
export type QuickSkill = (typeof QUICK_SKILLS)[number];

export const QUICK_ANSWER_MAX = 1500;
/** Longest spoken answer. The recorder stops by itself at this point. */
export const QUICK_SPEAK_MAX_MS = 90_000;
/** Base64 of 90 s of audio stays well under this; the server refuses more. */
export const QUICK_AUDIO_MAX_BASE64 = 4_000_000;
export const QUICK_AUDIO_MIMES = ["audio/webm", "audio/mp4", "audio/aac", "audio/ogg", "audio/mpeg", "audio/wav"] as const;

export const quickQuestionSchema = z.object({
  title: z.string().min(1).max(80),
  /** 2-4 sentences. */
  scenario: z.string().min(1).max(700),
  question: z.string().min(1).max(300),
});
export type QuickQuestion = z.infer<typeof quickQuestionSchema>;

export const quickDeliverySchema = z.object({
  /** What was clear in how it was said. */
  clear: z.string().min(1).max(400),
  /** One thing to change next time: order of ideas, filler words, a missing link word. */
  tip: z.string().min(1).max(400),
});

export const quickFeedbackSchema = z.object({
  strong: z.string().min(1).max(500),
  missing: z.string().min(1).max(500),
  /** The question to ask yourself next time. */
  nextTime: z.string().min(1).max(300),
});
export type QuickFeedback = z.infer<typeof quickFeedbackSchema>;

/** A spoken answer: the words heard, the same feedback, plus how it was said. */
export const quickSpokenFeedbackSchema = quickFeedbackSchema.extend({
  transcript: z.string().max(4000),
  delivery: quickDeliverySchema,
});
export type QuickSpokenFeedback = z.infer<typeof quickSpokenFeedbackSchema>;

type Parsed<T> = { success: true; data: T } | { success: false; error: string };

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m?.[1] ? m[1].trim() : trimmed;
}

export function parseQuickJson<T>(schema: z.ZodType<T>, text: string): Parsed<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}

/** Semantic check: the app's output is English only. The transcript is the user's own words, so it is not checked. */
export function quickEnglishErrors(fields: Record<string, string>): string[] {
  return Object.entries(fields)
    .filter(([, v]) => hasVietnamese(v))
    .map(([k]) => `${k} must be in English only`);
}

/** Today's skill: rotates by day, so a week of questions covers them all. */
export function quickSkillFor(day: string): QuickSkill {
  const n = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return QUICK_SKILLS[((n % QUICK_SKILLS.length) + QUICK_SKILLS.length) % QUICK_SKILLS.length]!;
}
