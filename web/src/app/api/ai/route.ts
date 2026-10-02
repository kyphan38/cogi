import { NextResponse } from "next/server";
import {
  buildAnalyticalGenerationPrompt,
  buildAnalyticalFromUserTextPrompt,
  buildAnalyticalSoundReasoningPrompt,
  buildGeopoliticsAnalyticalPrompt,
  buildGeopoliticsFromUserTextPrompt,
} from "@/lib/ai/prompts/analytical";
import { isGeopoliticsAnalyticalDomain } from "@/lib/exercise/geopolitics-domains";
import {
  buildEvaluativeGenerationPrompt,
  buildEvaluativeDealbreakerPrompt,
  buildEvaluativeUncertaintyPrompt,
  buildGeopoliticsEvaluativePrompt,
} from "@/lib/ai/prompts/evaluative";
import {
  buildGeopoliticsSystemsPrompt,
  buildSystemsGenerationPrompt,
  buildSystemsResilienceGenerationPrompt,
} from "@/lib/ai/prompts/systems";
import {
  generateValidatedJson,
  validatedJsonFailureResponse,
} from "@/lib/ai/generate-validated";
import {
  analyticalResponseSchema,
  evaluativeResponseSchema,
  systemsResponseSchema,
} from "@/lib/ai/response-schemas";
import {
  GEOPOLITICS_ANALYTICAL_RETRY_SUFFIX,
  parseAnalyticalExerciseJson,
  validateGeopoliticsAnalyticalSemantics,
} from "@/lib/ai/validators/common";
import { repairAnalyticalSegments } from "@/lib/text/segment-match";
import {
  parseEvaluativeExerciseJson,
  validateEvaluativeSemantics,
  validateEvaluativeDealbreakerSemantics,
  validateGeopoliticsEvaluativeSemantics,
  EVALUATIVE_RETRY_SUFFIX,
  EVALUATIVE_DEALBREAKER_RETRY_SUFFIX,
  EVALUATIVE_UNCERTAINTY_RETRY_SUFFIX,
  GEOPOLITICS_EVALUATIVE_RETRY_SUFFIX,
  isGeopoliticsEvaluativePayload,
  type EvaluativeTaskType,
} from "@/lib/ai/validators/evaluative";
import {
  GEOPOLITICS_SYSTEMS_RETRY_SUFFIX,
  isGeopoliticsSystemsPayload,
  isResilienceSystemsPayload,
  parseSystemsExerciseJson,
  validateGeopoliticsSystemsSemantics,
  validateResilienceSystemsSemantics,
  validateSystemsExerciseSemantics,
  SYSTEMS_RESILIENCE_RETRY_SUFFIX,
  SYSTEMS_RETRY_SUFFIX,
  type SystemsTaskType,
} from "@/lib/ai/validators/systems";
import { sanitizeRealDataText } from "@/lib/text/sanitizeRealData";
import {
  buildLanguageLevelAppendix,
  DEFAULT_LANGUAGE_LEVEL,
  isLanguageLevel,
} from "@/lib/adaptive/language-level";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import {
  CUSTOM_DOMAIN_PLACEHOLDER,
  CUSTOM_SCENARIO_MAX_LEN,
} from "@/lib/ai/prompts/scenario-steering";

export const maxDuration = 60;

/** Parse an analytical reply and snap its quoted segments onto the passage text. */
function parseAndRepairAnalytical(raw: string) {
  const parsed = parseAnalyticalExerciseJson(raw);
  return parsed.success
    ? { success: true as const, data: repairAnalyticalSegments(parsed.data) }
    : parsed;
}

function parseSetupMode(
  raw: unknown,
  exerciseType: "analytical" | "systems" | "evaluative",
): "generated" | "real_data" | "custom_scenario" {
  const m =
    raw === "real_data" || raw === "generated" || raw === "custom_scenario" ? raw : "generated";
  if (exerciseType !== "analytical" && m === "real_data") return "generated";
  return m;
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRouteUser(req);
  if (!auth.ok) return auth.response;

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Server is missing GEMINI_API_KEY" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { ok: false, error: "Body must be an object" },
      { status: 400 },
    );
  }

  const rawDomain = (body as { domain?: unknown }).domain;
  const domainTrimmed = typeof rawDomain === "string" ? rawDomain.trim() : "";

  const rawScenario = (body as { customScenario?: unknown }).customScenario;
  const customScenarioRaw =
    typeof rawScenario === "string" && rawScenario.trim()
      ? rawScenario.trim().slice(0, CUSTOM_SCENARIO_MAX_LEN)
      : undefined;

  const rawContext = (body as { userContext?: unknown }).userContext;
  const userContext =
    typeof rawContext === "string" && rawContext.trim()
      ? rawContext.trim()
      : undefined;

  const rawType = (body as { exerciseType?: unknown }).exerciseType;
  const exerciseType =
    rawType === "systems" ? "systems" : rawType === "evaluative" ? "evaluative" : "analytical";

  const rawMode = (body as { mode?: unknown }).mode;
  const mode = parseSetupMode(rawMode, exerciseType);

  if (!domainTrimmed && !customScenarioRaw) {
    return NextResponse.json(
      {
        ok: false,
        error: "Provide domain and/or customScenario (non-empty).",
      },
      { status: 400 },
    );
  }

  if (mode === "custom_scenario" && !customScenarioRaw) {
    return NextResponse.json(
      {
        ok: false,
        error: 'customScenario is required when mode is "custom_scenario".',
      },
      { status: 400 },
    );
  }

  const effectiveDomain = domainTrimmed || CUSTOM_DOMAIN_PLACEHOLDER;
  const scenarioForPrompt = mode === "custom_scenario" ? customScenarioRaw : undefined;

  // Language-complexity bar (Settings). Always tolerant of missing/malformed values:
  // falls back to the default level.
  const rawLanguageLevel = (body as { languageLevel?: unknown }).languageLevel;
  const languageLevel = isLanguageLevel(rawLanguageLevel) ? rawLanguageLevel : DEFAULT_LANGUAGE_LEVEL;
  const languageAppendix = buildLanguageLevelAppendix(languageLevel);

  // Passed to every prompt builder as its `adaptationAppendix`.
  const adaptationAppendix = languageAppendix?.trim() ? languageAppendix : undefined;

  try {
    if (exerciseType === "evaluative") {
      const rawEvaluativeTaskType = (body as { evaluativeTaskType?: unknown })
        .evaluativeTaskType;
      const evaluativeTaskType: EvaluativeTaskType =
        rawEvaluativeTaskType === "dealbreaker" || rawEvaluativeTaskType === "uncertainty"
          ? rawEvaluativeTaskType
          : "auto";

      // Geopolitics domain auto-detect only applies on the "auto" path - dealbreaker/uncertainty
      // never check isGeoEval (see plan §Phase 3.1 scope decision).
      const isGeoEval =
        evaluativeTaskType === "auto" && isGeopoliticsAnalyticalDomain(effectiveDomain);

      const basePrompt =
        evaluativeTaskType === "dealbreaker"
          ? buildEvaluativeDealbreakerPrompt({
              domain: effectiveDomain,
              userContext,
              adaptationAppendix,
              customScenario: scenarioForPrompt,
            })
          : evaluativeTaskType === "uncertainty"
            ? buildEvaluativeUncertaintyPrompt({
                domain: effectiveDomain,
                userContext,
                adaptationAppendix,
                customScenario: scenarioForPrompt,
              })
            : isGeoEval
              ? buildGeopoliticsEvaluativePrompt({
                  domain: effectiveDomain,
                  userContext,
                  adaptationAppendix,
                  customScenario: scenarioForPrompt,
                })
              : buildEvaluativeGenerationPrompt({
                  domain: effectiveDomain,
                  userContext,
                  adaptationAppendix,
                  customScenario: scenarioForPrompt,
                });

      const computeSem = (data: Parameters<typeof validateEvaluativeSemantics>[0]) => {
        if (evaluativeTaskType === "dealbreaker") {
          return validateEvaluativeDealbreakerSemantics(data);
        }
        const baseSem = validateEvaluativeSemantics(data);
        const geoSem = isGeopoliticsEvaluativePayload(data)
          ? validateGeopoliticsEvaluativeSemantics(data)
          : isGeoEval
            ? ["Expected geopolitics scoring payload with stakeholderNote"]
            : [];
        return [...baseSem, ...geoSem];
      };

      const r = await generateValidatedJson({
        prompt: basePrompt,
        parse: parseEvaluativeExerciseJson,
        validate: computeSem,
        retrySuffix:
          evaluativeTaskType === "dealbreaker"
            ? EVALUATIVE_DEALBREAKER_RETRY_SUFFIX
            : evaluativeTaskType === "uncertainty"
              ? EVALUATIVE_UNCERTAINTY_RETRY_SUFFIX
              : isGeoEval
                ? GEOPOLITICS_EVALUATIVE_RETRY_SUFFIX
                : EVALUATIVE_RETRY_SUFFIX,
        responseJsonSchema: evaluativeResponseSchema(evaluativeTaskType, isGeoEval),
      });
      if (!r.ok) return validatedJsonFailureResponse(r);
      return NextResponse.json({ ok: true, data: r.data });
    }

    const rawSystemsTaskType = (body as { systemsTaskType?: unknown }).systemsTaskType;
    const systemsTaskType: SystemsTaskType =
      rawSystemsTaskType === "geopolitics" || rawSystemsTaskType === "resilience"
        ? rawSystemsTaskType
        : "auto";
    // Geopolitics domain auto-detect only applies on the "auto" path - resilience never checks it
    // (parity with evaluativeTaskType handling above).
    const isGeoSystems =
      exerciseType === "systems" &&
      (systemsTaskType === "geopolitics" ||
        (systemsTaskType === "auto" && isGeopoliticsAnalyticalDomain(effectiveDomain)));

    const useGeopoliticsAnalytical =
      exerciseType === "analytical" &&
      (mode === "generated" || mode === "custom_scenario") &&
      isGeopoliticsAnalyticalDomain(effectiveDomain);
    const basePrompt =
      exerciseType === "systems"
        ? systemsTaskType === "resilience"
          ? buildSystemsResilienceGenerationPrompt({
              domain: effectiveDomain,
              userContext,
              adaptationAppendix,
              customScenario: scenarioForPrompt,
            })
          : isGeoSystems
            ? buildGeopoliticsSystemsPrompt({
                domain: effectiveDomain,
                userContext,
                adaptationAppendix,
                customScenario: scenarioForPrompt,
              })
            : buildSystemsGenerationPrompt({
                domain: effectiveDomain,
                userContext,
                adaptationAppendix,
                customScenario: scenarioForPrompt,
              })
        : (() => {
            if (useGeopoliticsAnalytical) {
              return buildGeopoliticsAnalyticalPrompt({
                domain: effectiveDomain,
                userContext,
                adaptationAppendix,
                customScenario: scenarioForPrompt,
              });
            }
            const useSoundReasoning =
              exerciseType === "analytical" &&
              mode === "generated" &&
              !scenarioForPrompt &&
              Math.random() < 0.2;
            const base = useSoundReasoning
              ? buildAnalyticalSoundReasoningPrompt({
                  domain: effectiveDomain,
                  userContext,
                  adaptationAppendix,
                  customScenario: scenarioForPrompt,
                })
              : buildAnalyticalGenerationPrompt({
                  domain: effectiveDomain,
                  userContext,
                  adaptationAppendix,
                  customScenario: scenarioForPrompt,
                });
            return base;
          })();

    if (exerciseType === "systems") {
      const r = await generateValidatedJson({
        prompt: basePrompt,
        parse: parseSystemsExerciseJson,
        validate: (data) => [
          ...validateSystemsExerciseSemantics(data),
          ...(isResilienceSystemsPayload(data)
            ? validateResilienceSystemsSemantics(data)
            : isGeopoliticsSystemsPayload(data)
              ? validateGeopoliticsSystemsSemantics(data)
              : []),
        ],
        retrySuffix:
          systemsTaskType === "resilience"
            ? SYSTEMS_RESILIENCE_RETRY_SUFFIX
            : isGeoSystems
              ? GEOPOLITICS_SYSTEMS_RETRY_SUFFIX
              : SYSTEMS_RETRY_SUFFIX,
        responseJsonSchema: systemsResponseSchema(systemsTaskType, isGeoSystems),
      });
      if (!r.ok) return validatedJsonFailureResponse(r);
      return NextResponse.json({ ok: true, data: r.data });
    }

    // Analytical (generated, custom_scenario, or real_data based on mode).
    if (mode === "real_data") {
      const rawUserText = (body as { userText?: unknown }).userText;
      if (typeof rawUserText !== "string" || !rawUserText.trim()) {
        return NextResponse.json(
          { ok: false, error: "userText is required and must be a non-empty string" },
          { status: 400 },
        );
      }
      const { text: sanitized, wordCount } = sanitizeRealDataText(rawUserText);
      if (!sanitized) {
        return NextResponse.json(
          { ok: false, error: "Provided text is empty after sanitization" },
          { status: 400 },
        );
      }
      if (wordCount > 2000) {
        return NextResponse.json(
          {
            ok: false,
            error: `Text is too long after sanitization (${wordCount} words). Please keep it under 2000 words.`,
          },
          { status: 400 },
        );
      }
      const isGeoReal = isGeopoliticsAnalyticalDomain(effectiveDomain);
      const fromTextPrompt = isGeoReal
        ? buildGeopoliticsFromUserTextPrompt({
            domain: effectiveDomain,
            userContext,
            userText: sanitized,
            adaptationAppendix,
          })
        : buildAnalyticalFromUserTextPrompt({
            domain: effectiveDomain,
            userContext,
            userText: sanitized,
            adaptationAppendix,
          });
      const rReal = await generateValidatedJson({
        prompt: fromTextPrompt,
        parse: parseAndRepairAnalytical,
        validate: (data) => (isGeoReal ? validateGeopoliticsAnalyticalSemantics(data) : []),
        retrySuffix: isGeoReal ? GEOPOLITICS_ANALYTICAL_RETRY_SUFFIX : undefined,
        responseJsonSchema: analyticalResponseSchema(isGeoReal),
      });
      if (!rReal.ok) {
        return validatedJsonFailureResponse(
          rReal,
          "AI could not analyze the pasted text. Please try again.",
        );
      }
      const data = { ...rReal.data, passage: sanitized };
      return NextResponse.json({ ok: true, data });
    }

    const r = await generateValidatedJson({
      prompt: basePrompt,
      parse: parseAndRepairAnalytical,
      validate: validateGeopoliticsAnalyticalSemantics,
      retrySuffix: GEOPOLITICS_ANALYTICAL_RETRY_SUFFIX,
      responseJsonSchema: analyticalResponseSchema(useGeopoliticsAnalytical),
    });
    if (!r.ok) return validatedJsonFailureResponse(r);
    return NextResponse.json({ ok: true, data: r.data });
  } catch (e) {
    const isTimeout =
      e instanceof Error &&
      (e.name === "AbortError" || e.message.includes("timed out") || e.message.includes("timeout"));
    if (isTimeout) {
      return NextResponse.json(
        { ok: false, error: "Exercise generation timed out. Please try again." },
        { status: 504 },
      );
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
