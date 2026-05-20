import { z } from "zod";
import { findSegmentRange } from "@/lib/text/segment-match";

const embeddedIssueTypeSchema = z.enum([
  "logical_fallacy",
  "hidden_assumption",
  "weak_evidence",
  "bias",
  "framing_bias",
  "missing_actor",
  "assumed_causation",
  "analogy_misuse",
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
  embeddedIssues: z.array(embeddedIssueSchema),
  validPoints: z.array(validPointSchema).min(1),
  isSoundReasoning: z.boolean().optional(),
  hiddenPerspective: z.string().optional(),
  missingActors: z.array(z.string()).min(1).max(3).optional(),
});

export type AnalyticalExercise = z.infer<typeof analyticalExerciseSchema>;

const GEO_ISSUE_TYPES = [
  "framing_bias",
  "missing_actor",
  "assumed_causation",
  "analogy_misuse",
] as const;

export function isGeopoliticsAnalyticalPayload(data: AnalyticalExercise): boolean {
  return (
    Boolean(data.hiddenPerspective?.trim()) ||
    data.embeddedIssues.some((i) =>
      (GEO_ISSUE_TYPES as readonly string[]).includes(i.type),
    )
  );
}

export function validateGeopoliticsAnalyticalSemantics(
  data: AnalyticalExercise,
): string[] {
  if (!isGeopoliticsAnalyticalPayload(data)) return [];

  const errors: string[] = [];

  if (!data.hiddenPerspective?.trim()) {
    errors.push("hiddenPerspective is required for geopolitics exercises");
  }
  const actors = data.missingActors ?? [];
  if (actors.length < 1 || actors.length > 2) {
    errors.push("missingActors must have 1-2 entries");
  }
  if (data.embeddedIssues.length !== 4) {
    errors.push("embeddedIssues must have exactly 4 items");
  }
  if (data.validPoints.length !== 2) {
    errors.push("validPoints must have exactly 2 items");
  }

  for (const t of GEO_ISSUE_TYPES) {
    const count = data.embeddedIssues.filter((i) => i.type === t).length;
    if (count !== 1) {
      errors.push(`expected exactly one embedded issue of type ${t}, got ${count}`);
    }
  }

  const sev = data.embeddedIssues.map((i) => i.severity);
  const obvious = sev.filter((s) => s === "obvious").length;
  const moderate = sev.filter((s) => s === "moderate").length;
  const subtle = sev.filter((s) => s === "subtle").length;
  if (obvious !== 1 || moderate !== 2 || subtle !== 1) {
    errors.push("severities must be 1 obvious, 2 moderate, 1 subtle");
  }

  for (const issue of data.embeddedIssues) {
    if (!findSegmentRange(data.passage, issue.textSegment)) {
      errors.push(`textSegment not found in passage for issue type ${issue.type}`);
    }
  }
  for (const vp of data.validPoints) {
    if (!findSegmentRange(data.passage, vp.textSegment)) {
      errors.push("textSegment not found in passage for a validPoint");
    }
  }

  return errors;
}

export const GEOPOLITICS_ANALYTICAL_RETRY_SUFFIX =
  "Your previous JSON failed validation. Fix ALL issues and return ONLY the corrected JSON object.";

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
