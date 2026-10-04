/**
 * JSON Schemas for Gemini structured output (`responseJsonSchema`), built from the
 * same zod schemas that parse the reply, so the two cannot drift apart. The zod
 * parse and the semantic validators still run on every reply: the schema steers
 * the model, it does not replace the checks.
 */
import { judgmentExerciseSchema } from "@/lib/ai/validators/judgment";
import { reframeExerciseSchema } from "@/lib/ai/validators/reframe";
import { strategyExerciseSchema } from "@/lib/ai/validators/strategy";
import { z } from "zod";
import { analyticalExerciseSchema } from "@/lib/ai/validators/common";
import { analyticalDeepDiveSchema } from "@/lib/ai/validators/deep-dive";
import { geoStraitExplanationSchema } from "@/lib/ai/validators/geo-strait";
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
  opts: { matrixOnly?: boolean } = {},
): Record<string, unknown> {
  if (taskType === "dealbreaker") return toGeminiSchema(scoringPayloadSchema);
  if (opts.matrixOnly && taskType === "auto" && !isGeopolitics) return toGeminiSchema(matrixPayloadSchema);
  if (taskType === "uncertainty") return toGeminiSchema(uncertaintyPayloadSchema);
  if (isGeopolitics) return toGeminiSchema(geopoliticsScoringPayloadSchema);
  return toGeminiSchema(z.union([matrixPayloadSchema, scoringPayloadSchema]));
}

/** "Close the strait" note in the Geo Lab (PLAN-geopolitics.md G2). */
export function geoStraitResponseSchema(): Record<string, unknown> {
  return toGeminiSchema(geoStraitExplanationSchema);
}

/** "Go deeper" on one Analytical answer-key item (PLAN-deep-dive.md D2). */
export function analyticalDeepDiveResponseSchema(): Record<string, unknown> {
  return toGeminiSchema(analyticalDeepDiveSchema);
}

/** Strategic situations (PLAN-learning.md L2). */
export function strategyResponseSchema(): Record<string, unknown> {
  return toGeminiSchema(strategyExerciseSchema);
}

/** Life situations (PLAN-learning.md L1). */
export function judgmentResponseSchema(): Record<string, unknown> {
  return toGeminiSchema(judgmentExerciseSchema);
}

/** Reframe (PLAN-psychology.md P1). */
export function reframeResponseSchema(): Record<string, unknown> {
  return toGeminiSchema(reframeExerciseSchema);
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
export function analyticalResponseSchema(
  isGeopolitics: boolean,
  opts: { withMainClaimQuiz?: boolean; withGeoExtras?: boolean } = {},
): Record<string, unknown> {
  if (isGeopolitics) {
    const shape = analyticalExerciseSchema.shape;
    const geo = analyticalExerciseSchema
      .omit({
        isSoundReasoning: true,
        mainClaimQuiz: true,
        concepts: true,
        conceptChecks: true,
        perspectiveOptions: true,
        actorCandidates: true,
        lensQuestions: true,
      })
      .extend({
        embeddedIssues: z.array(
          analyticalIssue.extend({
            type: z.enum(["framing_bias", "missing_actor", "assumed_causation", "analogy_misuse"]),
          }),
        ),
        hiddenPerspective: z.string(),
        missingActors: z.array(z.string()).min(1).max(2),
      });
    // Generated geopolitics passages (PLAN-geopolitics.md G1) also carry the learning extras.
    return toGeminiSchema(
      opts.withGeoExtras
        ? geo.extend({
            concepts: shape.concepts.unwrap(),
            conceptChecks: shape.conceptChecks.unwrap(),
            perspectiveOptions: shape.perspectiveOptions.unwrap(),
            actorCandidates: shape.actorCandidates.unwrap(),
            lensQuestions: shape.lensQuestions.unwrap(),
          })
        : geo,
    );
  }
  const plain = analyticalExerciseSchema
    .omit({ hiddenPerspective: true, missingActors: true, mainClaimQuiz: true })
    .extend({
      embeddedIssues: z.array(
        analyticalIssue.extend({
          type: z.enum(["logical_fallacy", "hidden_assumption", "weak_evidence", "bias"]),
        }),
      ),
    });
  // Only the guided level asks for the quiz; offering it elsewhere invites the model to fill it.
  return toGeminiSchema(
    opts.withMainClaimQuiz
      ? plain.extend({ mainClaimQuiz: analyticalExerciseSchema.shape.mainClaimQuiz.unwrap() })
      : plain,
  );
}
