import { NextResponse } from "next/server";
import { buildAnalyticalPerspectivePrompt } from "@/lib/ai/prompts/analytical-perspective";
import {
  buildEvaluativeMatrixPerspectivePrompt,
  buildEvaluativeScoringPerspectivePrompt,
} from "@/lib/ai/prompts/evaluative-perspective";
import { buildGenerativePerspectivePrompt } from "@/lib/ai/prompts/generative-perspective";
import { buildSequentialPerspectivePrompt } from "@/lib/ai/prompts/sequential-perspective";
import { buildSystemsShockPerspectivePrompt } from "@/lib/ai/prompts/systems-shock-perspective";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import {
  parseStructuredPerspectiveJson,
  STRUCTURED_PERSPECTIVE_RETRY_SUFFIX,
} from "@/lib/ai/validators/perspective-structured";
import { structuredPerspectiveToMarkdown } from "@/lib/perspective/format-structured";
import type { EmbeddedIssue } from "@/lib/types/exercise";
import type { UserHighlight } from "@/lib/types/exercise";
import type {
  EvaluativeMatrixRow,
  EvaluativeScoringRow,
  GenerativeExerciseRow,
  SequentialCriticalError,
  SequentialStepSpec,
  SystemsIntendedConnection,
  SystemsNodeSpec,
  SystemsShockEvent,
  SystemsUserEdge,
  SystemsNodeImpact,
} from "@/lib/types/exercise";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";

export const maxDuration = 60;

async function generateStructuredPerspective(prompt: string): Promise<{
  structured: AIPerspectiveStructured;
  text: string;
}> {
  const run = async (p: string) => {
    const raw = await generateAnalyticalExerciseRaw(p);
    return parseStructuredPerspectiveJson(raw);
  };
  let parsed = await run(prompt);
  if (!parsed.success) {
    parsed = await run(`${prompt}\n${STRUCTURED_PERSPECTIVE_RETRY_SUFFIX}\nReason: ${parsed.error}`);
  }
  if (!parsed.success) {
    throw new Error(parsed.error);
  }
  const text = structuredPerspectiveToMarkdown(parsed.data);
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
      const { structured, text } = await generateStructuredPerspective(prompt);
      return NextResponse.json({ ok: true, structured, text });
    } catch (e) {
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
      const { structured, text } = await generateStructuredPerspective(prompt);
      return NextResponse.json({ ok: true, structured, text });
    } catch (e) {
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
      const { structured, text } = await generateStructuredPerspective(prompt);
      return NextResponse.json({ ok: true, structured, text });
    } catch (e) {
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
    });
    try {
      const { structured, text } = await generateStructuredPerspective(prompt);
      return NextResponse.json({ ok: true, structured, text });
    } catch (e) {
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
    const prompt = buildSequentialPerspectivePrompt({
      title,
      scenario,
      steps,
      criticalErrors,
      userOrderedStepIds,
      confidenceBefore,
      domain,
      userContext,
    });
    try {
      const { structured, text } = await generateStructuredPerspective(prompt);
      return NextResponse.json({ ok: true, structured, text });
    } catch (e) {
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

  const prompt = buildAnalyticalPerspectivePrompt({
    title,
    passage,
    embeddedIssues,
    validPoints,
    userHighlights,
    confidenceBefore,
    domain,
    userContext,
  });

  try {
    const { structured, text } = await generateStructuredPerspective(prompt);
    return NextResponse.json({ ok: true, structured, text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
