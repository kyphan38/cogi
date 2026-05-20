import { z } from "zod";

export const generativeStageSchema = z.enum(["edit", "hint", "independent"]);

export type GenerativeStage = z.infer<typeof generativeStageSchema>;

const promptSchema = z.object({
  id: z.string().min(1).max(20),
  question: z.string().min(1).max(500),
  /** Stage edit - full draft for user to edit */
  draftText: z.string().min(1).max(4000).optional(),
  /** Stage hint - 2–3 bullets */
  hints: z.array(z.string().min(1).max(400)).optional(),
  /** Stage independent - optional hidden hint until user taps Show hint */
  spareHint: z.string().min(1).max(600).optional(),
});

export const generativeExercisePayloadSchema = z.object({
  title: z.string().min(1).max(200),
  scenario: z.string().min(1).max(4000),
  prompts: z.array(promptSchema).length(4),
});

export type GenerativeExercisePayload = z.infer<typeof generativeExercisePayloadSchema>;

export const GENERATIVE_RETRY_SUFFIX = `

IMPORTANT: Your previous JSON failed validation. Return ONLY valid JSON:
- Exactly 4 prompts with unique ids.
- For generativeStage "edit": every prompt MUST include draftText (non-empty string).
- For "hint": every prompt MUST include hints array of 2-3 non-empty strings.
- For "independent": do NOT include draftText or hints; you MAY include spareHint per prompt (optional).
`;

export function parseGenerativeExerciseJson(
  raw: string,
): { success: true; data: GenerativeExercisePayload } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { success: false, error: "Response was not valid JSON" };
  }
  const r = generativeExercisePayloadSchema.safeParse(parsed);
  if (!r.success) {
    return { success: false, error: r.error.issues.map((i) => i.message).join("; ") };
  }
  return { success: true, data: r.data };
}

export function validateGenerativeSemantics(
  data: GenerativeExercisePayload,
  stage: GenerativeStage,
): string[] {
  const errors: string[] = [];
  const ids = data.prompts.map((p) => p.id);
  if (new Set(ids).size !== ids.length) errors.push("Prompt ids must be unique");
  if (stage === "edit") {
    for (const p of data.prompts) {
      if (!p.draftText?.trim()) errors.push(`Prompt ${p.id} requires draftText for edit stage`);
    }
  } else if (stage === "hint") {
    for (const p of data.prompts) {
      const h = p.hints ?? [];
      if (h.length < 2 || h.length > 3) {
        errors.push(`Prompt ${p.id} requires hints array of 2-3 items`);
      }
    }
  } else {
    for (const p of data.prompts) {
      if (p.draftText) errors.push(`Prompt ${p.id} must not include draftText in independent stage`);
      if (p.hints?.length) errors.push(`Prompt ${p.id} must not include hints in independent stage`);
    }
  }
  return errors;
}

const GEO_PROMPT_IDS = ["p1", "p2", "p3", "p4"] as const;

export function validateGeopoliticsGenerativeSemantics(
  data: GenerativeExercisePayload,
): string[] {
  const errors: string[] = [];
  const ids = data.prompts.map((p) => p.id);
  if (ids.length !== 4) {
    errors.push("Geopolitics generative requires exactly 4 prompts");
  }
  for (const expected of GEO_PROMPT_IDS) {
    if (!ids.includes(expected)) {
      errors.push(`Geopolitics generative missing prompt id ${expected}`);
    }
  }
  if (data.scenario.trim().length < 400) {
    errors.push("Geopolitics scenario should be at least ~400 characters (2-3 paragraphs)");
  }
  const p4 = data.prompts.find((p) => p.id === "p4");
  if (p4) {
    const q = p4.question.toLowerCase();
    const hasRobustCue =
      /robust|recommend|now|across|three|futures|decision/.test(q);
    if (!hasRobustCue) {
      errors.push("Prompt p4 should ask for a robust recommendation across scenarios");
    }
  }
  const p2 = data.prompts.find((p) => p.id === "p2")?.question.trim() ?? "";
  const p3 = data.prompts.find((p) => p.id === "p3")?.question.trim() ?? "";
  if (p2 && p3 && p2 === p3) {
    errors.push("Prompts p2 and p3 questions must differ (upside vs downside)");
  }
  return errors;
}
