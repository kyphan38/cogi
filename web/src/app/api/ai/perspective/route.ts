import { NextResponse } from "next/server";
import { buildAnalyticalPerspectivePrompt } from "@/lib/ai/prompts/analytical-perspective";
import {
  buildEvaluativeMatrixPerspectivePrompt,
  buildEvaluativeScoringPerspectivePrompt,
  buildEvaluativeUncertaintyPerspectivePrompt,
} from "@/lib/ai/prompts/evaluative-perspective";
import { buildSystemsShockPerspectivePrompt } from "@/lib/ai/prompts/systems-shock-perspective";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import {
  ANALYTICAL_COACHING_RETRY_SUFFIX,
  COACHING_RETRY_SUFFIX,
  parseCoachingJson,
  parseAnalyticalCoachingJson,
} from "@/lib/ai/validators/perspective-structured";
import { analyticalCoachingToMarkdown } from "@/lib/perspective/format-structured";
import { analyticalCoachingRefs, scoreAnalytical } from "@/lib/exercise/analytical-score";
import { scoreSystems, systemsCoachingRefs } from "@/lib/exercise/systems-score";
import {
  evaluativeCoachingRefs,
  scoreEvaluative,
  type EvaluativeResult,
  type MatrixResult,
  type ScoringResult,
  type UncertaintyResult,
} from "@/lib/exercise/evaluative-score";
import type {
  EvaluativeExerciseRow,
  JudgmentExerciseRow,
  CalibrationExerciseRow,
  ReframeExerciseRow,
  StrategyExerciseRow,
} from "@/lib/types/exercise";
import { calibrationCoachingRefs, scoreCalibration } from "@/lib/exercise/calibration-score";
import { CALIBRATION_LEVELS } from "@/lib/exercise/calibration-levels";
import { buildCalibrationPerspectivePrompt } from "@/lib/ai/prompts/calibration-perspective";
import { reframeCoachingRefs, scoreReframe } from "@/lib/exercise/reframe-score";
import { pickTrapCards } from "@/lib/exercise/reframe-trap-cards";
import { pickIssueCards } from "@/lib/exercise/analytical-issue-cards";
import { pickLensCards } from "@/lib/exercise/judgment-lens-cards";
import { pickSystemsCards, systemsCriticality } from "@/lib/exercise/systems-idea-cards";
import { pickEvaluativeCards } from "@/lib/exercise/evaluative-idea-cards";
import { pickStrategyCards } from "@/lib/exercise/strategy-idea-cards";
import { sanitizeTrapCards } from "@/lib/exercise/take-with-you";
import { REFRAME_LEVELS } from "@/lib/exercise/reframe-levels";
import { buildReframePerspectivePrompt } from "@/lib/ai/prompts/reframe-perspective";
import { scoreStrategy, strategyCoachingRefs } from "@/lib/exercise/strategy-score";
import { buildStrategyPerspectivePrompt } from "@/lib/ai/prompts/strategy-perspective";
import { judgmentCoachingRefs, scoreJudgment } from "@/lib/exercise/judgment-score";
import { JUDGMENT_LEVELS, LENS_INFO } from "@/lib/exercise/judgment-levels";
import { buildJudgmentPerspectivePrompt } from "@/lib/ai/prompts/judgment-perspective";
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
import type { CoachingStructured } from "@/lib/types/perspective";
import type { GeoGuessResult } from "@/lib/exercise/geo-guess";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { buildLanguageLevelAppendix, resolveLanguageLevel } from "@/lib/adaptive/language-level";

export const maxDuration = 60;

/**
 * Coaching feedback (Systems, Evaluative): generate, check every required ref is
 * covered, retry once with the reason. `heading` turns a ref into a readable line.
 */
async function generateCoaching(
  prompt: string,
  languageAppendix: string | undefined,
  refs: { required: string[]; allowed: string[]; requireMetaNote?: boolean; takeawaysOptional?: boolean },
  heading: (ref: string) => string,
  /** A reason to retry once when the reply parses but is incomplete; the second reply is kept. */
  retryIf?: (data: CoachingStructured) => string | null,
): Promise<{ structured: CoachingStructured; text: string }> {
  const fullPrompt = [prompt, languageAppendix].filter(Boolean).join("\n\n");
  const parse = (raw: string) =>
    parseCoachingJson(raw, {
      requiredRefs: refs.required,
      allowedRefs: refs.allowed,
      requireMetaNote: refs.requireMetaNote,
      takeawaysOptional: refs.takeawaysOptional,
    });
  let parsed = parse(await generateAnalyticalExerciseRaw(fullPrompt, "thinking"));
  const incomplete = parsed.success ? retryIf?.(parsed.data) : null;
  if (incomplete) {
    const second = parse(
      await generateAnalyticalExerciseRaw(`${fullPrompt}\n${COACHING_RETRY_SUFFIX}\nReason: ${incomplete}`, "thinking"),
    );
    if (second.success) parsed = second;
  } else if (!parsed.success) {
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

/** "Take with you" cards for an evaluative exercise: what to ask for, when to retry, and the checked result. */
function evaluativeCards(exercise: EvaluativeExerciseRow, result: EvaluativeResult, domain: string) {
  const ideas = pickEvaluativeCards(exercise, result);
  const ctx = { domain, avoid: "" };
  return {
    ideas,
    retryIf: (data: CoachingStructured) =>
      sanitizeTrapCards(data.trapCards, ideas, ctx).length < ideas.length ? `trapCards: one complete card for each of ${ideas.join(", ")}` : null,
    finish: (data: CoachingStructured): CoachingStructured => ({ ...data, takeaways: [], trapCards: sanitizeTrapCards(data.trapCards, ideas, ctx) }),
  };
}

/** A readable heading for an evaluative coaching ref (`option_<id>` / `criterion_<id>`). */
function evaluativeRefHeading(ex: EvaluativeExerciseRow, ref: string): string {
  if (ref.startsWith("option_")) {
    const o = ex.options.find((x) => x.id === ref.slice("option_".length));
    return o ? `Option: ${o.title}` : ref;
  }
  if (ref.startsWith("criterion_") && ex.variant === "scoring") {
    const c = ex.criteria.find((x) => x.id === ref.slice("criterion_".length));
    return c ? `Criterion: ${c.label}` : ref;
  }
  return ref;
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
  if (b.kind === "strategy") {
    const exercise = b.exercise as StrategyExerciseRow | undefined;
    if (!exercise || exercise.type !== "strategy" || !Array.isArray(exercise.cells) || !exercise.answers) {
      return NextResponse.json({ ok: false, error: "strategy requires the exercise row with answers" }, { status: 400 });
    }
    const result = scoreStrategy({
      aOptions: exercise.optionsA.map((o) => o.id),
      bOptions: exercise.optionsB.map((o) => o.id),
      cells: exercise.cells,
      answers: exercise.answers,
    });
    const refs = strategyCoachingRefs(result);
    const cardIdeas = pickStrategyCards(result);
    const cardCtx = { domain: exercise.domain, avoid: "" };
    const prompt = buildStrategyPerspectivePrompt({
      exercise,
      result,
      requiredRefs: refs.required,
      cardIdeas,
      userContext: typeof b.userContext === "string" ? b.userContext : undefined,
    });
    try {
      const { structured, text } = await generateCoaching(
        prompt,
        languageAppendix,
        { ...refs, requireMetaNote: true, takeawaysOptional: true },
        (ref) => {
          if (ref === "prediction") return "Where they end up";
          if (ref === "better") return "Better for both";
          if (ref.startsWith("rank_")) return `How ${exercise.players.find((p) => p.id === ref.slice(5))?.name ?? ref} ranks the outcomes`;
          if (ref.startsWith("dominant_")) return `Dominant choice of ${exercise.players.find((p) => p.id === ref.slice(9))?.name ?? ref}`;
          return "Best reply";
        },
        (data) =>
          sanitizeTrapCards(data.trapCards, cardIdeas, cardCtx).length < cardIdeas.length
            ? `trapCards: one complete card for each of ${cardIdeas.join(", ")}`
            : null,
      );
      const checked = { ...structured, takeaways: [], trapCards: sanitizeTrapCards(structured.trapCards, cardIdeas, cardCtx) };
      return NextResponse.json({ ok: true, structured: checked, text, result });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      const timeout = e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
      return NextResponse.json(
        { ok: false, error: timeout ? "Exercise generation timed out. Please try again." : message },
        { status: timeout ? 504 : 500 },
      );
    }
  }

  if (b.kind === "calibration") {
    const exercise = b.exercise as CalibrationExerciseRow | undefined;
    if (!exercise || exercise.type !== "calibration" || !Array.isArray(exercise.items)) {
      return NextResponse.json({ ok: false, error: "calibration requires the exercise row" }, { status: 400 });
    }
    const cfg = CALIBRATION_LEVELS[exercise.level] ?? CALIBRATION_LEVELS.guided;
    const result = scoreCalibration({
      items: exercise.items,
      answers: exercise.answers ?? {},
      intervalTarget: cfg.intervalTarget,
    });
    const refs = calibrationCoachingRefs(result);
    const prompt = buildCalibrationPerspectivePrompt({
      exercise,
      result,
      requiredRefs: refs.required,
      userContext: typeof b.userContext === "string" ? b.userContext : undefined,
    });
    try {
      const { structured, text } = await generateCoaching(prompt, languageAppendix, refs, (ref) => {
        if (ref === "pattern") return "The overall picture";
        const item = exercise.items.find((x) => `item_${x.id}` === ref);
        if (!item) return ref;
        return item.kind === "baserate" ? `Base rate: ${item.question}` : item.question;
      });
      return NextResponse.json({ ok: true, structured, text, result });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      const timeout = e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
      return NextResponse.json(
        { ok: false, error: timeout ? "Exercise generation timed out. Please try again." : message },
        { status: timeout ? 504 : 500 },
      );
    }
  }

  if (b.kind === "reframe") {
    const exercise = b.exercise as ReframeExerciseRow | undefined;
    if (!exercise || exercise.type !== "reframe" || !Array.isArray(exercise.thoughts) || !exercise.rewrite) {
      return NextResponse.json({ ok: false, error: "reframe requires the exercise row" }, { status: 400 });
    }
    const cfg = REFRAME_LEVELS[exercise.level] ?? REFRAME_LEVELS.guided;
    const result = scoreReframe({
      thoughts: exercise.thoughts,
      answers: exercise.answers ?? {},
      rewrite: exercise.rewrite,
      rewriteChoice: exercise.rewriteChoice,
      rewriteWritten: cfg.rewrite !== "choose",
    });
    const refs = reframeCoachingRefs(result);
    const cardTraps = pickTrapCards(exercise.thoughts, exercise.rewrite, result);
    const cardCtx = { domain: exercise.domain, avoid: exercise.rewrite.options[exercise.rewrite.answerIndex] ?? "" };
    const prompt = buildReframePerspectivePrompt({
      exercise,
      result,
      requiredRefs: refs.required,
      cardTraps,
      userContext: typeof b.userContext === "string" ? b.userContext : undefined,
    });
    try {
      const { structured, text } = await generateCoaching(
        prompt,
        languageAppendix,
        { ...refs, takeawaysOptional: true },
        (ref) => {
          if (ref === "rewrite") return "Your balanced thought";
          const t = exercise.thoughts.find((x) => `thought_${x.id}` === ref);
          return t ? `Thought: ${t.text}` : ref;
        },
        (data) =>
          sanitizeTrapCards(data.trapCards, cardTraps, cardCtx).length < cardTraps.length
            ? `trapCards: one complete card for each of ${cardTraps.join(", ")}`
            : null,
      );
      const checked = { ...structured, takeaways: [], trapCards: sanitizeTrapCards(structured.trapCards, cardTraps, cardCtx) };
      return NextResponse.json({ ok: true, structured: checked, text, result });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      const timeout = e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
      return NextResponse.json(
        { ok: false, error: timeout ? "Exercise generation timed out. Please try again." : message },
        { status: timeout ? 504 : 500 },
      );
    }
  }

  if (b.kind === "judgment") {
    const exercise = b.exercise as JudgmentExerciseRow | undefined;
    if (!exercise || exercise.type !== "judgment" || !Array.isArray(exercise.responses)) {
      return NextResponse.json({ ok: false, error: "judgment requires the exercise row" }, { status: 400 });
    }
    const cfg = JUDGMENT_LEVELS[exercise.level] ?? JUDGMENT_LEVELS.guided;
    const result = scoreJudgment({
      responses: exercise.responses,
      userOrder: exercise.userOrder ?? [],
      lensQuestions: exercise.lensQuestions,
      lensAnswers: exercise.lensAnswers ?? {},
      lensFreeText: cfg.lensMode === "free",
    });
    const refs = judgmentCoachingRefs(result, { hasOwnResponse: Boolean(exercise.ownResponse?.trim()) });
    const cardLenses = pickLensCards(exercise.responses, result);
    const cardCtx = { domain: exercise.domain, avoid: exercise.responses.find((r) => r.expertRank === 1)?.text ?? "" };
    const prompt = buildJudgmentPerspectivePrompt({
      exercise,
      result,
      requiredRefs: refs.required,
      cardLenses,
      userContext: typeof b.userContext === "string" ? b.userContext : undefined,
    });
    try {
      const { structured, text } = await generateCoaching(
        prompt,
        languageAppendix,
        { ...refs, requireMetaNote: true, takeawaysOptional: true },
        (ref) => {
          if (ref === "own") return "Your own response";
          if (ref.startsWith("lens_")) {
            const lens = ref.slice(5) as keyof typeof LENS_INFO;
            return LENS_INFO[lens]?.name ?? ref;
          }
          const resp = exercise.responses.find((x) => `response_${x.id}` === ref);
          return resp ? `Response: ${resp.text}` : ref;
        },
        (data) =>
          sanitizeTrapCards(data.trapCards, cardLenses, cardCtx).length < cardLenses.length
            ? `trapCards: one complete card for each of ${cardLenses.join(", ")}`
            : null,
      );
      const checked = { ...structured, takeaways: [], trapCards: sanitizeTrapCards(structured.trapCards, cardLenses, cardCtx) };
      return NextResponse.json({ ok: true, structured: checked, text, result });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      const timeout = e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
      return NextResponse.json(
        { ok: false, error: timeout ? "Exercise generation timed out. Please try again." : message },
        { status: timeout ? 504 : 500 },
      );
    }
  }

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
    const result = scoreEvaluative(exercise) as MatrixResult;
    const refs = evaluativeCoachingRefs(result);
    const cards = evaluativeCards(exercise, result, domain);
    const prompt = buildEvaluativeMatrixPerspectivePrompt({
      cardIdeas: cards.ideas,
      title,
      domain,
      scenario: exercise.scenario,
      exercise,
      result,
      requiredRefs: refs.required,
      confidenceBefore,
      userContext,
    });
    try {
      const { structured, text } = await generateCoaching(
        prompt,
        languageAppendix,
        { ...refs, requireMetaNote: false, takeawaysOptional: true },
        (ref) => evaluativeRefHeading(exercise, ref),
        cards.retryIf,
      );
      return NextResponse.json({ ok: true, structured: cards.finish(structured), text, result });
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
    const result = scoreEvaluative(exercise) as ScoringResult;
    const refs = evaluativeCoachingRefs(result);
    const cards = evaluativeCards(exercise, result, domain);
    const prompt = buildEvaluativeScoringPerspectivePrompt({
      cardIdeas: cards.ideas,
      title,
      domain,
      exercise,
      result,
      requiredRefs: refs.required,
      confidenceBefore,
      userContext,
    });
    try {
      const { structured, text } = await generateCoaching(
        prompt,
        languageAppendix,
        { ...refs, requireMetaNote: true, takeawaysOptional: true },
        (ref) => evaluativeRefHeading(exercise, ref),
        cards.retryIf,
      );
      return NextResponse.json({ ok: true, structured: cards.finish(structured), text, result });
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
    const result = scoreEvaluative(exercise) as UncertaintyResult;
    const refs = evaluativeCoachingRefs(result);
    const cards = evaluativeCards(exercise, result, domain);
    const prompt = buildEvaluativeUncertaintyPerspectivePrompt({
      cardIdeas: cards.ideas,
      title,
      domain,
      exercise,
      result,
      requiredRefs: refs.required,
      confidenceBefore,
      userContext,
    });
    try {
      const { structured, text } = await generateCoaching(
        prompt,
        languageAppendix,
        { ...refs, requireMetaNote: false, takeawaysOptional: true },
        (ref) => evaluativeRefHeading(exercise, ref),
        cards.retryIf,
      );
      return NextResponse.json({ ok: true, structured: cards.finish(structured), text, result });
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
    const impactVia =
      b.impactVia && typeof b.impactVia === "object" ? (b.impactVia as Record<string, string>) : undefined;
    const result = scoreSystems({ nodes, intendedConnections, shockEvent, userEdges, nodeImpact, impactVia });
    const refs = systemsCoachingRefs(result);
    const cardIdeas = pickSystemsCards({
      intendedConnections,
      result,
      criticality: variantKind ? systemsCriticality(criticalityGroundTruth, userCriticalityRanking) : null,
    });
    const cardCtx = { domain, avoid: "" };
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
      cardIdeas,
    });
    const needsMeta =
      Boolean(perspectiveAName && perspectiveBName && intendedConnectionsB && shockEventB) ||
      Boolean(variantKind && criticalityGroundTruth && userCriticalityRanking && secondShockEvent);
    const nodeLabel = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
    try {
      const { structured, text } = await generateCoaching(
        prompt,
        languageAppendix,
        { ...refs, requireMetaNote: needsMeta, takeawaysOptional: true },
        (ref) => {
          if (ref.startsWith("node_")) return `Node: ${nodeLabel(ref.slice(5))}`;
          if (ref.startsWith("via_")) return `How the shock reaches ${nodeLabel(ref.slice(4))}`;
          const [kind, n] = ref.split("_");
          const i = Number(n) - 1;
          if (kind === "conn") {
            const c = intendedConnections[i];
            return c ? `Connection: ${nodeLabel(c.from)} -> ${nodeLabel(c.to)}` : ref;
          }
          const e = userEdges.find((x) => x.id === result.extraEdgeIds[i]);
          return e ? `Your connection: ${nodeLabel(e.source)} -> ${nodeLabel(e.target)}` : ref;
        },
        (data) =>
          sanitizeTrapCards(data.trapCards, cardIdeas, cardCtx).length < cardIdeas.length
            ? `trapCards: one complete card for each of ${cardIdeas.join(", ")}`
            : null,
      );
      const checked = { ...structured, takeaways: [], trapCards: sanitizeTrapCards(structured.trapCards, cardIdeas, cardCtx) };
      return NextResponse.json({ ok: true, structured: checked, text, result });
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
  const geoGuess =
    typeof b.geoGuess === "object" && b.geoGuess !== null ? (b.geoGuess as GeoGuessResult) : undefined;
  const lensLines = Array.isArray(b.lensLines)
    ? (b.lensLines as unknown[]).filter((l): l is string => typeof l === "string").slice(0, 4)
    : undefined;

  const result = scoreAnalytical({ passage, embeddedIssues, validPoints, highlights: userHighlights });
  const refs = analyticalCoachingRefs(result, userHighlights);
  const isGeo = Boolean(hiddenPerspective?.trim());
  const cardKeys = pickIssueCards(embeddedIssues, result);
  const cardCtx = { domain, avoid: "" };
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
    geoGuess,
    lensLines,
    cardKeys,
  });
  const fullPrompt = [prompt, languageAppendix].filter(Boolean).join("\n\n");
  const parse = (raw: string) =>
    parseAnalyticalCoachingJson(raw, {
      requiredRefs: refs.required,
      allowedRefs: refs.allowed,
      requireMetaNote: isGeo,
      takeawaysOptional: true,
    });

  try {
    let parsed = parse(await generateAnalyticalExerciseRaw(fullPrompt, "thinking"));
    // One retry when the cards are incomplete; the second reply is kept either way.
    if (parsed.success && sanitizeTrapCards(parsed.data.trapCards, cardKeys, cardCtx).length < cardKeys.length) {
      const second = parse(
        await generateAnalyticalExerciseRaw(
          `${fullPrompt}\n${ANALYTICAL_COACHING_RETRY_SUFFIX}\nReason: trapCards: one complete card for each of ${cardKeys.join(", ")}`,
          "thinking",
        ),
      );
      if (second.success) parsed = second;
    } else if (!parsed.success) {
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
    const structured = { ...parsed.data, takeaways: [], trapCards: sanitizeTrapCards(parsed.data.trapCards, cardKeys, cardCtx) };
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
