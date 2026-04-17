import { z } from "zod";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";

const perspectivePointSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  body: z.string().min(1),
});

export const aiPerspectiveStructuredSchema = z.object({
  embedded: z.array(perspectivePointSchema).min(1),
  userFound: z.array(perspectivePointSchema),
  additional: z.array(perspectivePointSchema).min(1),
  openQuestions: z.array(perspectivePointSchema).min(1),
});

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (m?.[1]) return m[1].trim();
  return trimmed;
}

export type ParseStructuredPerspectiveResult =
  | { success: true; data: AIPerspectiveStructured }
  | { success: false; error: string };

export function parseStructuredPerspectiveJson(
  text: string,
): ParseStructuredPerspectiveResult {
  const stripped = stripJsonFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = aiPerspectiveStructuredSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((i) => i.message).join("; "),
    };
  }
  return { success: true, data: result.data };
}

export const STRUCTURED_PERSPECTIVE_RETRY_SUFFIX = `Your previous answer was not valid JSON or did not match the required schema.
Return ONLY a single JSON object (no markdown fences) with keys: embedded, userFound, additional, openQuestions.
Each value is an array of objects { "id": string, "title"?: string, "body": string }.
Use stable ids like "emb_1", "user_1", "add_1", "open_1".`;
