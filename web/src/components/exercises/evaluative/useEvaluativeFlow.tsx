"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  practicePhase,
  EVALUATIVE_EXERCISE_STEP_LABELS,
  GEOPOLITICS_EVALUATIVE_STEP_LABELS,
  EVALUATIVE_UNCERTAINTY_STEP_LABELS,
} from "@/components/shared/ExerciseShell";
import { EVALUATIVE_LEVELS } from "@/lib/exercise/evaluative-levels";
import { type PracticeLevel } from "@/lib/exercise/levels";
import { scoreEvaluative } from "@/lib/exercise/evaluative-score";
import type {
  EvaluativeCriteriaFeedback,
  EvaluativeExerciseRow,
  EvaluativeMatrixRow,
  EvaluativeQuadrant,
  EvaluativeScoringRow,
  EvaluativeUncertaintyRow,
} from "@/lib/types/exercise";
import {
  type EvaluativeExercisePayload,
  type EvaluativeTaskType,
} from "@/lib/ai/validators/evaluative";
import { EVALUATIVE_UNCERTAINTY_PROBABILITY_EPSILON } from "@/lib/analytics/calibration-evaluative";
import { getLanguageLevelForRequest } from "@/lib/db/settings";
import { putExercise } from "@/lib/db/exercises";
import { rememberExerciseInUrl } from "@/lib/nav/exercise-url";
import { getUserContext } from "@/lib/db/settings";
import {
  useDebouncedSave,
  useExerciseFlow,
} from "@/components/exercises/flow/useExerciseFlow";
import { takeScenarioHandoff } from "@/lib/topics/scenario-handoff";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import type { EvaluativeScoringCriterionBreakdown } from "@/lib/types/perspective";
import { listRecentDomains } from "@/lib/db/exercises";
import { isEvaluativeExercise } from "@/lib/types/exercise";
import { resolveDomainAndScenario } from "@/lib/ai/prompts/scenario-steering";
import {
  FlowStep,
  FEEDBACK_STEP,
  resumeStep,
  isGeopoliticsEvaluativeExercise,
  payloadToRow,
} from "@/components/exercises/evaluative/shared";

/** State, effects and actions of the Evaluative flow; the steps only render. */
export function useEvaluativeFlow({
  resumeId,
  initialDomain,
  initialSource,
  autoGenerate,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const [domain, setDomain] = useState(initialDomain?.trim() ?? "");
  const [setupMode, setSetupMode] = useState<"generated" | "custom_scenario">(
    initialSource === "custom_scenario" ? "custom_scenario" : "generated",
  );
  const [evaluativeTaskType, setEvaluativeTaskType] =
    useState<EvaluativeTaskType>("auto");
  const flow = useExerciseFlow<EvaluativeExerciseRow, FlowStep>({
    type: "evaluative",
    resumeId,
    isRow: isEvaluativeExercise,
    onResume: (row) => {
      if (row.variant === "matrix") {
        setPlacements(row.placements ?? {});
      } else if (row.variant === "uncertainty") {
        setUserProbabilities(row.userProbabilities ?? {});
        setUserPayoffs(row.userPayoffs ?? {});
        setOutcomeIntuitionText(row.outcomeIntuitionText ?? "");
      } else {
        setCriterionWeights(row.criterionWeights ?? {});
        setScores(row.scores ?? {});
      }
      if (
        row.variant !== "uncertainty" &&
        row.userProposedCriteria &&
        row.userProposedCriteria.length > 0
      ) {
        setUserProposedCriteria(row.userProposedCriteria);
        setCriteriaPhase("compare");
      }
      if (row.variant !== "uncertainty" && row.criteriaFeedback) {
        setCriteriaFeedback(row.criteriaFeedback);
      }
      if (row.variant === "scoring" && isGeopoliticsEvaluativeExercise(row)) {
        if (
          row.userStakeholderMapping &&
          row.userStakeholderMapping.length > 0
        ) {
          setUserStakeholderMapping(row.userStakeholderMapping);
        }
        setStakeholderMappingRevealed(row.stakeholderMappingRevealed === true);
      }
      if (row.aiPerspective) setPerspectiveText(row.aiPerspective);
      setStep(resumeStep(row.currentStep));
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
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    pendingSave,
    advance,
    finish,
  } = flow;

  const chooseLevel = (next: PracticeLevel) => {
    flow.chooseLevel(next);
    // Task types the new level does not offer fall back to auto.
    if (!EVALUATIVE_LEVELS[next].taskTypes.includes(evaluativeTaskType))
      setEvaluativeTaskType("auto");
  };
  const [entryMode, setEntryMode] = useState<"suggested" | "manual">(
    initialDomain ? "manual" : "suggested",
  );
  const [customScenarioText, setCustomScenarioText] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);

  const [placements, setPlacements] = useState<
    Partial<Record<string, EvaluativeQuadrant>>
  >({});
  const [criterionWeights, setCriterionWeights] = useState<
    Record<string, number>
  >({});
  const [scores, setScores] = useState<Record<string, Record<string, number>>>(
    {},
  );
  const [userProposedCriteria, setUserProposedCriteria] = useState<
    { name: string; rationale: string }[]
  >(() => Array.from({ length: 4 }, () => ({ name: "", rationale: "" })));
  const [criteriaPhase, setCriteriaPhase] = useState<"input" | "compare">(
    "input",
  );
  const [criteriaFeedback, setCriteriaFeedback] =
    useState<EvaluativeCriteriaFeedback | null>(null);
  const [criteriaFeedbackLoading, setCriteriaFeedbackLoading] = useState(false);
  const [userStakeholderMapping, setUserStakeholderMapping] = useState<
    { name: string; wants: string }[]
  >(() => Array.from({ length: 4 }, () => ({ name: "", wants: "" })));
  const [stakeholderMappingRevealed, setStakeholderMappingRevealed] =
    useState(false);

  const [outcomeIntuitionText, setOutcomeIntuitionText] = useState("");
  const [userProbabilities, setUserProbabilities] = useState<
    Record<string, Record<string, number>>
  >({});
  const [userPayoffs, setUserPayoffs] = useState<
    Record<string, Record<string, number>>
  >({});

  const [perspectiveText, setPerspectiveText] = useState<string | null>(null);

  useEffect(() => {
    void listRecentDomains(20).then(setDomainSuggestions);
  }, []);

  useEffect(() => {
    if (resumeId) return;
    const d = initialDomain?.trim();
    if (d) setDomain(d);
  }, [initialDomain, resumeId]);

  const autosave =
    !exercise || step === 0 || step === 7
      ? null
      : () => {
          const scoringEx = exercise.variant === "scoring" ? exercise : null;
          const updated: EvaluativeExerciseRow =
            exercise.variant === "matrix"
              ? { ...exercise, placements, currentStep: step }
              : exercise.variant === "uncertainty"
                ? {
                    ...exercise,
                    userProbabilities,
                    userPayoffs,
                    outcomeIntuitionText,
                    currentStep: step,
                  }
                : {
                    ...exercise,
                    criterionWeights,
                    scores,
                    userStakeholderMapping:
                      scoringEx && isGeopoliticsEvaluativeExercise(scoringEx)
                        ? userStakeholderMapping
                            .map((e) => ({
                              name: e.name.trim(),
                              wants: e.wants.trim(),
                            }))
                            .filter((e) => e.name || e.wants)
                        : scoringEx?.userStakeholderMapping,
                    stakeholderMappingRevealed:
                      scoringEx && isGeopoliticsEvaluativeExercise(scoringEx)
                        ? stakeholderMappingRevealed
                        : scoringEx?.stakeholderMappingRevealed,
                    currentStep: step,
                  };
          void putExercise(updated);
        };
  useDebouncedSave(pendingSave, autosave, 2000, [
    placements,
    scores,
    criterionWeights,
    userStakeholderMapping,
    stakeholderMappingRevealed,
    userProbabilities,
    userPayoffs,
    outcomeIntuitionText,
    step,
  ]);

  const startGenerate = useCallback(
    async (
      domainOverride?: string,
      modeOverride?: "generated" | "custom_scenario",
    ) => {
      setError(null);
      const effectiveSetupMode = modeOverride ?? setupMode;
      const resolved = resolveDomainAndScenario({
        mode: effectiveSetupMode,
        domain: domainOverride ?? domain,
        customScenario: customScenarioText,
      });
      if (!resolved.ok) {
        setError(resolved.error);
        return;
      }
      const { effectiveDomain: d, customScenarioOut } = resolved;
      setLoading(true);
      try {
        const userContext = await getUserContext();
        const languageLevel = await getLanguageLevelForRequest();
        const res = await aiFetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: d,
            userContext: userContext || undefined,
            exerciseType: "evaluative",
            mode: effectiveSetupMode,
            customScenario: customScenarioOut,
            languageLevel,
            evaluativeTaskType,
            level,
          }),
        });
        const json = await safeAiJson<
          | { ok: true; data: EvaluativeExercisePayload }
          | { ok: false; error: string }
        >(res);
        if (!json.ok) {
          setError(json.error);
          return;
        }
        const id = crypto.randomUUID();
        const base = payloadToRow(id, d, json.data, customScenarioOut);
        const row: EvaluativeExerciseRow = {
          ...base,
          // Geopolitics has levels too (PLAN-geopolitics.md G1.1).
          level,
          currentStep: 1,
        };
        await putExercise(row);
        rememberExerciseInUrl(row);
        setExercise(row);
        if (row.variant === "matrix") {
          setPlacements({});
        } else if (row.variant === "uncertainty") {
          setUserProbabilities({});
          setUserPayoffs({});
          setOutcomeIntuitionText("");
        } else {
          const geo = isGeopoliticsEvaluativeExercise(row);
          const w: Record<string, number> = {};
          const s: Record<string, Record<string, number>> = {};
          for (const c of row.criteria) w[c.id] = geo ? 3 : c.suggestedWeight;
          for (const o of row.options) {
            if (geo) {
              s[o.id] = Object.fromEntries(row.criteria.map((c) => [c.id, 3]));
            } else {
              s[o.id] = { ...o.suggestedScores };
            }
          }
          setCriterionWeights(w);
          setScores(s);
        }
        setPerspectiveText(null);
        setPerspectiveStructured(null);
        setTakeaway("");
        setUserProposedCriteria(
          Array.from({ length: 4 }, () => ({ name: "", rationale: "" })),
        );
        setCriteriaPhase("input");
        setCriteriaFeedback(null);
        setCriteriaFeedbackLoading(false);
        setUserStakeholderMapping(
          Array.from({ length: 4 }, () => ({ name: "", wants: "" })),
        );
        setStakeholderMappingRevealed(false);
        setStep(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generate failed");
      } finally {
        setLoading(false);
      }
      // The setters come from useExerciseFlow and never change.
    },
    [
      domain,
      setupMode,
      customScenarioText,
      evaluativeTaskType,
      level,
      setError,
      setExercise,
      setLoading,
      setPerspectiveStructured,
      setStep,
      setTakeaway,
    ],
  );

  const autoGenerateTriggered = useRef(false);
  const [autoGenerateReady, setAutoGenerateReady] = useState(false);
  /** A scenario handed over from the New exercise page; read once (dev runs effects twice). */
  const handoffRead = useRef(false);
  useEffect(() => {
    if (autoGenerateReady || resumeId) return;
    if (!handoffRead.current) {
      handoffRead.current = true;
      const data = takeScenarioHandoff();
      // Show the box that holds the handed-over text.
      if (data) setEntryMode("manual");
      if (data?.source === "custom_scenario" && data.customScenarioText) {
        setSetupMode("custom_scenario");
        setCustomScenarioText(data.customScenarioText);
      }
    }
    setAutoGenerateReady(true);
  }, [autoGenerateReady, resumeId]);

  useEffect(() => {
    if (
      autoGenerateTriggered.current ||
      !autoGenerate ||
      !autoGenerateReady ||
      resumeId
    )
      return;
    const d = initialDomain?.trim();
    if (!d) return;
    autoGenerateTriggered.current = true;
    void startGenerate();
  }, [autoGenerate, autoGenerateReady, initialDomain, resumeId, startGenerate]);

  const regenerate = () => {
    if (Object.keys(placements).length > 0) {
      const ok = window.confirm("Discard current work and regenerate?");
      if (!ok) return;
    }
    setError(null);
    void startGenerate();
  };

  const mergedMatrixExercise = (): EvaluativeMatrixRow | null => {
    if (!exercise || exercise.variant !== "matrix") return null;
    return { ...exercise, placements };
  };

  const mergedScoringExercise = (): EvaluativeScoringRow | null => {
    if (!exercise || exercise.variant !== "scoring") return null;
    const cleaned = userStakeholderMapping
      .map((e) => ({ name: e.name.trim(), wants: e.wants.trim() }))
      .filter((e) => e.name && e.wants);
    return {
      ...exercise,
      criterionWeights,
      scores,
      userStakeholderMapping:
        cleaned.length > 0 ? cleaned : exercise.userStakeholderMapping,
      stakeholderMappingRevealed,
    };
  };

  const matrixReady = () => {
    const ex = mergedMatrixExercise();
    if (!ex) return false;
    return ex.options.every((o) => placements[o.id] != null);
  };

  const mergedUncertaintyExercise = (): EvaluativeUncertaintyRow | null => {
    if (!exercise || exercise.variant !== "uncertainty") return null;
    return {
      ...exercise,
      userProbabilities,
      userPayoffs,
      outcomeIntuitionText,
    };
  };

  const uncertaintyReady = () => {
    const ex = mergedUncertaintyExercise();
    if (!ex) return false;
    return ex.options.every((o) => {
      const probs = o.outcomes.map((out) => userProbabilities[o.id]?.[out.id]);
      const payoffs = o.outcomes.map((out) => userPayoffs[o.id]?.[out.id]);
      if (
        probs.some((p) => typeof p !== "number") ||
        payoffs.some((p) => typeof p !== "number")
      ) {
        return false;
      }
      const sum = probs.reduce<number>((a, b) => a + (b ?? 0), 0);
      return Math.abs(sum - 1) <= EVALUATIVE_UNCERTAINTY_PROBABILITY_EPSILON;
    });
  };

  useEffect(() => {
    if (
      !exercise ||
      exercise.variant === "uncertainty" ||
      criteriaPhase !== "compare" ||
      criteriaFeedback ||
      criteriaFeedbackLoading
    )
      return;
    const cleaned = userProposedCriteria
      .map((c) => ({ name: c.name.trim(), rationale: c.rationale.trim() }))
      .filter((c) => c.name && c.rationale);
    if (cleaned.length < 2) return;
    let cancelled = false;
    setCriteriaFeedbackLoading(true);
    void (async () => {
      try {
        const requestId = crypto.randomUUID();
        const body =
          exercise.variant === "matrix"
            ? {
                requestId,
                variant: "matrix" as const,
                title: exercise.title,
                domain: exercise.domain,
                scenario: exercise.scenario,
                userProposedCriteria: cleaned,
                axisX: exercise.axisX,
                axisY: exercise.axisY,
              }
            : {
                requestId,
                variant: "scoring" as const,
                title: exercise.title,
                domain: exercise.domain,
                scenario: exercise.scenario,
                userProposedCriteria: cleaned,
                criteria: exercise.criteria,
              };
        const res = await aiFetch("/api/ai/evaluative-criteria-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await safeAiJson<
          { ok: true; text: string } | { ok: false; error: string }
        >(res);
        if (cancelled) return;
        if (json.ok) {
          const fb: EvaluativeCriteriaFeedback = {
            text: json.text,
            generatedAt: new Date().toISOString(),
          };
          setCriteriaFeedback(fb);
          const updated = { ...exercise, criteriaFeedback: fb };
          setExercise(updated);
          void putExercise(updated);
        }
      } catch {
        // Non-blocking: criteria feedback failures don't block the flow.
      } finally {
        if (!cancelled) setCriteriaFeedbackLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // criteriaFeedbackLoading is intentionally excluded: it's set synchronously above, and
    // including it here would re-trigger this effect mid-flight, tearing down (cancelling)
    // the very request it just started before it can resolve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, criteriaPhase, criteriaFeedback]);

  const submitPerspective = async () => {
    const ex = exercise;
    if (!ex) return;
    if (perspectiveText != null) {
      advance(4);
      return;
    }
    if (ex.variant === "matrix" && !matrixReady()) {
      setError("Place every option in a quadrant.");
      return;
    }
    if (ex.variant === "uncertainty" && !uncertaintyReady()) {
      setError(
        "For each option, your outcome probabilities must sum to 100% and every outcome needs a payoff.",
      );
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const userContext = await getUserContext();
      const kind =
        ex.variant === "matrix"
          ? "evaluative-matrix"
          : ex.variant === "uncertainty"
            ? "evaluative-uncertainty"
            : "evaluative-scoring";
      const body =
        ex.variant === "matrix"
          ? {
              kind,
              title: ex.title,
              domain: ex.domain,
              confidenceBefore: confidence,
              exercise: mergedMatrixExercise(),
              userContext: userContext || undefined,
            }
          : ex.variant === "uncertainty"
            ? {
                kind,
                title: ex.title,
                domain: ex.domain,
                confidenceBefore: confidence,
                exercise: mergedUncertaintyExercise(),
                userContext: userContext || undefined,
              }
            : {
                kind,
                title: ex.title,
                domain: ex.domain,
                confidenceBefore: confidence,
                exercise: mergedScoringExercise(),
                userContext: userContext || undefined,
              };
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await safeAiJson<unknown>(res);
      const parsed = parsePerspectiveFetchJson(raw, kind);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      setPerspectiveText(parsed.text);
      setPerspectiveStructured(parsed.structured);
      const partial: EvaluativeExerciseRow =
        ex.variant === "matrix"
          ? {
              ...ex,
              placements,
              confidenceBefore: confidence,
              aiPerspective: parsed.text,
              aiPerspectiveStructured: parsed.structured,
              currentStep: 4,
            }
          : ex.variant === "uncertainty"
            ? {
                ...ex,
                userProbabilities,
                userPayoffs,
                outcomeIntuitionText,
                confidenceBefore: confidence,
                aiPerspective: parsed.text,
                aiPerspectiveStructured: parsed.structured,
                currentStep: 4,
              }
            : {
                ...ex,
                criterionWeights,
                scores,
                userStakeholderMapping:
                  ex.variant === "scoring"
                    ? (mergedScoringExercise()?.userStakeholderMapping ??
                      ex.userStakeholderMapping)
                    : undefined,
                stakeholderMappingRevealed,
                confidenceBefore: confidence,
                aiPerspective: parsed.text,
                aiPerspectiveStructured: parsed.structured,
                currentStep: 4,
              };
      const scored = {
        ...partial,
        result: scoreEvaluative(partial),
      } as EvaluativeExerciseRow;
      await putExercise(scored);
      setExercise(scored);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perspective failed");
    } finally {
      setLoading(false);
    }
  };

  const weightedRowTotal = (optionId: string) => {
    const ex = exercise;
    if (!ex || ex.variant !== "scoring") return 0;
    let num = 0;
    let den = 0;
    for (const c of ex.criteria) {
      const w = criterionWeights[c.id] ?? 1;
      const s = scores[optionId]?.[c.id] ?? 3;
      num += w * s;
      den += w;
    }
    if (den === 0) return 0;
    return num / den;
  };

  /** Finish the 3-step loop: save the exercise with the optional takeaway (P2.2). */
  const finishExercise = async () => {
    if (!exercise || !perspectiveText || finishing) return;
    setError(null);
    const struct =
      perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null;
    const finalEx: EvaluativeExerciseRow =
      exercise.variant === "matrix"
        ? {
            ...exercise,
            placements,
            confidenceBefore: confidence,
            aiPerspective: perspectiveText,
            aiPerspectiveStructured: struct,
          }
        : exercise.variant === "uncertainty"
          ? {
              ...exercise,
              userProbabilities,
              userPayoffs,
              outcomeIntuitionText,
              confidenceBefore: confidence,
              aiPerspective: perspectiveText,
              aiPerspectiveStructured: struct,
            }
          : {
              ...exercise,
              criterionWeights,
              scores,
              userStakeholderMapping:
                mergedScoringExercise()?.userStakeholderMapping ??
                exercise.userStakeholderMapping,
              stakeholderMappingRevealed,
              confidenceBefore: confidence,
              aiPerspective: perspectiveText,
              aiPerspectiveStructured: struct,
            };
    await finish(finalEx);
  };

  const scoringBreakdown = useMemo<
    EvaluativeScoringCriterionBreakdown[] | undefined
  >(() => {
    if (!exercise || exercise.variant !== "scoring") return undefined;
    return exercise.criteria.map((c) => ({
      criterionId: c.id,
      criterionLabel: c.label,
      userWeight: criterionWeights[c.id] ?? c.suggestedWeight,
      aiSuggestedWeight: c.suggestedWeight,
      optionScores: exercise.options.map((o) => ({
        optionId: o.id,
        optionTitle: o.title,
        userScore: scores[o.id]?.[c.id] ?? 3,
        aiSuggestedScore: o.suggestedScores[c.id],
      })),
    }));
  }, [exercise, criterionWeights, scores]);

  const perspectiveHighlightTerms = useMemo<string[] | undefined>(() => {
    if (!exercise) return undefined;
    const optionTitles = exercise.options.map((o) => o.title);
    const labels =
      exercise.variant === "scoring"
        ? exercise.criteria.map((c) => c.label)
        : exercise.variant === "matrix"
          ? [exercise.axisX.label, exercise.axisY.label]
          : [];
    return [...optionTitles, ...labels].filter(Boolean);
  }, [exercise]);

  const isGeoExercise = exercise
    ? isGeopoliticsEvaluativeExercise(exercise)
    : false;
  const evaluativeFeedback =
    perspectiveStructured ?? exercise?.aiPerspectiveStructured ?? null;
  // Older rows have no level: they had the criteria list (Standard).
  // Geopolitics rows made before levels ran at Expert.
  const exerciseLevel: PracticeLevel = exercise
    ? (exercise.level ?? (isGeoExercise ? "expert" : "standard"))
    : level;
  const exLevel = EVALUATIVE_LEVELS[exerciseLevel];
  // Internal steps 1-2 are the two parts of the work; 4 is AI feedback, 7 saved.
  const partLabels =
    exercise?.variant === "uncertainty"
      ? EVALUATIVE_UNCERTAINTY_STEP_LABELS
      : isGeoExercise
        ? GEOPOLITICS_EVALUATIVE_STEP_LABELS
        : EVALUATIVE_EXERCISE_STEP_LABELS;
  const phase = practicePhase(step, FEEDBACK_STEP);
  const partLabel =
    phase === 1 ? `Part ${step} of 2 · ${partLabels[step]}` : undefined;

  return {
    domain,
    setDomain,
    setupMode,
    setSetupMode,
    evaluativeTaskType,
    setEvaluativeTaskType,
    entryMode,
    setEntryMode,
    customScenarioText,
    setCustomScenarioText,
    domainSuggestions,
    setDomainSuggestions,
    placements,
    setPlacements,
    criterionWeights,
    setCriterionWeights,
    scores,
    setScores,
    userProposedCriteria,
    setUserProposedCriteria,
    criteriaPhase,
    setCriteriaPhase,
    criteriaFeedback,
    setCriteriaFeedback,
    criteriaFeedbackLoading,
    setCriteriaFeedbackLoading,
    userStakeholderMapping,
    setUserStakeholderMapping,
    stakeholderMappingRevealed,
    setStakeholderMappingRevealed,
    outcomeIntuitionText,
    setOutcomeIntuitionText,
    userProbabilities,
    setUserProbabilities,
    userPayoffs,
    setUserPayoffs,
    perspectiveText,
    setPerspectiveText,
    autoGenerateReady,
    setAutoGenerateReady,
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
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    pendingSave,
    advance,
    finish,
    flow,
    chooseLevel,
    autosave,
    startGenerate,
    autoGenerateTriggered,
    handoffRead,
    regenerate,
    mergedMatrixExercise,
    mergedScoringExercise,
    matrixReady,
    mergedUncertaintyExercise,
    uncertaintyReady,
    submitPerspective,
    weightedRowTotal,
    finishExercise,
    scoringBreakdown,
    perspectiveHighlightTerms,
    isGeoExercise,
    evaluativeFeedback,
    exerciseLevel,
    exLevel,
    partLabels,
    phase,
    partLabel,
  };
}

export type EvaluativeFlowState = ReturnType<typeof useEvaluativeFlow>;
