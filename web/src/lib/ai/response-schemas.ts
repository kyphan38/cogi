/**
 * JSON Schemas for Gemini structured output (`responseJsonSchema`), built from the
 * same zod schemas that parse the reply, so the two cannot drift apart. The zod
 * parse and the semantic validators still run on every reply: the schema steers
 * the model, it does not replace the checks.
 */
import { z } from "zod";
import { analyticalExerciseSchema } from "@/lib/ai/validators/common";
import {
  geopoliticsScoringPayloadSchema,
  matrixPayloadSchema,
  scoringPayloadSchema,
  uncertaintyPayloadSchema,
  type EvaluativeTaskType,
} from "@/lib/ai/validators/evaluative";
import {
  systemsExerciseSchema,
  systemsGeopoliticsExerciseSchema,
  systemsResilienceExerciseSchema,
  type SystemsTaskType,
} from "@/lib/ai/validators/systems";

function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  // "input" keeps optional fields optional; $schema is noise for the API.
  const json = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

export function evaluativeResponseSchema(
  taskType: EvaluativeTaskType,
  isGeopolitics: boolean,
): Record<string, unknown> {
  if (taskType === "dealbreaker") return toGeminiSchema(scoringPayloadSchema);
  if (taskType === "uncertainty") return toGeminiSchema(uncertaintyPayloadSchema);
  if (isGeopolitics) return toGeminiSchema(geopoliticsScoringPayloadSchema);
  return toGeminiSchema(z.union([matrixPayloadSchema, scoringPayloadSchema]));
}

export function systemsResponseSchema(
  taskType: SystemsTaskType,
  isGeopolitics: boolean,
): Record<string, unknown> {
  if (taskType === "resilience") return toGeminiSchema(systemsResilienceExerciseSchema);
  if (isGeopolitics) return toGeminiSchema(systemsGeopoliticsExerciseSchema);
  return toGeminiSchema(systemsExerciseSchema);
}

const analyticalIssue = analyticalExerciseSchema.shape.embeddedIssues.element;

/**
 * Plain and geopolitics passages use different issue types, and the geo-only fields
 * mark a payload as geopolitics. Offering those fields on a plain passage makes the
 * model fill them in, which then fails the geopolitics checks - so each gets its own.
 */
export function analyticalResponseSchema(isGeopolitics: boolean): Record<string, unknown> {
  if (isGeopolitics) {
    return toGeminiSchema(
      analyticalExerciseSchema.omit({ isSoundReasoning: true }).extend({
        embeddedIssues: z.array(
          analyticalIssue.extend({
            type: z.enum(["framing_bias", "missing_actor", "assumed_causation", "analogy_misuse"]),
          }),
        ),
        hiddenPerspective: z.string(),
        missingActors: z.array(z.string()).min(1).max(2),
      }),
    );
  }
  return toGeminiSchema(
    analyticalExerciseSchema.omit({ hiddenPerspective: true, missingActors: true }).extend({
      embeddedIssues: z.array(
        analyticalIssue.extend({
          type: z.enum(["logical_fallacy", "hidden_assumption", "weak_evidence", "bias"]),
        }),
      ),
    }),
  );
}
