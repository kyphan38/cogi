import { NextResponse } from "next/server";
import {
  buildAnalyticalPerspectivePrompt,
  buildAnalyticalSteelmanPerspectivePrompt,
} from "@/lib/ai/prompts/analytical-perspective";
import {
  buildEvaluativeMatrixPerspectivePrompt,
  buildEvaluativeScoringPerspectivePrompt,
  buildEvaluativeUncertaintyPerspectivePrompt,
} from "@/lib/ai/prompts/evaluative-perspective";
import { buildGenerativePerspectivePrompt } from "@/lib/ai/prompts/generative-perspective";
import { buildSequentialPerspectivePrompt } from "@/lib/ai/prompts/sequential-perspective";
import { buildSystemsShockPerspectivePrompt } from "@/lib/ai/prompts/systems-shock-perspective";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import type { ClarityPerspectiveKind } from "@/lib/types/perspective";
import {
  parseLegacyPerspectiveJson,
  parseStructuredPerspectiveJson,
  structuredPerspectiveRetrySuffix,
} from "@/lib/ai/validators/perspective-structured";
import { structuredPerspectiveToMarkdown } from "@/lib/perspective/format-structured";
import type { EmbeddedIssue } from "@/lib/types/exercise";
import type { UserHighlight } from "@/lib/types/exercise";
import type {
  EvaluativeMatrixRow,
  EvaluativeScoringRow,
  EvaluativeUncertaintyRow,
  GenerativeExerciseRow,
  SequentialCriticalError,
  SequentialStepSpec,
  SystemsIntendedConnection,
  SystemsNodeCriticalityHint,
  SystemsNodeSpec,
  SystemsShockEvent,
  SystemsUserEdge,
  SystemsNodeImpact,
} from "@/lib/types/exercise";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";

export const maxDuration = 60;

type PerspectiveRouteKind = ClarityPerspectiveKind | "sequential";

async function generateStructuredPerspective(
  prompt: string,
  kind: PerspectiveRouteKind,
): Promise<{
  structured: AIPerspectiveStructured;
  text: string;
}> {
  const parse =
    kind === "sequential"
      ? (raw: string) => parseLegacyPerspectiveJson(raw)
      : (raw: string) => parseStructuredPerspectiveJson(raw, kind);

  const retrySuffix =
    kind === "sequential"
      ? `Your previous answer was not valid JSON. Return ONLY a single JSON object with keys: embedded, userFound, additional, openQuestions.`
      : structuredPerspectiveRetrySuffix(kind);

  const run = async (p: string) => {
    const raw = await generateAnalyticalExerciseRaw(p, "thinking");
    return parse(raw);
  };
  let parsed = await run(prompt);
  if (!parsed.success) {
    parsed = await run(`${prompt}\n${retrySuffix}\nReason: ${parsed.error}`);
  }
  if (!parsed.success) {
    throw new Error(parsed.error);
  }
  const clarityKind: ClarityPerspectiveKind =
    kind === "sequential" ? "analytical" : kind;
  const text = structuredPerspectiveToMarkdown(parsed.data, clarityKind);
  return { structured: parsed.data, text };
}

/** POST JSON: perspective narrative after user work + confidence (Phase 1.4 / Phase 2.2 / Phase 3). */
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
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Body must be object" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const kind =
    b.kind === "systems"
      ? "systems"
      : b.kind === "sequential"
        ? "sequential"
        : b.kind === "evaluative-matrix"
          ? "evaluative-matrix"
          : b.kind === "evaluative-scoring"
            ? "evaluative-scoring"
            : b.kind === "evaluative-uncertainty"
              ? "evaluative-uncertainty"
              : b.kind === "generative"
                ? "generative"
                : "analytical";

  if (kind === "evaluative-matrix") {
    const title = typeof b.title === "string" ? b.title : "";
    const domain = typeof b.domain === "string" ? b.domain : "";
    const confidenceBefore =
      typeof b.confidenceBefore === "number" ? b.confidenceBefore : NaN;
    const exercise = b.exercise as EvaluativeMatrixRow | undefined;
    if (
      !title.trim() ||
      !domain.trim() ||
      !Number.isFinite(confidenceBefore) ||
      !exercise ||
      exercise.type !== "evaluative" ||
      exercise.variant !== "matrix"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "evaluative-matrix requires title, domain, confidenceBefore, exercise matrix row",
        },
        { status: 400 },
      );
    }
    const userContext =
      typeof b.userContext === "string" && b.userContext.trim()
        ? b.userContext.trim()
        : undefined;
    const prompt = buildEvaluativeMatrixPerspectivePrompt({
      title,
      domain,
      scenario: exercise.scenario,
      exercise,
      confidenceBefore,
      userContext,
    });
    try {
      const { structured, text } = await generateStructuredPerspective(
        prompt,
        "evaluative-matrix",
      );
      return NextResponse.json({ ok: true, structured, text });
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

  if (kind === "evaluative-scoring") {
    const title = typeof b.title === "string" ? b.title : "";
    const domain = typeof b.domain === "string" ? b.domain : "";
    const confidenceBefore =
      typeof b.confidenceBefore === "number" ? b.confidenceBefore : NaN;
    const exercise = b.exercise as EvaluativeScoringRow | undefined;
    if (
      !title.trim() ||
      !domain.trim() ||
      !Number.isFinite(confidenceBefore) ||
      !exercise ||
      exercise.type !== "evaluative" ||
      exercise.variant !== "scoring"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "evaluative-scoring requires title, domain, confidenceBefore, exercise scoring row",
        },
        { status: 400 },
      );
    }
    const userContext =
      typeof b.userContext === "string" && b.userContext.trim()
        ? b.userContext.trim()
        : undefined;
    const prompt = buildEvaluativeScoringPerspectivePrompt({
      title,
      domain,
      exercise,
      confidenceBefore,
      userContext,
    });
    try {
      const { structured, text } = await generateStructuredPerspective(
        prompt,
        "evaluative-scoring",
      );
      return NextResponse.json({ ok: true, structured, text });
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

  if (kind === "evaluative-uncertainty") {
    const title = typeof b.title === "string" ? b.title : "";
    const domain = typeof b.domain === "string" ? b.domain : "";
    const confidenceBefore =
      typeof b.confidenceBefore === "number" ? b.confidenceBefore : NaN;
    const exercise = b.exercise as EvaluativeUncertaintyRow | undefined;
    if (
      !title.trim() ||
      !domain.trim() ||
      !Number.isFinite(confidenceBefore) ||
      !exercise ||
      exercise.type !== "evaluative" ||
      exercise.variant !== "uncertainty"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "evaluative-uncertainty requires title, domain, confidenceBefore, exercise uncertainty row",
        },
        { status: 400 },
      );
    }
    const userContext =
      typeof b.userContext === "string" && b.userContext.trim()
        ? b.userContext.trim()
        : undefined;
    const prompt = buildEvaluativeUncertaintyPerspectivePrompt({
      title,
      domain,
      exercise,
      confidenceBefore,
      userContext,
    });
    try {
      const { structured, text } = await generateStructuredPerspective(
        prompt,
        "evaluative-uncertainty",
      );
      return NextResponse.json({ ok: true, structured, text });
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

  if (kind === "generative") {
    const exercise = b.exercise as GenerativeExerciseRow | undefined;
    const confidenceBefore =
      typeof b.confidenceBefore === "number" ? b.confidenceBefore : NaN;
    if (!exercise || exercise.type !== "generative" || !Number.isFinite(confidenceBefore)) {
      return NextResponse.json(
        {
          ok: false,
          error: "generative requires exercise row and confidenceBefore",
        },
        { status: 400 },
      );
    }
    const userContext =
      typeof b.userContext === "string" && b.userContext.trim()
        ? b.userContext.trim()
        : undefined;
    const prompt = buildGenerativePerspectivePrompt({
      exercise,
      confidenceBefore,
      userContext,
    });
    try {
      const { structured, text } = await generateStructuredPerspective(prompt, "generative");
      return NextResponse.json({ ok: true, structured, text });
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

  if (kind === "systems") {
    const title = typeof b.title === "string" ? b.title : "";
    const scenario = typeof b.scenario === "string" ? b.scenario : "";
    const domain = typeof b.domain === "string" ? b.domain : "";
    const confidenceBefore =
      typeof b.confidenceBefore === "number" ? b.confidenceBefore : NaN;
    const nodes = Array.isArray(b.nodes) ? (b.nodes as SystemsNodeSpec[]) : [];
    const intendedConnections = Array.isArray(b.intendedConnections)
      ? (b.intendedConnections as SystemsIntendedConnection[])
      : [];
    const shockEvent =
      b.shockEvent && typeof b.shockEvent === "object"
        ? (b.shockEvent as SystemsShockEvent)
        : null;
    const userEdges = Array.isArray(b.userEdges) ? (b.userEdges as SystemsUserEdge[]) : [];
    const nodeImpact =
      b.nodeImpact && typeof b.nodeImpact === "object"
        ? (b.nodeImpact as Record<string, SystemsNodeImpact>)
        : {};
    const userProposedComponentsRaw = b.userProposedComponents;
    const userProposedComponents = Array.isArray(userProposedComponentsRaw)
      ? (userProposedComponentsRaw as unknown[])
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;
    if (
      !title.trim() ||
      !scenario.trim() ||
      !domain.trim() ||
      !Number.isFinite(confidenceBefore) ||
      nodes.length < 1 ||
      !shockEvent
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Systems perspective requires title, scenario, domain, confidenceBefore, nodes[], intendedConnections[], shockEvent, userEdges[], nodeImpact",
        },
        { status: 400 },
      );
    }
    const userContext =
      typeof b.userContext === "string" && b.userContext.trim()
        ? b.userContext.trim()
        : undefined;
    const perspectiveAName =
      typeof b.perspectiveAName === "string" ? b.perspectiveAName : undefined;
    const perspectiveBName =
      typeof b.perspectiveBName === "string" ? b.perspectiveBName : undefined;
    const intendedConnectionsB = Array.isArray(b.intendedConnectionsB)
      ? (b.intendedConnectionsB as SystemsIntendedConnection[])
      : undefined;
    const shockEventB =
      b.shockEventB && typeof b.shockEventB === "object"
        ? (b.shockEventB as {
            directlyAffected: string[];
            indirectlyAffected: string[];
            explanation: string;
          })
        : undefined;
    const userPerspectiveBNotes =
      typeof b.userPerspectiveBNotes === "string"
        ? b.userPerspectiveBNotes
        : undefined;
    const variantKind = b.variantKind === "resilience" ? "resilience" : undefined;
    const criticalityGroundTruth = Array.isArray(b.criticalityGroundTruth)
      ? (b.criticalityGroundTruth as SystemsNodeCriticalityHint[])
      : undefined;
    const userCriticalityRanking =
      b.userCriticalityRanking && typeof b.userCriticalityRanking === "object"
        ? (b.userCriticalityRanking as Record<string, number>)
        : undefined;
    const secondShockEvent =
      b.secondShockEvent && typeof b.secondShockEvent === "object"
        ? (b.secondShockEvent as SystemsShockEvent)
        : undefined;
    const prompt = buildSystemsShockPerspectivePrompt({
      title,
      domain,
      scenario,
      nodes,
      intendedConnections,
      shockEvent,
      userEdges,
      nodeImpact,
      userProposedComponents,
      confidenceBefore,
      userContext,
      perspectiveAName,
      perspectiveBName,
      intendedConnectionsB,
      shockEventB,
      userPerspectiveBNotes,
      variantKind,
      criticalityGroundTruth,
      userCriticalityRanking,
      secondShockEvent,
    });
    try {
      const { structured, text } = await generateStructuredPerspective(prompt, "systems");
      return NextResponse.json({ ok: true, structured, text });
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

  if (kind === "sequential") {
    const title = typeof b.title === "string" ? b.title : "";
    const scenario = typeof b.scenario === "string" ? b.scenario : "";
    const domain = typeof b.domain === "string" ? b.domain : "";
    const confidenceBefore =
      typeof b.confidenceBefore === "number" ? b.confidenceBefore : NaN;
    const steps = Array.isArray(b.steps) ? (b.steps as SequentialStepSpec[]) : [];
    const criticalErrors = Array.isArray(b.criticalErrors)
      ? (b.criticalErrors as SequentialCriticalError[])
      : [];
    const userOrderedStepIds = Array.isArray(b.userOrderedStepIds)
      ? (b.userOrderedStepIds as string[])
      : [];
    if (
      !title.trim() ||
      !scenario.trim() ||
      !domain.trim() ||
      !Number.isFinite(confidenceBefore) ||
      steps.length < 1 ||
      userOrderedStepIds.length < 1
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Sequential perspective requires title, scenario, domain, confidenceBefore, steps[], userOrderedStepIds[]",
        },
        { status: 400 },
      );
    }
    const userContext =
      typeof b.userContext === "string" && b.userContext.trim()
        ? b.userContext.trim()
        : undefined;
    const perspectiveAName =
      typeof b.perspectiveAName === "string" ? b.perspectiveAName : undefined;
    const perspectiveBName =
      typeof b.perspectiveBName === "string" ? b.perspectiveBName : undefined;
    const userOrderedStepIdsB = Array.isArray(b.userOrderedStepIdsB)
      ? (b.userOrderedStepIdsB as string[])
      : undefined;
    const criticalErrorsB = Array.isArray(b.criticalErrorsB)
      ? (b.criticalErrorsB as SequentialCriticalError[])
      : undefined;
    const timeLimitMinutes =
      typeof b.timeLimitMinutes === "number" ? b.timeLimitMinutes : undefined;
    const elapsedSeconds =
      typeof b.elapsedSeconds === "number" ? b.elapsedSeconds : undefined;
    const prompt = buildSequentialPerspectivePrompt({
      title,
      scenario,
      steps,
      criticalErrors,
      userOrderedStepIds,
      confidenceBefore,
      domain,
      userContext,
      perspectiveAName,
      perspectiveBName,
      userOrderedStepIdsB,
      criticalErrorsB,
      timeLimitMinutes,
      elapsedSeconds,
    });
    try {
      const { structured, text } = await generateStructuredPerspective(prompt, "sequential");
      return NextResponse.json({ ok: true, structured, text });
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

  if (kind === "analytical" && b.analyticalVariant === "steelman") {
    const title = typeof b.title === "string" ? b.title : "";
    const passage = typeof b.passage === "string" ? b.passage : "";
    const steelmanText = typeof b.steelmanText === "string" ? b.steelmanText : "";
    const domain = typeof b.domain === "string" ? b.domain : "";
    const confidenceBefore =
      typeof b.confidenceBefore === "number" ? b.confidenceBefore : NaN;
    if (
      !title.trim() ||
      !passage.trim() ||
      !steelmanText.trim() ||
      !domain.trim() ||
      !Number.isFinite(confidenceBefore)
    ) {
      return NextResponse.json(
        { ok: false, error: "title, passage, steelmanText, domain, confidenceBefore required" },
        { status: 400 },
      );
    }
    const userContext =
      typeof b.userContext === "string" && b.userContext.trim()
        ? b.userContext.trim()
        : undefined;
    const prompt = buildAnalyticalSteelmanPerspectivePrompt({
      title,
      passage,
      steelmanText,
      confidenceBefore,
      domain,
      userContext,
    });
    try {
      const { structured, text } = await generateStructuredPerspective(prompt, "analytical");
      return NextResponse.json({ ok: true, structured, text });
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

  const passage = typeof b.passage === "string" ? b.passage : "";
  const title = typeof b.title === "string" ? b.title : "";
  const domain = typeof b.domain === "string" ? b.domain : "";
  const confidenceBefore =
    typeof b.confidenceBefore === "number" ? b.confidenceBefore : NaN;
  if (!passage.trim() || !title.trim() || !domain.trim() || !Number.isFinite(confidenceBefore)) {
    return NextResponse.json(
      { ok: false, error: "passage, title, domain, confidenceBefore required" },
      { status: 400 },
    );
  }
  const userContext =
    typeof b.userContext === "string" && b.userContext.trim()
      ? b.userContext.trim()
      : undefined;
  const embeddedIssues = Array.isArray(b.embeddedIssues)
    ? (b.embeddedIssues as EmbeddedIssue[])
    : [];
  const validPoints = Array.isArray(b.validPoints)
    ? (b.validPoints as { textSegment: string; explanation: string }[])
    : [];
  const userHighlights = Array.isArray(b.userHighlights)
    ? (b.userHighlights as UserHighlight[])
    : [];

  const hiddenPerspective =
    typeof b.hiddenPerspective === "string" ? b.hiddenPerspective : undefined;
  const missingActors = Array.isArray(b.missingActors)
    ? (b.missingActors as string[])
    : undefined;
  const userPerspectiveGuess =
    typeof b.userPerspectiveGuess === "string" ? b.userPerspectiveGuess : undefined;
  const userMissingActorsGuess = Array.isArray(b.userMissingActorsGuess)
    ? (b.userMissingActorsGuess as string[])
    : undefined;
  const metaGuessScore =
    typeof b.metaGuessScore === "number" ? b.metaGuessScore : undefined;

  const prompt = buildAnalyticalPerspectivePrompt({
    title,
    passage,
    embeddedIssues,
    validPoints,
    userHighlights,
    confidenceBefore,
    domain,
    userContext,
    hiddenPerspective,
    missingActors,
    userPerspectiveGuess,
    userMissingActorsGuess,
    metaGuessScore,
  });

  try {
    const { structured, text } = await generateStructuredPerspective(prompt, "analytical");
    return NextResponse.json({ ok: true, structured, text });
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
