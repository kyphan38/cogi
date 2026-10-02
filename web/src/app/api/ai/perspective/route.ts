import { NextResponse } from "next/server";
import { buildAnalyticalPerspectivePrompt } from "@/lib/ai/prompts/analytical-perspective";
import {
  buildEvaluativeMatrixPerspectivePrompt,
  buildEvaluativeScoringPerspectivePrompt,
  buildEvaluativeUncertaintyPerspectivePrompt,
} from "@/lib/ai/prompts/evaluative-perspective";
import { buildSystemsShockPerspectivePrompt } from "@/lib/ai/prompts/systems-shock-perspective";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import type { ClarityPerspectiveKind } from "@/lib/types/perspective";
import {
  ANALYTICAL_COACHING_RETRY_SUFFIX,
  COACHING_RETRY_SUFFIX,
  parseCoachingJson,
  parseAnalyticalCoachingJson,
  parseStructuredPerspectiveJson,
  structuredPerspectiveRetrySuffix,
} from "@/lib/ai/validators/perspective-structured";
import {
  analyticalCoachingToMarkdown,
  structuredPerspectiveToMarkdown,
} from "@/lib/perspective/format-structured";
import { analyticalCoachingRefs, scoreAnalytical } from "@/lib/exercise/analytical-score";
import { scoreSystems, systemsCoachingRefs } from "@/lib/exercise/systems-score";
import { ANALYTICAL_TAG_OPTIONS, GEOPOLITICS_TAG_OPTIONS } from "@/lib/exercise/tag-labels";
import type { EmbeddedIssue } from "@/lib/types/exercise";
import type { UserHighlight } from "@/lib/types/exercise";
import type {
  EvaluativeMatrixRow,
  EvaluativeScoringRow,
  EvaluativeUncertaintyRow,
  SystemsIntendedConnection,
  SystemsNodeCriticalityHint,
  SystemsNodeSpec,
  SystemsShockEvent,
  SystemsUserEdge,
  SystemsNodeImpact,
} from "@/lib/types/exercise";
import type { AIPerspectiveStructured, CoachingStructured } from "@/lib/types/perspective";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { buildLanguageLevelAppendix, resolveLanguageLevel } from "@/lib/adaptive/language-level";

export const maxDuration = 60;

async function generateStructuredPerspective(
  prompt: string,
  kind: ClarityPerspectiveKind,
  languageAppendix?: string,
): Promise<{
  structured: AIPerspectiveStructured;
  text: string;
}> {
  const parse = (raw: string) => parseStructuredPerspectiveJson(raw, kind);
  const retrySuffix = structuredPerspectiveRetrySuffix(kind);

  const fullPrompt = [prompt, languageAppendix].filter(Boolean).join("\n\n");

  const run = async (p: string) => {
    const raw = await generateAnalyticalExerciseRaw(p, "thinking");
    return parse(raw);
  };
  let parsed = await run(fullPrompt);
  if (!parsed.success) {
    parsed = await run(`${fullPrompt}\n${retrySuffix}\nReason: ${parsed.error}`);
  }
  if (!parsed.success) {
    throw new Error(parsed.error);
  }
  const text = structuredPerspectiveToMarkdown(parsed.data, kind);
  return { structured: parsed.data, text };
}

/**
 * Coaching feedback (Systems, Evaluative): generate, check every required ref is
 * covered, retry once with the reason. `heading` turns a ref into a readable line.
 */
async function generateCoaching(
  prompt: string,
  languageAppendix: string | undefined,
  refs: { required: string[]; allowed: string[]; requireMetaNote?: boolean },
  heading: (ref: string) => string,
): Promise<{ structured: CoachingStructured; text: string }> {
  const fullPrompt = [prompt, languageAppendix].filter(Boolean).join("\n\n");
  const parse = (raw: string) =>
    parseCoachingJson(raw, {
      requiredRefs: refs.required,
      allowedRefs: refs.allowed,
      requireMetaNote: refs.requireMetaNote,
    });
  let parsed = parse(await generateAnalyticalExerciseRaw(fullPrompt, "thinking"));
  if (!parsed.success) {
    parsed = parse(
      await generateAnalyticalExerciseRaw(
        `${fullPrompt}\n${COACHING_RETRY_SUFFIX}\nReason: ${parsed.error}`,
        "thinking",
      ),
    );
  }
  if (!parsed.success) throw new Error(parsed.error);
  return { structured: parsed.data, text: analyticalCoachingToMarkdown(parsed.data, heading) };
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
  const languageAppendix = buildLanguageLevelAppendix(resolveLanguageLevel(b));
  const kind =
    b.kind === "systems"
      ? "systems"
      : b.kind === "evaluative-matrix"
        ? "evaluative-matrix"
        : b.kind === "evaluative-scoring"
          ? "evaluative-scoring"
          : b.kind === "evaluative-uncertainty"
            ? "evaluative-uncertainty"
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
        languageAppendix,
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
        languageAppendix,
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
        languageAppendix,
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
    const result = scoreSystems({ nodes, intendedConnections, shockEvent, userEdges, nodeImpact });
    const refs = systemsCoachingRefs(result);
    const prompt = buildSystemsShockPerspectivePrompt({
      title,
      domain,
      scenario,
      nodes,
      intendedConnections,
      shockEvent,
      userEdges,
      nodeImpact,
      result,
      requiredRefs: refs.required,
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
    const needsMeta =
      Boolean(perspectiveAName && perspectiveBName && intendedConnectionsB && shockEventB) ||
      Boolean(variantKind && criticalityGroundTruth && userCriticalityRanking && secondShockEvent);
    const nodeLabel = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
    try {
      const { structured, text } = await generateCoaching(
        prompt,
        languageAppendix,
        { ...refs, requireMetaNote: needsMeta },
        (ref) => {
          if (ref.startsWith("node_")) return `Node: ${nodeLabel(ref.slice(5))}`;
          const [kind, n] = ref.split("_");
          const i = Number(n) - 1;
          if (kind === "conn") {
            const c = intendedConnections[i];
            return c ? `Connection: ${nodeLabel(c.from)} -> ${nodeLabel(c.to)}` : ref;
          }
          const e = userEdges.find((x) => x.id === result.extraEdgeIds[i]);
          return e ? `Your connection: ${nodeLabel(e.source)} -> ${nodeLabel(e.target)}` : ref;
        },
      );
      return NextResponse.json({ ok: true, structured, text, result });
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

  const result = scoreAnalytical({ passage, embeddedIssues, validPoints, highlights: userHighlights });
  const refs = analyticalCoachingRefs(result, userHighlights);
  const isGeo = Boolean(hiddenPerspective?.trim());
  const prompt = buildAnalyticalPerspectivePrompt({
    title,
    passage,
    embeddedIssues,
    validPoints,
    userHighlights,
    result,
    requiredRefs: refs.required,
    confidenceBefore,
    domain,
    userContext,
    tagOptions: isGeo ? GEOPOLITICS_TAG_OPTIONS : ANALYTICAL_TAG_OPTIONS,
    hiddenPerspective,
    missingActors,
    userPerspectiveGuess,
    userMissingActorsGuess,
    metaGuessScore,
  });
  const fullPrompt = [prompt, languageAppendix].filter(Boolean).join("\n\n");
  const parse = (raw: string) =>
    parseAnalyticalCoachingJson(raw, {
      requiredRefs: refs.required,
      allowedRefs: refs.allowed,
      requireMetaNote: isGeo,
    });

  try {
    let parsed = parse(await generateAnalyticalExerciseRaw(fullPrompt, "thinking"));
    if (!parsed.success) {
      parsed = parse(
        await generateAnalyticalExerciseRaw(
          `${fullPrompt}\n${ANALYTICAL_COACHING_RETRY_SUFFIX}\nReason: ${parsed.error}`,
          "thinking",
        ),
      );
    }
    if (!parsed.success) throw new Error(parsed.error);
    const byId = new Map(userHighlights.map((h) => [h.id, h]));
    const text = analyticalCoachingToMarkdown(parsed.data, (ref) => {
      const [kind, n] = ref.split("_");
      const i = Number(n) - 1;
      if (kind === "issue") return `Issue: "${embeddedIssues[i]?.textSegment ?? ref}"`;
      if (kind === "decoy") return `Sound statement: "${validPoints[i]?.textSegment ?? ref}"`;
      const h = byId.get(result.extraHighlightIds[i] ?? "");
      return `Your highlight: "${h?.text ?? ref}"`;
    });
    return NextResponse.json({ ok: true, structured: parsed.data, text, result });
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
