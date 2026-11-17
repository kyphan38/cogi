import { shuffledOrder } from "@/lib/exercise/guided-candidates";
import { addDays, localDay } from "@/lib/review/schedule";
import type { Exercise, GeoLabExerciseRow, QuickExerciseRow } from "@/lib/types/exercise";

/** A finished exercise can be done again this many days later. */
export const REDO_AFTER_DAYS = 30;

export type PracticeRow = Exclude<Exercise, GeoLabExerciseRow | QuickExerciseRow>;

function shuffledList<T>(items: T[], seed: string): T[] {
  return shuffledOrder(items.length, seed).map((i) => items[i]!);
}

/** The fields every row shares, back to a fresh start. */
function freshCommon(id: string, redoOf: string, now: string) {
  return {
    id,
    redoOf,
    confidenceBefore: null,
    aiPerspective: null,
    aiPerspectiveStructured: null,
    result: null,
    takeaway: null,
    usePlan: null,
    useCheck: null,
    createdAt: now,
    completedAt: null,
    currentStep: 1,
  };
}

/**
 * The same exercise with the user's work removed, ready to be done again. The
 * content (passage, scenario, answer key) is untouched, so old and new answers
 * can be compared.
 */
export function redoRow(ex: PracticeRow, id: string, now: string): PracticeRow {
  const common = freshCommon(id, ex.id, now);
  switch (ex.type) {
    case "analytical":
      return {
        ...ex,
        ...common,
        conceptAnswers: [],
        learnDone: !ex.concepts?.length,
        perspectiveChoice: null,
        actorChoices: [],
        lensAnswers: {},
        lensText: {},
        userPerspectiveGuess: undefined,
        userMissingActorsGuess: undefined,
        metaGuessScore: undefined,
        geoGuess: null,
        userHighlights: [],
        mainClaimAnswer: null,
        guidedIndex: 0,
        deepDives: undefined,
      };
    case "systems": {
      const none = Object.fromEntries(ex.nodes.map((n) => [n.id, "none" as const]));
      return {
        ...ex,
        ...common,
        userProposedComponents: null,
        userEdges: [],
        nodeImpact: none,
        secondNodeImpact: ex.secondNodeImpact ? { ...none } : undefined,
        userCriticalityRanking: ex.userCriticalityRanking ? {} : undefined,
        impactVia: undefined,
        userPerspectiveBNotes: undefined,
        predictedDirectB: undefined,
        revealedB: undefined,
        lookAhead: null,
        lifeExample: null,
      };
    }
    case "evaluative": {
      if (ex.variant === "matrix") {
        return { ...ex, ...common, placements: {}, userProposedCriteria: null, criteriaFeedback: null };
      }
      if (ex.variant === "uncertainty") {
        return { ...ex, ...common, userProbabilities: {}, userPayoffs: {}, outcomeIntuitionText: "" };
      }
      // The same starting table a new exercise gets: neutral 3s for geopolitics, the suggested values otherwise.
      const geo = ex.isGeopolitics ?? Boolean(ex.stakeholderNote?.trim());
      return {
        ...ex,
        ...common,
        userProposedCriteria: null,
        criteriaFeedback: null,
        userStakeholderMapping: null,
        stakeholderMappingRevealed: false,
        criterionWeights: Object.fromEntries(ex.criteria.map((c) => [c.id, geo ? 3 : c.suggestedWeight])),
        scores: Object.fromEntries(
          ex.options.map((o) => [
            o.id,
            geo ? Object.fromEntries(ex.criteria.map((c) => [c.id, 3])) : { ...o.suggestedScores },
          ]),
        ),
      };
    }
    case "tricky":
      return {
        ...ex,
        ...common,
        part: "learn" as const,
        conceptAnswers: [],
        roundsDone: 0,
        picks: [],
        answers: [],
      };
    case "judgment":
      return {
        ...ex,
        ...common,
        part: "learn" as const,
        conceptAnswers: [],
        lensAnswers: {},
        lensText: {},
        userOrder: shuffledList(ex.responses.map((r) => r.id), id),
        userWhy: "",
        ownResponse: undefined,
      };
    case "strategy": {
      const keys = ex.cells.map((c) => `${c.a}|${c.b}`);
      const old = ex.answers;
      return {
        ...ex,
        ...common,
        part: "learn" as const,
        conceptAnswers: [],
        userWhy: "",
        answers: old?.ranks
          ? {
              // Keep the same outcome keys the first try ranked, in a new order.
              ranks: {
                A: shuffledList(old.ranks.A.length ? old.ranks.A : keys, `${id}-A`),
                B: shuffledList(old.ranks.B.length ? old.ranks.B : keys, `${id}-B`),
              },
              prediction: [],
              ...(old.dominant ? { dominant: { A: "", B: "" }, betterForBoth: [] } : {}),
            }
          : { bestReplies: {}, prediction: [] },
      };
    }
    case "reframe":
      return {
        ...ex,
        ...common,
        part: "learn" as const,
        spotLocked: false,
        conceptAnswers: [],
        feeling: undefined,
        intensityBefore: 50,
        intensityAfter: 50,
        answers: {},
        rewriteChoice: null,
        evidenceFor: undefined,
        evidenceAgainst: undefined,
        balancedThought: undefined,
      };
    case "calibration":
      return { ...ex, ...common, part: "learn" as const, conceptAnswers: [], answers: {} };
  }
}

type RedoMeta = Pick<Exercise, "id" | "type" | "completedAt"> & { redoOf?: string };

/** Old enough to redo, not itself a redo, and not redone (or being redone) already. */
export function canRedo(ex: RedoMeta, all: RedoMeta[], today: string): boolean {
  if (ex.type === "geo" || ex.type === "quick" || !ex.completedAt || ex.redoOf) return false;
  if (addDays(localDay(new Date(ex.completedAt)), REDO_AFTER_DAYS) > today) return false;
  return !all.some((r) => r.redoOf === ex.id);
}

/**
 * The one exercise Today offers to redo: the oldest that can be. `all` holds finished
 * and unfinished rows, so an exercise with a redo in progress is not offered twice.
 */
export function redoSuggestion<Row extends RedoMeta>(completed: Row[], all: RedoMeta[], today: string): Row | null {
  const ready = completed.filter((e) => canRedo(e, all, today));
  ready.sort((a, b) => a.completedAt!.localeCompare(b.completedAt!));
  return ready[0] ?? null;
}
