import { NextResponse } from "next/server";
import {
  buildAnalyticalGenerationPrompt,
  buildAnalyticalFromUserTextPrompt,
  buildAnalyticalSoundReasoningPrompt,
} from "@/lib/ai/prompts/analytical";
import { buildEvaluativeGenerationPrompt } from "@/lib/ai/prompts/evaluative";
import { buildGenerativeGenerationPrompt } from "@/lib/ai/prompts/generative";
import { buildSequentialGenerationPrompt } from "@/lib/ai/prompts/sequential";
import { buildSystemsGenerationPrompt } from "@/lib/ai/prompts/systems";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import { parseAnalyticalExerciseJson } from "@/lib/ai/validators/common";
import {
  parseEvaluativeExerciseJson,
  validateEvaluativeSemantics,
  EVALUATIVE_RETRY_SUFFIX,
} from "@/lib/ai/validators/evaluative";
import {
  parseGenerativeExerciseJson,
  validateGenerativeSemantics,
  GENERATIVE_RETRY_SUFFIX,
  type GenerativeStage,
} from "@/lib/ai/validators/generative";
import { parseSequentialExerciseJson } from "@/lib/ai/validators/sequential";
import {
  parseSystemsExerciseJson,
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

export const maxDuration = 60;

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

  const domain = (body as { domain?: unknown }).domain;
  if (typeof domain !== "string" || !domain.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "domain is required and must be a non-empty string",
      },
      { status: 400 },
    );
  }

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
  const analyticalMode =
    rawMode === "real_data" || rawMode === "generated" ? rawMode : "generated";

  const rawHints = (body as { adaptiveHints?: unknown }).adaptiveHints;
  const adaptiveHints = normalizeAdaptiveHints(rawHints);

  try {
    if (exerciseType === "evaluative") {
      const basePrompt = buildEvaluativeGenerationPrompt({
        domain: domain.trim(),
        userContext,
        adaptationAppendix: buildAdaptationAppendix(adaptiveHints, "evaluative"),
      });
      const runEv = async (prompt: string) => {
        const raw = await generateAnalyticalExerciseRaw(prompt);
        const parsed = parseEvaluativeExerciseJson(raw);
        if (!parsed.success) {
          return { ok: false as const, raw, parsed, sem: [] as string[] };
        }
        const sem = validateEvaluativeSemantics(parsed.data);
        return { ok: true as const, raw, parsed, sem };
      };
      let r = await runEv(basePrompt);
      if (!r.ok || r.sem.length > 0) {
        const reason = !r.ok
          ? `Invalid JSON from model: ${!r.parsed.success ? r.parsed.error : ""}`
          : `Semantic validation failed:\n${r.sem.join("\n")}`;
        r = await runEv(`${basePrompt}\n${EVALUATIVE_RETRY_SUFFIX}\n${reason}`);
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
      const sem2 = validateEvaluativeSemantics(r.parsed.data);
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
      const basePrompt = buildGenerativeGenerationPrompt({
        domain: domain.trim(),
        userContext,
        generativeStage,
        adaptationAppendix: buildAdaptationAppendix(adaptiveHints, "generative"),
      });
      const runGen = async (prompt: string) => {
        const raw = await generateAnalyticalExerciseRaw(prompt);
        const parsed = parseGenerativeExerciseJson(raw);
        if (!parsed.success) {
          return { ok: false as const, raw, parsed, sem: [] as string[] };
        }
        const sem = validateGenerativeSemantics(parsed.data, generativeStage);
        return { ok: true as const, raw, parsed, sem };
      };
      let r = await runGen(basePrompt);
      if (!r.ok || r.sem.length > 0) {
        const reason = !r.ok
          ? `Invalid JSON from model: ${!r.parsed.success ? r.parsed.error : ""}`
          : `Semantic validation failed:\n${r.sem.join("\n")}`;
        r = await runGen(`${basePrompt}\n${GENERATIVE_RETRY_SUFFIX}\n${reason}`);
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
      const sem2 = validateGenerativeSemantics(r.parsed.data, generativeStage);
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
    const basePrompt =
      exerciseType === "sequential"
        ? buildSequentialGenerationPrompt({
            domain: domain.trim(),
            userContext,
            adaptationAppendix: appendixFor("sequential"),
          })
        : exerciseType === "systems"
          ? buildSystemsGenerationPrompt({
              domain: domain.trim(),
              userContext,
              adaptationAppendix: appendixFor("systems"),
            })
          : (() => {
              const useSoundReasoning =
                exerciseType === "analytical" &&
                analyticalMode === "generated" &&
                Math.random() < 0.2;
              const base = useSoundReasoning
                ? buildAnalyticalSoundReasoningPrompt({
                    domain: domain.trim(),
                    userContext,
                    adaptationAppendix: appendixFor("analytical"),
                  })
                : buildAnalyticalGenerationPrompt({
                    domain: domain.trim(),
                    userContext,
                    adaptationAppendix: appendixFor("analytical"),
                  });
              return base;
            })();

    if (exerciseType === "systems") {
      const runSystems = async (prompt: string) => {
        const raw = await generateAnalyticalExerciseRaw(prompt);
        const parsed = parseSystemsExerciseJson(raw);
        if (!parsed.success) {
          return { ok: false as const, raw, parsed, sem: [] as string[] };
        }
        const sem = validateSystemsExerciseSemantics(parsed.data);
        return { ok: true as const, raw, parsed, sem };
      };

      let r = await runSystems(basePrompt);
      if (!r.ok || r.sem.length > 0) {
        const reason = !r.ok
          ? `Invalid JSON from model: ${!r.parsed.success ? r.parsed.error : ""}`
          : `Semantic validation failed:\n${r.sem.join("\n")}`;
        r = await runSystems(`${basePrompt}\n${SYSTEMS_RETRY_SUFFIX}\n${reason}`);
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
      const sem2 = validateSystemsExerciseSemantics(r.parsed.data);
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

    const raw = await generateAnalyticalExerciseRaw(basePrompt);
    if (exerciseType === "sequential") {
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
    // Analytical (generated or real_data based on analyticalMode).
    if (analyticalMode === "real_data") {
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
      const fromTextPrompt = buildAnalyticalFromUserTextPrompt({
        domain: domain.trim(),
        userContext,
        userText: sanitized,
        adaptationAppendix: appendixFor("analytical"),
      });
      const rawFromText = await generateAnalyticalExerciseRaw(fromTextPrompt);
      const parsedFromText = parseAnalyticalExerciseJson(rawFromText);
      if (!parsedFromText.success) {
        return NextResponse.json(
          {
            ok: false,
            error: parsedFromText.error,
            rawSnippet: rawFromText.slice(0, 500),
          },
          { status: 422 },
        );
      }
      // Echo back the sanitized user text as passage to keep highlights aligned with real data.
      const data = { ...parsedFromText.data, passage: sanitized };
      return NextResponse.json({ ok: true, data });
    }

    const parsed = parseAnalyticalExerciseJson(raw);
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
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
