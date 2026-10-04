import { z } from "zod";
import { findSegmentRange } from "@/lib/text/segment-match";
import { GEO_LENSES, type GeoAnalyticalLevelConfig } from "@/lib/exercise/analytical-levels";

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

const mainClaimQuizSchema = z.object({
  options: z.array(z.string()),
  answerIndex: z.number().int(),
  explanation: z.string(),
});

const geoConceptSchema = z.object({ term: z.string(), plain: z.string(), example: z.string() });
const geoChoiceSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  answerIndex: z.number().int(),
  explanation: z.string(),
});
const geoLensQuestionSchema = geoChoiceSchema.extend({ lens: z.enum(GEO_LENSES) });

const validPointSchema = z.object({
  textSegment: z.string(),
  explanation: z.string(),
});

export const analyticalExerciseSchema = z.object({
  title: z.string(),
  passage: z.string(),
  embeddedIssues: z.array(embeddedIssueSchema),
  // No .min(1): count requirements are enforced by the semantic validators below.
  validPoints: z.array(validPointSchema),
  isSoundReasoning: z.boolean().optional(),
  /** Guided level only: pick the main claim before looking for problems. */
  mainClaimQuiz: mainClaimQuizSchema.optional(),
  hiddenPerspective: z.string().optional(),
  missingActors: z.array(z.string()).min(1).max(3).optional(),
  /** Geopolitics (PLAN-geopolitics.md G1): "Learn first" ideas and their quick check. */
  concepts: z.array(geoConceptSchema).optional(),
  conceptChecks: z.array(geoChoiceSchema).optional(),
  /** 4 viewpoints to pick from; exactly one is `hiddenPerspective`. */
  perspectiveOptions: z.array(z.string()).optional(),
  /** 4-6 actors to pick from; includes every `missingActors` entry. */
  actorCandidates: z.array(z.string()).optional(),
  /** One question per lens: realist, liberal, constructivist, political_economy. */
  lensQuestions: z.array(geoLensQuestionSchema).optional(),
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

/**
 * Geopolitics passages. Without `level` (pasted text) the passage has all four issue
 * types and 2 decoys; with `level` (generated) the counts follow the level and the
 * G1 extras (concepts, perspective options, actor candidates, lens questions) are
 * required, since the exercise shows them.
 */
export function validateGeopoliticsAnalyticalSemantics(
  data: AnalyticalExercise,
  opts: { level?: GeoAnalyticalLevelConfig } = {},
): string[] {
  if (!isGeopoliticsAnalyticalPayload(data)) return [];

  const errors: string[] = [];
  const types: readonly string[] = opts.level?.issueTypes ?? GEO_ISSUE_TYPES;
  const decoys = opts.level?.decoys ?? 2;

  if (!data.hiddenPerspective?.trim()) {
    errors.push("hiddenPerspective is required for geopolitics exercises");
  }
  const actors = data.missingActors ?? [];
  if (actors.length < 1 || actors.length > 2) {
    errors.push("missingActors must have 1-2 entries");
  }
  if (data.embeddedIssues.length !== types.length) {
    errors.push(`embeddedIssues must have exactly ${types.length} items`);
  }
  if (data.validPoints.length !== decoys) {
    errors.push(`validPoints must have exactly ${decoys} item(s)`);
  }

  for (const t of GEO_ISSUE_TYPES) {
    const count = data.embeddedIssues.filter((i) => i.type === t).length;
    const want = types.includes(t) ? 1 : 0;
    if (count !== want) {
      errors.push(`expected ${want} embedded issue(s) of type ${t}, got ${count}`);
    }
  }

  errors.push(...severityErrors(data));
  if (opts.level) errors.push(...geoExtraErrors(data));

  return [...errors, ...segmentErrors(data)];
}

const norm = (s: string) => s.trim().toLowerCase();

function choiceErrors(q: { options: string[]; answerIndex: number; explanation: string }, where: string): string[] {
  const errors: string[] = [];
  const options = q.options.map((o) => o.trim());
  if (options.length !== 3 || options.some((o) => !o)) errors.push(`${where}: options must be exactly 3 non-empty strings`);
  else if (new Set(options.map(norm)).size !== 3) errors.push(`${where}: options must be different from each other`);
  if (q.answerIndex < 0 || q.answerIndex > 2) errors.push(`${where}: answerIndex must be 0, 1 or 2`);
  if (!q.explanation.trim()) errors.push(`${where}: explanation is required`);
  return errors;
}

function geoExtraErrors(data: AnalyticalExercise): string[] {
  const errors: string[] = [];
  const concepts = data.concepts ?? [];
  if (concepts.length < 2 || concepts.length > 4) errors.push("concepts must have 2-4 items");
  if (concepts.some((c) => !c.term.trim() || !c.plain.trim() || !c.example.trim())) {
    errors.push("every concept needs a term, plain and example");
  }
  const checks = data.conceptChecks ?? [];
  if (checks.length < 1 || checks.length > 2) errors.push("conceptChecks must have 1-2 items");
  checks.forEach((q, i) => errors.push(...choiceErrors(q, `conceptChecks[${i}]`)));

  const views = (data.perspectiveOptions ?? []).map(norm);
  const hidden = norm(data.hiddenPerspective ?? "");
  if (views.length !== 4 || new Set(views).size !== 4 || views.some((v) => !v)) {
    errors.push("perspectiveOptions must have exactly 4 different viewpoints");
  }
  if (views.filter((v) => v === hidden).length !== 1) {
    errors.push("perspectiveOptions must include hiddenPerspective word for word, exactly once");
  }

  const candidates = (data.actorCandidates ?? []).map(norm);
  if (candidates.length < 4 || candidates.length > 6 || new Set(candidates).size !== candidates.length) {
    errors.push("actorCandidates must have 4-6 different actors");
  }
  for (const a of data.missingActors ?? []) {
    if (!candidates.includes(norm(a))) errors.push(`actorCandidates must include the missing actor "${a}" word for word`);
  }

  const lenses = (data.lensQuestions ?? []).map((q) => q.lens);
  if (lenses.length !== GEO_LENSES.length || new Set(lenses).size !== GEO_LENSES.length) {
    errors.push(`lensQuestions must have exactly one question for each lens: ${GEO_LENSES.join(", ")}`);
  }
  (data.lensQuestions ?? []).forEach((q) => errors.push(...choiceErrors(q, `lensQuestions[${q.lens}]`)));
  return errors;
}

const PLAIN_ISSUE_TYPES = [
  "logical_fallacy",
  "hidden_assumption",
  "weak_evidence",
  "bias",
] as const;

/**
 * Plain (non-geopolitics) passages. The answer key is built from these fields, so a
 * missing issue or a segment that is not in the passage would show the user a wrong
 * answer. `expectSound` is the sound-reasoning variant: no issues, only decoys.
 */
export function validateAnalyticalSemantics(
  data: AnalyticalExercise,
  opts: { expectSound?: boolean; expectMainClaimQuiz?: boolean } = {},
): string[] {
  const errors: string[] = opts.expectMainClaimQuiz ? mainClaimQuizErrors(data) : [];

  if (opts.expectSound) {
    if (data.embeddedIssues.length !== 0) {
      errors.push("embeddedIssues must be empty for a sound-reasoning passage");
    }
    if (data.validPoints.length < 2 || data.validPoints.length > 3) {
      errors.push("validPoints must have 2-3 items for a sound-reasoning passage");
    }
    return [...errors, ...segmentErrors(data)];
  }

  if (data.isSoundReasoning === true) {
    errors.push("isSoundReasoning must not be true for a passage with embedded issues");
  }
  if (data.embeddedIssues.length !== 4) {
    errors.push("embeddedIssues must have exactly 4 items");
  }
  if (data.validPoints.length !== 2) {
    errors.push("validPoints must have exactly 2 items");
  }
  for (const issue of data.embeddedIssues) {
    if (!(PLAIN_ISSUE_TYPES as readonly string[]).includes(issue.type)) {
      errors.push(`issue type ${issue.type} is not allowed; use ${PLAIN_ISSUE_TYPES.join(", ")}`);
    }
  }
  errors.push(...severityErrors(data));

  return [...errors, ...segmentErrors(data)];
}

function mainClaimQuizErrors(data: AnalyticalExercise): string[] {
  const q = data.mainClaimQuiz;
  if (!q) return ["mainClaimQuiz is required"];
  const errors: string[] = [];
  const options = q.options.map((o) => o.trim());
  if (options.length !== 3 || options.some((o) => !o)) {
    errors.push("mainClaimQuiz.options must have exactly 3 non-empty statements");
  } else if (new Set(options.map((o) => o.toLowerCase())).size !== 3) {
    errors.push("mainClaimQuiz.options must be different from each other");
  }
  if (q.answerIndex < 0 || q.answerIndex > 2) {
    errors.push("mainClaimQuiz.answerIndex must be 0, 1 or 2");
  }
  if (!q.explanation.trim()) errors.push("mainClaimQuiz.explanation is required");
  return errors;
}

/** 4 issues: 1 obvious, 2 moderate, 1 subtle. 2 issues (geopolitics Guided): 1 obvious, 1 moderate. */
function severityErrors(data: AnalyticalExercise): string[] {
  const sev = data.embeddedIssues.map((i) => i.severity);
  const obvious = sev.filter((s) => s === "obvious").length;
  const moderate = sev.filter((s) => s === "moderate").length;
  const subtle = sev.filter((s) => s === "subtle").length;
  if (sev.length === 2) {
    return obvious !== 1 || moderate !== 1 ? ["severities must be 1 obvious, 1 moderate"] : [];
  }
  return obvious !== 1 || moderate !== 2 || subtle !== 1
    ? ["severities must be 1 obvious, 2 moderate, 1 subtle"]
    : [];
}

function segmentErrors(data: AnalyticalExercise): string[] {
  const errors: string[] = [];
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

export const ANALYTICAL_RETRY_SUFFIX =
  "Your previous JSON failed validation. Fix ALL issues and return ONLY the corrected JSON object. Every textSegment must be copied verbatim from passage.";

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
