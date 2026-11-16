"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { practicePhase } from "@/components/shared/ExerciseShell";
import { ConceptList } from "@/components/exercises/LearnFirst";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import { putExercise } from "@/lib/db/exercises";
import { rememberExerciseInUrl } from "@/lib/nav/exercise-url";
import {
  getLanguageLevelForRequest,
  getPracticeLevel,
  getUserContext,
} from "@/lib/db/settings";
import {
  isJudgmentExercise,
  type JudgmentExerciseRow,
} from "@/lib/types/exercise";
import type { JudgmentExercisePayload } from "@/lib/ai/validators/judgment";
import {
  useDebouncedSave,
  useExerciseFlow,
} from "@/components/exercises/flow/useExerciseFlow";
import { takeScenarioText } from "@/lib/topics/scenario-handoff";
import {
  JUDGMENT_LEVELS,
  type JudgmentContext,
} from "@/lib/exercise/judgment-levels";
import { scoreJudgment } from "@/lib/exercise/judgment-score";
import { shuffledOrder } from "@/lib/exercise/guided-candidates";
import { type PracticeLevel } from "@/lib/exercise/levels";
import {
  FlowStep,
  FEEDBACK_STEP,
  PART_LABELS,
} from "@/components/exercises/judgment/shared";

/** State, effects and actions of the Judgment flow; the steps only render. */
export function useJudgmentFlow({
  resumeId,
  initialDomain,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const flow = useExerciseFlow<JudgmentExerciseRow, FlowStep>({
    type: "judgment",
    resumeId,
    isRow: isJudgmentExercise,
    onResume: (row) => setStep(row.aiPerspective ? FEEDBACK_STEP : 1),
    // Loaded below: a handed-over scenario can change the level.
    loadLevel: false,
  });
  const {
    step,
    setStep,
    level,
    setLevel,
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
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    pendingSave,
  } = flow;
  const [area, setArea] = useState(initialDomain?.trim() || "Work");
  const [context, setContext] = useState<JudgmentContext>("vietnam");
  const [source, setSource] = useState<"generated" | "custom_scenario">(
    "generated",
  );
  const [ownSituation, setOwnSituation] = useState("");
  const [needsSupport, setNeedsSupport] = useState(false);
  const [lensIndex, setLensIndex] = useState(0);
  const [showTerms, setShowTerms] = useState(false);

  const handedScenario = useRef<string | null | undefined>(undefined);
  const setupLevel = JUDGMENT_LEVELS[level];
  const cfg = exercise ? JUDGMENT_LEVELS[exercise.level] : setupLevel;

  useEffect(() => {
    // A scenario from the New exercise page needs a level with "My situation" (PLAN-topic-ideas.md T2).
    // Read once: in dev, React runs this effect twice and the text is cleared on read.
    if (handedScenario.current === undefined)
      handedScenario.current = resumeId ? null : takeScenarioText();
    const handed = handedScenario.current;
    void getPracticeLevel("judgment").then((saved) => {
      if (!handed) {
        setLevel(saved);
        return;
      }
      setLevel(JUDGMENT_LEVELS[saved].ownSituation ? saved : "standard");
      setSource("custom_scenario");
      setOwnSituation(handed);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Update the row; the effect below saves it a second after the last change. */
  const save = (patch: Partial<JudgmentExerciseRow>) => {
    setExercise((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const autosaveRow = step === 1 ? exercise : null;
  useDebouncedSave(
    pendingSave,
    autosaveRow ? () => void putExercise(autosaveRow) : null,
    1000,
    [exercise, step],
  );

  const chooseLevel = (next: PracticeLevel) => {
    flow.chooseLevel(next);
    if (!JUDGMENT_LEVELS[next].ownSituation) setSource("generated");
  };

  const generate = async () => {
    setError(null);
    setNeedsSupport(false);
    if (source === "custom_scenario" && ownSituation.trim().length < 40) {
      setError(
        "Describe your situation in a few sentences (at least 40 characters).",
      );
      return;
    }
    if (!area.trim()) {
      setError("Pick an area of life.");
      return;
    }
    setLoading(true);
    try {
      const [userContext, languageLevel] = await Promise.all([
        getUserContext(),
        getLanguageLevelForRequest(),
      ]);
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseType: "judgment",
          domain: area.trim(),
          context,
          level,
          mode: source,
          customScenario:
            source === "custom_scenario" ? ownSituation.trim() : undefined,
          userContext: userContext || undefined,
          languageLevel,
        }),
      });
      const json = await safeAiJson<
        | { ok: true; data: JudgmentExercisePayload }
        | { ok: false; error: string; safety?: "concern" }
      >(res);
      if (!json.ok) {
        if (json.safety === "concern") setNeedsSupport(true);
        else setError(json.error);
        return;
      }
      const id = crypto.randomUUID();
      const data = json.data;
      const row: JudgmentExerciseRow = {
        id,
        type: "judgment",
        domain: area.trim(),
        context,
        customScenario:
          source === "custom_scenario" ? ownSituation.trim() : undefined,
        title: data.title,
        scenario: data.scenario,
        concepts: data.concepts,
        conceptChecks: data.conceptChecks,
        lensQuestions: data.lensQuestions,
        responses: data.responses,
        level,
        part: "learn",
        conceptAnswers: [],
        lensAnswers: {},
        lensText: {},
        // The model tends to list the best response first, so start from a shuffled order.
        userOrder: shuffledOrder(data.responses.length, id).map(
          (i) => data.responses[i]!.id,
        ),
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
      setLensIndex(0);
      setPerspectiveStructured(null);
      setTakeaway("");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  };

  const getFeedback = async () => {
    if (!exercise) return;
    setError(null);
    setNeedsSupport(false);
    if (
      exercise.userWhy?.trim().length === 0 &&
      cfg.lensMode !== "one-by-one"
    ) {
      setError("Write one sentence on why you picked your first choice.");
      return;
    }
    setLoading(true);
    pendingSave.clear();
    try {
      const row: JudgmentExerciseRow = {
        ...exercise,
        confidenceBefore: confidence,
      };
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "judgment",
          exercise: row,
          userContext: userContext || undefined,
        }),
      });
      const parsed = parsePerspectiveFetchJson(
        await safeAiJson<unknown>(res),
        "analytical",
      );
      if (!parsed.ok) {
        if (parsed.safety === "concern") setNeedsSupport(true);
        else setError(parsed.error);
        return;
      }
      const result = scoreJudgment({
        responses: row.responses,
        userOrder: row.userOrder ?? [],
        lensQuestions: row.lensQuestions,
        lensAnswers: row.lensAnswers ?? {},
        lensFreeText: cfg.lensMode === "free",
      });
      const next: JudgmentExerciseRow = {
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

  const lensOrders = useMemo(
    () =>
      exercise
        ? Object.fromEntries(
            exercise.lensQuestions.map((q) => [
              q.lens,
              shuffledOrder(q.options.length, `${exercise.id}-${q.lens}`),
            ]),
          )
        : {},
    [exercise],
  );

  const phase = practicePhase(step, FEEDBACK_STEP);
  const part = exercise?.part ?? "learn";
  const partLabel = phase === 1 ? PART_LABELS[part] : undefined;
  const lensAnswers = exercise?.lensAnswers ?? {};
  const lensText = exercise?.lensText ?? {};
  const lensesDone =
    exercise != null &&
    exercise.lensQuestions.every((q) =>
      cfg.lensMode === "free"
        ? (lensText[q.lens] ?? "").trim().length > 0
        : lensAnswers[q.lens] != null,
    );

  const scenarioBlock = exercise ? (
    <div className="space-y-2">
      <div className="whitespace-pre-wrap border-l-2 border-border pl-4 text-body leading-[1.75] text-foreground">
        {exercise.scenario}
      </div>
      <button
        type="button"
        className="text-muted-foreground text-meta hover:text-foreground active:text-foreground"
        onClick={() => setShowTerms((v) => !v)}
      >
        {showTerms ? "Hide the ideas" : "Show the ideas from Learn first"}
      </button>
      {showTerms ? <ConceptList concepts={exercise.concepts} /> : null}
    </div>
  ) : null;

  return {
    area,
    setArea,
    context,
    setContext,
    source,
    setSource,
    ownSituation,
    setOwnSituation,
    needsSupport,
    setNeedsSupport,
    lensIndex,
    setLensIndex,
    showTerms,
    setShowTerms,
    step,
    setStep,
    level,
    setLevel,
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
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    pendingSave,
    flow,
    handedScenario,
    setupLevel,
    cfg,
    save,
    autosaveRow,
    chooseLevel,
    generate,
    getFeedback,
    finish,
    lensOrders,
    phase,
    part,
    partLabel,
    lensAnswers,
    lensText,
    lensesDone,
    scenarioBlock,
  };
}

export type JudgmentFlowState = ReturnType<typeof useJudgmentFlow>;
