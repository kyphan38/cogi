import { z } from "zod";

/** Matches analytical exercise JSON contract (Phase 1.9 in repo ai_plan.txt). */
const embeddedIssueTypeSchema = z.enum([
  "logical_fallacy",
  "hidden_assumption",
  "weak_evidence",
  "bias",
]);

const severitySchema = z.enum(["obvious", "moderate", "subtle"]);

const embeddedIssueSchema = z.object({
  description: z.string(),
  type: embeddedIssueTypeSchema,
  severity: severitySchema,
  textSegment: z.string(),
  explanation: z.string(),
});

const validPointSchema = z.object({
  textSegment: z.string(),
  explanation: z.string(),
});

export const analyticalExerciseSchema = z.object({
  title: z.string(),
  passage: z.string(),
  embeddedIssues: z.array(embeddedIssueSchema).min(1),
  validPoints: z.array(validPointSchema).min(1),
});

export type AnalyticalExercise = z.infer<typeof analyticalExerciseSchema>;

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (m?.[1]) return m[1].trim();
  return trimmed;
}

export type ParseResult =
  | { success: true; data: AnalyticalExercise }
  | { success: false; error: string };

export function parseAnalyticalExerciseJson(text: string): ParseResult {
  const stripped = stripJsonFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = analyticalExerciseSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((i) => i.message).join("; "),
    };
  }
  return { success: true, data: result.data };
}
