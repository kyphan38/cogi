"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { practicePhase } from "@/components/shared/ExerciseShell";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { putExercise } from "@/lib/db/exercises";
import { rememberExerciseInUrl } from "@/lib/nav/exercise-url";
import { getLanguageLevelForRequest, getPracticeLevel, getUserContext } from "@/lib/db/settings";
import { getGenerationContext } from "@/lib/db/generation-context";
import { isHumorExercise, type HumorExerciseRow } from "@/lib/types/exercise";
import type { HumorExercisePayload } from "@/lib/ai/validators/humor";
import { useDebouncedSave, useExerciseFlow } from "@/components/exercises/flow/useExerciseFlow";
import { takeScenarioText } from "@/lib/topics/scenario-handoff";
import { HUMOR_PLACES, HUMOR_LEVELS, type HumorContext } from "@/lib/exercise/humor-levels";
import { scoreHumorChoices, type HumorResult } from "@/lib/exercise/humor-score";
import { shuffledOrder } from "@/lib/exercise/guided-candidates";
import type { PracticeLevel } from "@/lib/exercise/levels";
import { FlowStep, FEEDBACK_STEP, PART_LABELS } from "@/components/exercises/humor/shared";

/** A written reply shorter than this is not a reply yet. */
const MIN_ANSWER_CHARS = 6;

/** State, effects and actions of the Light replies flow; the steps only render. */
export function useHumorFlow({
  resumeId,
  initialDomain,
}: {
  resumeId?: string;
  initialDomain?: string;
} = {}) {
  const flow = useExerciseFlow<HumorExerciseRow, FlowStep>({
    type: "humor",
    resumeId,
    isRow: isHumorExercise,
    onResume: (row) => setStep(row.result ? FEEDBACK_STEP : 1),
    // Loaded below: a handed-over situation can change the level.
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
    pendingSave,
  } = flow;
  const [place, setPlace] = useState(initialDomain?.trim() || HUMOR_PLACES[0]);
  const [context, setContext] = useState<HumorContext>("vietnam");
  const [source, setSource] = useState<"generated" | "custom_scenario">("generated");
  const [ownSituation, setOwnSituation] = useState("");
  const [needsSupport, setNeedsSupport] = useState(false);

  const handedScenario = useRef<string | null | undefined>(undefined);
  const setupLevel = HUMOR_LEVELS[level];
  const cfg = exercise ? HUMOR_LEVELS[exercise.level] : setupLevel;

  useEffect(() => {
    // Read once: in dev, React runs this effect twice and the text is cleared on read.
    if (handedScenario.current === undefined) handedScenario.current = resumeId ? null : takeScenarioText();
    const handed = handedScenario.current;
    void getPracticeLevel("humor").then((saved) => {
      if (!handed) {
        setLevel(saved);
        return;
      }
      setLevel(HUMOR_LEVELS[saved].ownSituation ? saved : "standard");
      setSource("custom_scenario");
      setOwnSituation(handed);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (patch: Partial<HumorExerciseRow>) => {
    setExercise((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const autosaveRow = step === 1 ? exercise : null;
  useDebouncedSave(pendingSave, autosaveRow ? () => void putExercise(autosaveRow) : null, 1000, [exercise, step]);

  const chooseLevel = (next: PracticeLevel) => {
    flow.chooseLevel(next);
    if (!HUMOR_LEVELS[next].ownSituation) setSource("generated");
  };

  const generate = async () => {
    setError(null);
    setNeedsSupport(false);
    if (source === "custom_scenario" && ownSituation.trim().length < 40) {
      setError("Describe the moment in a few sentences (at least 40 characters).");
      return;
    }
    if (!place.trim()) {
      setError("Pick where.");
      return;
    }
    setLoading(true);
    try {
      const [userContext, languageLevel] = await Promise.all([getGenerationContext(), getLanguageLevelForRequest()]);
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseType: "humor",
          domain: place.trim(),
          context,
          level,
          mode: source,
          customScenario: source === "custom_scenario" ? ownSituation.trim() : undefined,
          userContext: userContext || undefined,
          languageLevel,
        }),
      });
      const json = await safeAiJson<
        { ok: true; data: HumorExercisePayload } | { ok: false; error: string; safety?: "concern" }
      >(res);
      if (!json.ok) {
        if (json.safety === "concern") setNeedsSupport(true);
        else setError(json.error);
        return;
      }
      const data = json.data;
      const row: HumorExerciseRow = {
        id: crypto.randomUUID(),
        type: "humor",
        domain: place.trim(),
        context,
        customScenario: source === "custom_scenario" ? ownSituation.trim() : undefined,
        title: data.title,
        setting: data.setting,
        concepts: data.concepts,
        conceptChecks: data.conceptChecks,
        rounds: data.rounds,
        level,
        part: "learn",
        conceptAnswers: [],
        roundsDone: 0,
        picks: [],
        answers: [],
        confidenceBefore: null,
        aiPerspective: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        currentStep: 1,
      };
      await putExercise(row);
      rememberExerciseInUrl(row);
      setExercise(row);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  };

  const roundsDone = exercise?.roundsDone ?? 0;
  const allAnswered = exercise != null && roundsDone >= exercise.rounds.length;
  const currentAnswer = exercise?.answers?.[roundsDone] ?? "";

  const pick = (oi: number) => {
    if (!exercise) return;
    const picks = [...(exercise.picks ?? [])];
    picks[roundsDone] = oi;
    save({ picks });
  };

  const writeAnswer = (text: string) => {
    if (!exercise) return;
    const answers = [...(exercise.answers ?? [])];
    answers[roundsDone] = text;
    save({ answers });
  };

  /** Lock the current round and show the next moment. */
  const nextRound = () => {
    if (!exercise) return;
    setError(null);
    if (cfg.answerMode === "write" && currentAnswer.trim().length < MIN_ANSWER_CHARS) {
      setError("Write what you would say.");
      return;
    }
    save({ roundsDone: roundsDone + 1 });
  };

  const getFeedback = async () => {
    if (!exercise) return;
    setError(null);
    setNeedsSupport(false);
    setLoading(true);
    pendingSave.clear();
    try {
      const row: HumorExerciseRow = { ...exercise, confidenceBefore: confidence };
      let result: HumorResult;
      if (cfg.answerMode === "choose") {
        result = scoreHumorChoices(row.rounds, row.picks ?? []);
      } else {
        const userContext = await getUserContext();
        const res = await aiFetch("/api/ai/perspective", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "humor", exercise: row, userContext: userContext || undefined }),
        });
        const json = await safeAiJson<
          { ok: true; result: HumorResult } | { ok: false; error: string; safety?: "concern" }
        >(res);
        if (!json.ok) {
          if (json.safety === "concern") setNeedsSupport(true);
          else setError(json.error);
          return;
        }
        result = json.result;
      }
      const next: HumorExerciseRow = {
        ...row,
        result,
        aiPerspective: result.overall ?? `Score ${Math.round(result.score * 100)}%`,
        currentStep: FEEDBACK_STEP,
      };
      await putExercise(next);
      setExercise(next);
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

  const optionOrders = useMemo(
    () => (exercise ? exercise.rounds.map((r, i) => shuffledOrder(r.options.length, `${exercise.id}-round-${i}`)) : []),
    [exercise],
  );

  const phase = practicePhase(step, FEEDBACK_STEP);
  const part = exercise?.part ?? "learn";
  const partLabel = phase === 1 ? PART_LABELS[part] : undefined;

  return {
    ...flow,
    place,
    setPlace,
    context,
    setContext,
    source,
    setSource,
    ownSituation,
    setOwnSituation,
    needsSupport,
    setupLevel,
    cfg,
    save,
    chooseLevel,
    generate,
    roundsDone,
    allAnswered,
    currentAnswer,
    pick,
    writeAnswer,
    nextRound,
    getFeedback,
    finish,
    optionOrders,
    phase,
    part,
    partLabel,
    step,
    exercise,
    error,
    loading,
    level,
  };
}

export type HumorFlowState = ReturnType<typeof useHumorFlow>;
