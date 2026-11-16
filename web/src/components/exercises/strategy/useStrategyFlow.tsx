"use client";

import { useMemo, useState } from "react";
import { practicePhase } from "@/components/shared/ExerciseShell";
import { ConceptList } from "@/components/exercises/LearnFirst";
import { outcomeNumbers } from "@/components/exercises/PayoffMatrix";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import { putExercise } from "@/lib/db/exercises";
import { rememberExerciseInUrl } from "@/lib/nav/exercise-url";
import { getLanguageLevelForRequest, getUserContext } from "@/lib/db/settings";
import { getGenerationContext } from "@/lib/db/generation-context";
import {
  isStrategyExercise,
  type StrategyExerciseRow,
} from "@/lib/types/exercise";
import type { StrategyExercisePayload } from "@/lib/ai/validators/strategy";
import { STRATEGY_LEVELS } from "@/lib/exercise/strategy-levels";
import { analyzeGame, cellKey } from "@/lib/exercise/game";
import {
  scoreStrategy,
  type StrategyAnswers,
} from "@/lib/exercise/strategy-score";
import { type PracticeLevel } from "@/lib/exercise/levels";
import {
  useDebouncedSave,
  useExerciseFlow,
} from "@/components/exercises/flow/useExerciseFlow";
import { geoGameCaseById } from "@/lib/geo/game-cases";
import {
  FlowStep,
  FEEDBACK_STEP,
  PART_LABELS,
  shuffled,
} from "@/components/exercises/strategy/shared";

/** State, effects and actions of the Strategy flow; the steps only render. */
export function useStrategyFlow({
  resumeId,
  initialDomain,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const flow = useExerciseFlow<StrategyExerciseRow, FlowStep>({
    type: "strategy",
    resumeId,
    isRow: isStrategyExercise,
    onResume: (row) => {
      setStep(row.aiPerspective ? FEEDBACK_STEP : 1);
    },
  });
  const {
    step,
    setStep,
    level,
    exercise,
    setExercise,
    error,
    setError,
    loading,
    setLoading,
    confidence,
    setConfidence,
    perspectiveStructured,
    setPerspectiveStructured,
    takeaway,
    setTakeaway,
    usePlan,
    setUsePlan,
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    pendingSave,
  } = flow;
  const initialCase = geoGameCaseById(initialDomain?.trim());
  const [area, setArea] = useState(
    initialCase ? "" : initialDomain?.trim() || "Business & prices",
  );
  /** Geopolitical games (PLAN-geopolitics.md G3): a real case to base the story on. */
  const [geoCaseId, setGeoCaseId] = useState<string | null>(
    initialCase?.id ?? null,
  );
  const pickedCase = geoGameCaseById(geoCaseId);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [rankPlayer, setRankPlayer] = useState<"A" | "B">("A");
  const [showTerms, setShowTerms] = useState(false);

  const setupLevel = STRATEGY_LEVELS[level];
  const cfg = exercise ? STRATEGY_LEVELS[exercise.level] : setupLevel;

  /** Update the row; the effect below saves it a second after the last change. */
  const save = (patch: Partial<StrategyExerciseRow>) =>
    setExercise((prev) => (prev ? { ...prev, ...patch } : prev));
  const saveAnswers = (patch: Partial<StrategyAnswers>) =>
    setExercise((prev) =>
      prev
        ? {
            ...prev,
            answers: {
              prediction: [],
              ...prev.answers,
              ...patch,
            } as StrategyAnswers,
          }
        : prev,
    );

  const autosaveRow = step === 1 ? exercise : null;
  useDebouncedSave(
    pendingSave,
    autosaveRow ? () => void putExercise(autosaveRow) : null,
    1000,
    [exercise, step],
  );

  const chooseLevel = (next: PracticeLevel) => {
    flow.chooseLevel(next);
  };

  const generate = async () => {
    setError(null);
    const gameCase = pickedCase;
    if (!gameCase && !area.trim()) {
      setError("Pick a topic area.");
      return;
    }
    setLoading(true);
    try {
      const [userContext, languageLevel] = await Promise.all([
        getGenerationContext(),
        getLanguageLevelForRequest(),
      ]);
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseType: "strategy",
          domain: gameCase ? gameCase.title : area.trim(),
          ...(gameCase ? { geoCaseId: gameCase.id } : {}),
          level,
          userContext: userContext || undefined,
          languageLevel,
        }),
      });
      const json = await safeAiJson<
        | { ok: true; data: StrategyExercisePayload }
        | { ok: false; error: string }
      >(res);
      if (!json.ok) {
        setError(json.error);
        return;
      }
      const d = json.data;
      const id = crypto.randomUUID();
      const keys = d.optionsA.flatMap((a) =>
        d.optionsB.map((b) => cellKey(a.id, b.id)),
      );
      const cfgNow = STRATEGY_LEVELS[level];
      const row: StrategyExerciseRow = {
        id,
        type: "strategy",
        domain: gameCase ? gameCase.title : area.trim(),
        ...(gameCase ? { geoCaseId: gameCase.id } : {}),
        title: d.title,
        scenario: d.scenario,
        concepts: d.concepts,
        conceptChecks: d.conceptChecks,
        players: d.players,
        optionsA: d.optionsA,
        optionsB: d.optionsB,
        cells: d.cells,
        gameType: d.gameType,
        insight: d.insight,
        level,
        part: "learn",
        conceptAnswers: [],
        answers: cfgNow.showPayoffs
          ? { bestReplies: {}, prediction: [] }
          : {
              ranks: {
                A: shuffled(keys, `${id}-A`),
                B: shuffled(keys, `${id}-B`),
              },
              prediction: [],
              ...(cfgNow.extraQuestions
                ? { dominant: { A: "", B: "" }, betterForBoth: [] }
                : {}),
            },
        userWhy: "",
        confidenceBefore: null,
        aiPerspective: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        currentStep: 1,
      };
      await putExercise(row);
      rememberExerciseInUrl(row);
      setExercise(row);
      setQuestionIndex(0);
      setRankPlayer("A");
      setPerspectiveStructured(null);
      setTakeaway("");
      setUsePlan("");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  };

  const getFeedback = async () => {
    if (!exercise?.answers) return;
    setError(null);
    if (exercise.answers.prediction.length === 0) {
      setError("Pick the outcome (or outcomes) where you think they end up.");
      return;
    }
    if (
      exercise.answers.dominant &&
      (!exercise.answers.dominant.A || !exercise.answers.dominant.B)
    ) {
      setError("Answer the dominant choice question for both sides.");
      return;
    }
    setLoading(true);
    pendingSave.clear();
    try {
      const row: StrategyExerciseRow = {
        ...exercise,
        confidenceBefore: confidence,
      };
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "strategy",
          exercise: row,
          userContext: userContext || undefined,
        }),
      });
      const parsed = parsePerspectiveFetchJson(
        await safeAiJson<unknown>(res),
        "analytical",
      );
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const result = scoreStrategy({
        aOptions: row.optionsA.map((o) => o.id),
        bOptions: row.optionsB.map((o) => o.id),
        cells: row.cells,
        answers: row.answers!,
      });
      const next: StrategyExerciseRow = {
        ...row,
        result,
        aiPerspective: parsed.text,
        aiPerspectiveStructured: parsed.structured,
        currentStep: FEEDBACK_STEP,
      };
      await putExercise(next);
      setExercise(next);
      setPerspectiveStructured(parsed.structured);
      setStep(FEEDBACK_STEP);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Feedback failed");
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    if (exercise) await flow.finish(exercise);
  };

  const facts = useMemo(
    () =>
      exercise
        ? analyzeGame(
            exercise.optionsA.map((o) => o.id),
            exercise.optionsB.map((o) => o.id),
            exercise.cells,
          )
        : null,
    [exercise],
  );
  const A = exercise?.players.find((p) => p.id === "A");
  const B = exercise?.players.find((p) => p.id === "B");
  /** Guided best-reply questions: A against each B choice, then B against each A choice. */
  const questions = useMemo(
    () =>
      exercise
        ? [
            ...exercise.optionsB.map((b) => ({
              key: `A:${b.id}`,
              player: "A" as const,
              opp: b.id,
            })),
            ...exercise.optionsA.map((a) => ({
              key: `B:${a.id}`,
              player: "B" as const,
              opp: a.id,
            })),
          ]
        : [],
    [exercise],
  );

  const phase = practicePhase(step, FEEDBACK_STEP);
  const part = exercise?.part ?? "learn";
  const partLabel = phase === 1 ? PART_LABELS[part] : undefined;
  const answers = exercise?.answers;
  const numbers = exercise
    ? outcomeNumbers(exercise)
    : new Map<string, number>();

  const storyBlock =
    exercise && A && B ? (
      <div className="space-y-2">
        {exercise.geoCaseId ? (
          <p
            className="text-muted-foreground text-meta"
            data-testid="geo-scenario-label"
          >
            Scenario: a made-up story shaped like a real case. The real case
            comes at the end.
          </p>
        ) : null}
        <div className="whitespace-pre-wrap border-l-2 border-border pl-4 text-body leading-[1.75] text-foreground">
          {exercise.scenario}
        </div>
        <p className="text-body text-foreground/80">
          <span className="font-medium">{A.name}</span> wants: {A.goal}{" "}
          <span className="font-medium">{B.name}</span> wants: {B.goal}
        </p>
        <button
          type="button"
          className="text-muted-foreground text-meta hover:text-foreground active:text-foreground"
          onClick={() => setShowTerms((v) => !v)}
        >
          {showTerms ? "Hide the terms" : "Show the terms from Learn first"}
        </button>
        {showTerms ? <ConceptList concepts={exercise.concepts} /> : null}
      </div>
    ) : null;

  return {
    area,
    setArea,
    geoCaseId,
    setGeoCaseId,
    questionIndex,
    setQuestionIndex,
    rankPlayer,
    setRankPlayer,
    showTerms,
    setShowTerms,
    step,
    setStep,
    level,
    exercise,
    setExercise,
    error,
    setError,
    loading,
    setLoading,
    confidence,
    setConfidence,
    perspectiveStructured,
    setPerspectiveStructured,
    takeaway,
    setTakeaway,
    usePlan,
    setUsePlan,
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    pendingSave,
    flow,
    initialCase,
    pickedCase,
    setupLevel,
    cfg,
    save,
    saveAnswers,
    autosaveRow,
    chooseLevel,
    generate,
    getFeedback,
    finish,
    facts,
    A,
    B,
    questions,
    phase,
    part,
    partLabel,
    answers,
    numbers,
    storyBlock,
  };
}

export type StrategyFlowState = ReturnType<typeof useStrategyFlow>;
