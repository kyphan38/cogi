import { NextResponse } from "next/server";
import {
  buildAnalyticalGenerationPrompt,
  buildAnalyticalFromUserTextPrompt,
  buildAnalyticalSoundReasoningPrompt,
  buildAnalyticalSteelmanPrompt,
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
  buildGenerativeGenerationPrompt,
  buildGeopoliticsGenerativePrompt,
  buildReframingGenerativePrompt,
  buildInversionGenerativePrompt,
  GEOPOLITICS_GENERATIVE_RETRY_SUFFIX,
} from "@/lib/ai/prompts/generative";
import { getGeopoliticsRegionalAppendix } from "@/lib/exercise/geopolitics-regional-appendix";
import { buildSequentialGenerationPrompt } from "@/lib/ai/prompts/sequential";
import {
  buildGeopoliticsSystemsPrompt,
  buildSystemsGenerationPrompt,
} from "@/lib/ai/prompts/systems";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import {
  ANALYTICAL_STEELMAN_RETRY_SUFFIX,
  GEOPOLITICS_ANALYTICAL_RETRY_SUFFIX,
  parseAnalyticalExerciseJson,
  validateAnalyticalSteelmanSemantics,
  validateGeopoliticsAnalyticalSemantics,
  type AnalyticalVariant,
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
  parseGenerativeExerciseJson,
  validateGenerativeSemantics,
  validateGeopoliticsGenerativeSemantics,
  validateReframingGenerativeSemantics,
  validateInversionGenerativeSemantics,
  GENERATIVE_RETRY_SUFFIX,
  REFRAMING_GENERATIVE_RETRY_SUFFIX,
  INVERSION_GENERATIVE_RETRY_SUFFIX,
  type GenerativeStage,
  type GenerativeVariant,
} from "@/lib/ai/validators/generative";
import { parseSequentialExerciseJson } from "@/lib/ai/validators/sequential";
import {
  GEOPOLITICS_SYSTEMS_RETRY_SUFFIX,
  isGeopoliticsSystemsPayload,
  parseSystemsExerciseJson,
  validateGeopoliticsSystemsSemantics,
  validateSystemsExerciseSemantics,
  SYSTEMS_RETRY_SUFFIX,
} from "@/lib/ai/validators/systems";
import { sanitizeRealDataText } from "@/lib/text/sanitizeRealData";
import {
  buildAdaptationAppendix,
  normalizeAdaptiveHints,
} from "@/lib/adaptive/adaptive-appendix";
import type { AdaptiveExerciseType } from "@/lib/adaptive/types";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import {
  CUSTOM_DOMAIN_PLACEHOLDER,
  CUSTOM_SCENARIO_MAX_LEN,
} from "@/lib/ai/prompts/scenario-steering";

export const maxDuration = 60;

function parseSetupMode(
  raw: unknown,
  exerciseType: "analytical" | "sequential" | "systems" | "evaluative" | "generative",
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
    rawType === "sequential"
      ? "sequential"
      : rawType === "systems"
        ? "systems"
        : rawType === "evaluative"
          ? "evaluative"
          : rawType === "generative"
            ? "generative"
            : "analytical";

  const rawMode = (body as { mode?: unknown }).mode;
  const mode = parseSetupMode(rawMode, exerciseType);

  const rawAnalyticalVariant = (body as { analyticalVariant?: unknown }).analyticalVariant;
  const analyticalVariant: AnalyticalVariant =
    rawAnalyticalVariant === "steelman" ? "steelman" : "highlight_tag";

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

  const rawHints = (body as { adaptiveHints?: unknown }).adaptiveHints;
  const adaptiveHints = normalizeAdaptiveHints(rawHints);

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
              adaptationAppendix: buildAdaptationAppendix(adaptiveHints, "evaluative"),
              customScenario: scenarioForPrompt,
            })
          : evaluativeTaskType === "uncertainty"
            ? buildEvaluativeUncertaintyPrompt({
                domain: effectiveDomain,
                userContext,
                adaptationAppendix: buildAdaptationAppendix(adaptiveHints, "evaluative"),
                customScenario: scenarioForPrompt,
              })
            : isGeoEval
              ? buildGeopoliticsEvaluativePrompt({
                  domain: effectiveDomain,
                  userContext,
                  adaptationAppendix: buildAdaptationAppendix(adaptiveHints, "evaluative"),
                  customScenario: scenarioForPrompt,
                })
              : buildEvaluativeGenerationPrompt({
                  domain: effectiveDomain,
                  userContext,
                  adaptationAppendix: buildAdaptationAppendix(adaptiveHints, "evaluative"),
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

      const runEv = async (prompt: string) => {
        const raw = await generateAnalyticalExerciseRaw(prompt, "thinking");
        const parsed = parseEvaluativeExerciseJson(raw);
        if (!parsed.success) {
          return { ok: false as const, raw, parsed, sem: [] as string[] };
        }
        const sem = computeSem(parsed.data);
        return { ok: true as const, raw, parsed, sem };
      };
      let r = await runEv(basePrompt);
      if (!r.ok || r.sem.length > 0) {
        const reason = !r.ok
          ? `Invalid JSON from model: ${!r.parsed.success ? r.parsed.error : ""}`
          : `Semantic validation failed:\n${r.sem.join("\n")}`;
        const suffix =
          evaluativeTaskType === "dealbreaker"
            ? EVALUATIVE_DEALBREAKER_RETRY_SUFFIX
            : evaluativeTaskType === "uncertainty"
              ? EVALUATIVE_UNCERTAINTY_RETRY_SUFFIX
              : isGeoEval
                ? GEOPOLITICS_EVALUATIVE_RETRY_SUFFIX
                : EVALUATIVE_RETRY_SUFFIX;
        r = await runEv(`${basePrompt}\n${suffix}\n${reason}`);
      }
      if (!r.ok || !r.parsed.success) {
        return NextResponse.json(
          {
            ok: false,
            error: !r.parsed.success ? r.parsed.error : "Invalid JSON from model",
            rawSnippet: r.raw.slice(0, 500),
          },
          { status: 422 },
        );
      }
      const sem2 = computeSem(r.parsed.data);
      if (sem2.length > 0) {
        return NextResponse.json(
          { ok: false, error: "AI generated an invalid exercise. Please try again." },
          { status: 422 },
        );
      }
      return NextResponse.json({ ok: true, data: r.parsed.data });
    }

    if (exerciseType === "generative") {
    const rawStage = (body as { generativeStage?: unknown }).generativeStage;
      const generativeStage: GenerativeStage | null =
        rawStage === "edit" || rawStage === "hint" || rawStage === "independent"
          ? rawStage
          : null;
      if (!generativeStage) {
        return NextResponse.json(
          {
            ok: false,
            error: 'generativeStage is required for generative exercises ("edit" | "hint" | "independent")',
          },
          { status: 400 },
        );
      }
      const isGeoGen = isGeopoliticsAnalyticalDomain(effectiveDomain);
      const rawVariant = (body as { generativeVariant?: unknown }).generativeVariant;
      const generativeVariant: GenerativeVariant =
        rawVariant === "reframing" || rawVariant === "inversion" || rawVariant === "argue_debate"
          ? rawVariant
          : "argue_debate";
      const regional = getGeopoliticsRegionalAppendix(effectiveDomain);
      const adaptParts = [
        buildAdaptationAppendix(adaptiveHints, "generative"),
        regional,
      ].filter((s): s is string => Boolean(s?.trim()));
      const adaptationAppendix = adaptParts.join("\n\n");
      const genPromptInput = {
        domain: effectiveDomain,
        userContext,
        generativeStage,
        adaptationAppendix,
        customScenario: scenarioForPrompt,
      };
      const basePrompt = isGeoGen
        ? buildGeopoliticsGenerativePrompt(genPromptInput)
        : generativeVariant === "reframing"
          ? buildReframingGenerativePrompt(genPromptInput)
          : generativeVariant === "inversion"
            ? buildInversionGenerativePrompt(genPromptInput)
            : buildGenerativeGenerationPrompt(genPromptInput);
      const runGen = async (prompt: string) => {
        const raw = await generateAnalyticalExerciseRaw(prompt, "thinking");
        const parsed = parseGenerativeExerciseJson(raw);
        if (!parsed.success) {
          return { ok: false as const, raw, parsed, sem: [] as string[] };
        }
        const sem = [
          ...validateGenerativeSemantics(parsed.data, generativeStage),
          ...(isGeoGen ? validateGeopoliticsGenerativeSemantics(parsed.data) : []),
          ...(!isGeoGen && generativeVariant === "reframing"
            ? validateReframingGenerativeSemantics(parsed.data)
            : []),
          ...(!isGeoGen && generativeVariant === "inversion"
            ? validateInversionGenerativeSemantics(parsed.data)
            : []),
        ];
        return { ok: true as const, raw, parsed, sem };
      };
      let r = await runGen(basePrompt);
      if (!r.ok || r.sem.length > 0) {
        const reason = !r.ok
          ? `Invalid JSON from model: ${!r.parsed.success ? r.parsed.error : ""}`
          : `Semantic validation failed:\n${r.sem.join("\n")}`;
        const suffix = isGeoGen
          ? GEOPOLITICS_GENERATIVE_RETRY_SUFFIX
          : generativeVariant === "reframing"
            ? REFRAMING_GENERATIVE_RETRY_SUFFIX
            : generativeVariant === "inversion"
              ? INVERSION_GENERATIVE_RETRY_SUFFIX
              : GENERATIVE_RETRY_SUFFIX;
        r = await runGen(`${basePrompt}\n${suffix}\n${reason}`);
      }
      if (!r.ok || !r.parsed.success) {
        return NextResponse.json(
          {
            ok: false,
            error: !r.parsed.success ? r.parsed.error : "Invalid JSON from model",
            rawSnippet: r.raw.slice(0, 500),
          },
          { status: 422 },
        );
      }
      const sem2 = [
        ...validateGenerativeSemantics(r.parsed.data, generativeStage),
        ...(isGeoGen ? validateGeopoliticsGenerativeSemantics(r.parsed.data) : []),
        ...(!isGeoGen && generativeVariant === "reframing"
          ? validateReframingGenerativeSemantics(r.parsed.data)
          : []),
        ...(!isGeoGen && generativeVariant === "inversion"
          ? validateInversionGenerativeSemantics(r.parsed.data)
          : []),
      ];
      if (sem2.length > 0) {
        return NextResponse.json(
          { ok: false, error: "AI generated an invalid exercise. Please try again." },
          { status: 422 },
        );
      }
      return NextResponse.json({ ok: true, data: r.parsed.data });
    }

    const appendixFor = (t: AdaptiveExerciseType) =>
      buildAdaptationAppendix(adaptiveHints, t);
    const useSteelman =
      exerciseType === "analytical" && analyticalVariant === "steelman" && mode !== "real_data";
    const basePrompt =
      exerciseType === "sequential"
        ? buildSequentialGenerationPrompt({
            domain: effectiveDomain,
            userContext,
            adaptationAppendix: appendixFor("sequential"),
            customScenario: scenarioForPrompt,
          })
        : exerciseType === "systems"
          ? isGeopoliticsAnalyticalDomain(effectiveDomain)
            ? buildGeopoliticsSystemsPrompt({
                domain: effectiveDomain,
                userContext,
                adaptationAppendix: appendixFor("systems"),
                customScenario: scenarioForPrompt,
              })
            : buildSystemsGenerationPrompt({
                domain: effectiveDomain,
                userContext,
                adaptationAppendix: appendixFor("systems"),
                customScenario: scenarioForPrompt,
              })
          : (() => {
              if (useSteelman) {
                return buildAnalyticalSteelmanPrompt({
                  domain: effectiveDomain,
                  userContext,
                  adaptationAppendix: appendixFor("analytical"),
                  customScenario: scenarioForPrompt,
                });
              }
              const useGeopoliticsAnalytical =
                exerciseType === "analytical" &&
                (mode === "generated" || mode === "custom_scenario") &&
                isGeopoliticsAnalyticalDomain(effectiveDomain);
              if (useGeopoliticsAnalytical) {
                return buildGeopoliticsAnalyticalPrompt({
                  domain: effectiveDomain,
                  userContext,
                  adaptationAppendix: appendixFor("analytical"),
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
                    adaptationAppendix: appendixFor("analytical"),
                    customScenario: scenarioForPrompt,
                  })
                : buildAnalyticalGenerationPrompt({
                    domain: effectiveDomain,
                    userContext,
                    adaptationAppendix: appendixFor("analytical"),
                    customScenario: scenarioForPrompt,
                  });
              return base;
            })();

    if (exerciseType === "systems") {
      const runSystems = async (prompt: string) => {
        const raw = await generateAnalyticalExerciseRaw(prompt, "thinking");
        const parsed = parseSystemsExerciseJson(raw);
        if (!parsed.success) {
          return { ok: false as const, raw, parsed, sem: [] as string[] };
        }
        const sem = [
          ...validateSystemsExerciseSemantics(parsed.data),
          ...(isGeopoliticsSystemsPayload(parsed.data)
            ? validateGeopoliticsSystemsSemantics(parsed.data)
            : []),
        ];
        return { ok: true as const, raw, parsed, sem };
      };

      let r = await runSystems(basePrompt);
      if (!r.ok || r.sem.length > 0) {
        const reason = !r.ok
          ? `Invalid JSON from model: ${!r.parsed.success ? r.parsed.error : ""}`
          : `Semantic validation failed:\n${r.sem.join("\n")}`;
        const suffix = isGeopoliticsAnalyticalDomain(effectiveDomain)
          ? GEOPOLITICS_SYSTEMS_RETRY_SUFFIX
          : SYSTEMS_RETRY_SUFFIX;
        r = await runSystems(`${basePrompt}\n${suffix}\n${reason}`);
      }
      if (!r.ok || !r.parsed.success) {
        return NextResponse.json(
          {
            ok: false,
            error: !r.parsed.success ? r.parsed.error : "Invalid JSON from model",
            rawSnippet: r.raw.slice(0, 500),
          },
          { status: 422 },
        );
      }
      const sem2 = [
        ...validateSystemsExerciseSemantics(r.parsed.data),
        ...(isGeopoliticsSystemsPayload(r.parsed.data)
          ? validateGeopoliticsSystemsSemantics(r.parsed.data)
          : []),
      ];
      if (sem2.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "AI generated an invalid exercise. Please try again.",
          },
          { status: 422 },
        );
      }
      return NextResponse.json({ ok: true, data: r.parsed.data });
    }

    if (exerciseType === "sequential") {
      const raw = await generateAnalyticalExerciseRaw(basePrompt, "thinking");
      const parsed = parseSequentialExerciseJson(raw);
      if (!parsed.success) {
        return NextResponse.json(
          {
            ok: false,
            error: parsed.error,
            rawSnippet: raw.slice(0, 500),
          },
          { status: 422 },
        );
      }
      return NextResponse.json({ ok: true, data: parsed.data });
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
      const runRealData = async (prompt: string) => {
        const rawFromText = await generateAnalyticalExerciseRaw(prompt, "thinking");
        const parsedFromText = parseAnalyticalExerciseJson(rawFromText);
        if (!parsedFromText.success) {
          return { ok: false as const, raw: rawFromText, parsed: parsedFromText, sem: [] as string[] };
        }
        const repaired = repairAnalyticalSegments(parsedFromText.data);
        const sem = isGeoReal ? validateGeopoliticsAnalyticalSemantics(repaired) : [];
        return { ok: true as const, raw: rawFromText, parsed: { success: true as const, data: repaired }, sem };
      };
      const fromTextPrompt = isGeoReal
        ? buildGeopoliticsFromUserTextPrompt({
            domain: effectiveDomain,
            userContext,
            userText: sanitized,
            adaptationAppendix: appendixFor("analytical"),
          })
        : buildAnalyticalFromUserTextPrompt({
            domain: effectiveDomain,
            userContext,
            userText: sanitized,
            adaptationAppendix: appendixFor("analytical"),
          });
      let rReal = await runRealData(fromTextPrompt);
      if (!rReal.ok || rReal.sem.length > 0) {
        const reason = !rReal.ok
          ? `Invalid JSON from model: ${!rReal.parsed.success ? rReal.parsed.error : ""}`
          : `Semantic validation failed:\n${rReal.sem.join("\n")}`;
        const suffix = isGeoReal
          ? GEOPOLITICS_ANALYTICAL_RETRY_SUFFIX
          : "";
        rReal = await runRealData(
          suffix ? `${fromTextPrompt}\n${suffix}\n${reason}` : `${fromTextPrompt}\n${reason}`,
        );
      }
      if (!rReal.ok || !rReal.parsed.success) {
        return NextResponse.json(
          {
            ok: false,
            error: !rReal.parsed.success ? rReal.parsed.error : "Invalid JSON from model",
            rawSnippet: rReal.raw.slice(0, 500),
          },
          { status: 422 },
        );
      }
      const semReal2 = isGeoReal
        ? validateGeopoliticsAnalyticalSemantics(rReal.parsed.data)
        : [];
      if (semReal2.length > 0) {
        return NextResponse.json(
          { ok: false, error: "AI could not analyze the pasted text. Please try again." },
          { status: 422 },
        );
      }
      const data = { ...rReal.parsed.data, passage: sanitized };
      return NextResponse.json({ ok: true, data });
    }

    const runAnalyticalGenerated = async (prompt: string) => {
      const rawOut = await generateAnalyticalExerciseRaw(prompt, "thinking");
      const parsedOut = parseAnalyticalExerciseJson(rawOut);
      if (!parsedOut.success) {
        return { ok: false as const, raw: rawOut, parsed: parsedOut, sem: [] as string[] };
      }
      const repaired = repairAnalyticalSegments(parsedOut.data);
      const sem = useSteelman
        ? validateAnalyticalSteelmanSemantics(repaired)
        : validateGeopoliticsAnalyticalSemantics(repaired);
      return { ok: true as const, raw: rawOut, parsed: { success: true as const, data: repaired }, sem };
    };

    let r = await runAnalyticalGenerated(basePrompt);
    if (!r.ok || r.sem.length > 0) {
      const reason = !r.ok
        ? `Invalid JSON from model: ${!r.parsed.success ? r.parsed.error : ""}`
        : `Semantic validation failed:\n${r.sem.join("\n")}`;
      const suffix = useSteelman
        ? ANALYTICAL_STEELMAN_RETRY_SUFFIX
        : GEOPOLITICS_ANALYTICAL_RETRY_SUFFIX;
      r = await runAnalyticalGenerated(`${basePrompt}\n${suffix}\n${reason}`);
    }
    if (!r.ok || !r.parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: !r.parsed.success ? r.parsed.error : "Invalid JSON from model",
          rawSnippet: r.raw.slice(0, 500),
        },
        { status: 422 },
      );
    }
    const sem2 = useSteelman
      ? validateAnalyticalSteelmanSemantics(r.parsed.data)
      : validateGeopoliticsAnalyticalSemantics(r.parsed.data);
    if (sem2.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI generated an invalid exercise. Please try again.",
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ ok: true, data: r.parsed.data });
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
