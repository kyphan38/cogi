"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  practicePhase,
  GEOPOLITICS_SYSTEMS_STEP_LABELS,
  SYSTEMS_EXERCISE_STEP_LABELS,
  SYSTEMS_RESILIENCE_STEP_LABELS,
} from "@/components/shared/ExerciseShell";
import { linkTypesFor } from "@/lib/exercise/systems-labels";
import { SYSTEMS_LEVELS } from "@/lib/exercise/systems-levels";
import { type PracticeLevel } from "@/lib/exercise/levels";
import { scoreSystems, withFairExtras } from "@/lib/exercise/systems-score";
import { isCoachingStructured } from "@/lib/types/perspective";
import type {
  SystemsExerciseRow,
  SystemsLookAhead,
  SystemsNodeImpact,
  SystemsTaskType,
  SystemsUserEdge,
} from "@/lib/types/exercise";
import type { SystemsConnectionType } from "@/lib/ai/validators/systems";
import {
  isGeopoliticsSystemsPayload,
  isResilienceSystemsPayload,
  type GeopoliticsSystemsExercisePayload,
  type SystemsExercisePayload,
  type SystemsResilienceExercisePayload,
} from "@/lib/ai/validators/systems";
import { isGeopoliticsAnalyticalDomain } from "@/lib/exercise/geopolitics-domains";
import { getLanguageLevelForRequest } from "@/lib/db/settings";
import { getUserContext } from "@/lib/db/settings";
import {
  useDebouncedSave,
  useExerciseFlow,
} from "@/components/exercises/flow/useExerciseFlow";
import { takeScenarioHandoff } from "@/lib/topics/scenario-handoff";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import { listRecentDomains, putExercise } from "@/lib/db/exercises";
import { rememberExerciseInUrl } from "@/lib/nav/exercise-url";
import { isSystemsExercise } from "@/lib/types/exercise";
import { resolveDomainAndScenario } from "@/lib/ai/prompts/scenario-steering";
import {
  EMPTY_LOOK_AHEAD,
  FlowStep,
  isGeopoliticsSystemsExercise,
  isResilienceSystemsExercise,
  systemsVariantSteps,
  systemsResumeStep,
  emptyImpact,
} from "@/components/exercises/systems/shared";

/** State, effects and actions of the Systems flow; the steps only render. */
export function useSystemsFlow({
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
  const [entryMode, setEntryMode] = useState<"suggested" | "manual">(
    initialDomain ? "manual" : "suggested",
  );
  const [customScenarioText, setCustomScenarioText] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);

  const [systemsTaskType, setSystemsTaskType] =
    useState<SystemsTaskType>("auto");
  const flow = useExerciseFlow<SystemsExerciseRow, FlowStep>({
    type: "systems",
    resumeId,
    isRow: isSystemsExercise,
    onResume: (row) => {
      setUserEdges(row.userEdges ?? []);
      setNodeImpact(row.nodeImpact ?? {});
      setImpactVia(row.impactVia ?? {});
      setUserCriticalityRanking(row.userCriticalityRanking ?? {});
      setSecondNodeImpact(row.secondNodeImpact ?? {});
      if (row.userProposedComponents && row.userProposedComponents.length > 0) {
        setUserProposedComponents(row.userProposedComponents);
        setDecomposePhase("compare");
      }
      if (row.aiPerspective) setPerspectiveText(row.aiPerspective);
      setUserPerspectiveBNotes(row.userPerspectiveBNotes ?? "");
      setLookAhead(row.lookAhead ?? EMPTY_LOOK_AHEAD);
      setLifeExample(row.lifeExample ?? "");
      setStep(systemsResumeStep(row));
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

  const [userEdges, setUserEdges] = useState<SystemsUserEdge[]>([]);
  const [nodeImpact, setNodeImpact] = useState<
    Record<string, SystemsNodeImpact>
  >({});
  /** Indirect node -> the node the shock comes through (PLAN-learning.md L4). */
  const [impactVia, setImpactVia] = useState<Record<string, string>>({});
  const [userCriticalityRanking, setUserCriticalityRanking] = useState<
    Record<string, number>
  >({});
  const [secondNodeImpact, setSecondNodeImpact] = useState<
    Record<string, SystemsNodeImpact>
  >({});
  const [userProposedComponents, setUserProposedComponents] = useState<
    string[]
  >([]);
  const [decomposePhase, setDecomposePhase] = useState<"input" | "compare">(
    "input",
  );

  const [perspectiveText, setPerspectiveText] = useState<string | null>(null);

  const [lookAhead, setLookAhead] =
    useState<SystemsLookAhead>(EMPTY_LOOK_AHEAD);
  const [lifeExample, setLifeExample] = useState("");
  const [userPerspectiveBNotes, setUserPerspectiveBNotes] = useState("");

  useEffect(() => {
    void listRecentDomains(20).then(setDomainSuggestions);
  }, []);

  const chooseLevel = (next: PracticeLevel) => {
    flow.chooseLevel(next);
    // Task types the new level does not offer fall back to auto.
    if (!SYSTEMS_LEVELS[next].taskTypes.includes(systemsTaskType))
      setSystemsTaskType("auto");
  };

  useEffect(() => {
    if (resumeId) return;
    const d = initialDomain?.trim();
    if (d) setDomain(d);
  }, [initialDomain, resumeId]);

  const autosave =
    !exercise || step === 0 || step === systemsVariantSteps(exercise).doneStep
      ? null
      : () => {
          void putExercise({
            ...exercise,
            userEdges,
            nodeImpact,
            impactVia,
            secondNodeImpact,
            userCriticalityRanking,
            currentStep: step,
          });
        };
  useDebouncedSave(pendingSave, autosave, 2000, [
    userEdges,
    nodeImpact,
    impactVia,
    secondNodeImpact,
    userCriticalityRanking,
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
            exerciseType: "systems",
            mode: effectiveSetupMode,
            customScenario: customScenarioOut,
            languageLevel,
            systemsTaskType,
          }),
        });
        const json = await safeAiJson<
          | {
              ok: true;
              data:
                | SystemsExercisePayload
                | GeopoliticsSystemsExercisePayload
                | SystemsResilienceExercisePayload;
            }
          | { ok: false; error: string }
        >(res);
        if (!json.ok) {
          setError(json.error);
          return;
        }
        const data = json.data;
        const resilienceData = isResilienceSystemsPayload(data) ? data : null;
        const isGeo =
          !resilienceData &&
          (isGeopoliticsSystemsPayload(data) ||
            isGeopoliticsAnalyticalDomain(d));
        const geoData = isGeopoliticsSystemsPayload(data)
          ? (data as GeopoliticsSystemsExercisePayload)
          : null;
        const id = crypto.randomUUID();
        const ids = data.nodes.map((n) => n.id);
        const row: SystemsExerciseRow = {
          id,
          type: "systems",
          domain: d,
          customScenario: customScenarioOut,
          title: data.title,
          scenario: data.scenario,
          nodes: data.nodes,
          intendedConnections: data.intendedConnections,
          shockEvent: data.shockEvent,
          archetype: data.archetype,
          componentCandidates: data.componentCandidates,
          isGeopolitics: isGeo,
          perspectiveAName: geoData?.perspectiveAName,
          perspectiveBName: geoData?.perspectiveBName,
          intendedConnectionsB: geoData?.intendedConnectionsB,
          shockEventB: geoData?.shockEventB,
          variantKind: resilienceData ? "resilience" : undefined,
          criticalityGroundTruth: resilienceData?.criticalityGroundTruth,
          secondShockEvent: resilienceData?.secondShockEvent,
          userProposedComponents: null,
          userEdges: [],
          nodeImpact: emptyImpact(ids),
          secondNodeImpact: resilienceData ? emptyImpact(ids) : undefined,
          userCriticalityRanking: resilienceData ? {} : undefined,
          // Geopolitics has levels too (PLAN-geopolitics.md G1.1); Guided keeps to one perspective.
          level,
          confidenceBefore: null,
          aiPerspective: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
          currentStep: 1,
        };
        await putExercise(row);
        rememberExerciseInUrl(row);
        setExercise(row);
        setUserEdges([]);
        setNodeImpact(emptyImpact(ids));
        setImpactVia({});
        setUserCriticalityRanking({});
        setSecondNodeImpact(resilienceData ? emptyImpact(ids) : {});
        setUserProposedComponents([]);
        setDecomposePhase("input");
        setPerspectiveText(null);
        setPerspectiveStructured(null);
        setTakeaway("");
        setLookAhead(EMPTY_LOOK_AHEAD);
        setLifeExample("");
        setUserPerspectiveBNotes("");
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
      systemsTaskType,
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
    if (userEdges.length > 0) {
      const ok = window.confirm("Discard current work and regenerate?");
      if (!ok) return;
    }
    setError(null);
    void startGenerate();
  };

  const linkTypes = linkTypesFor(exercise?.intendedConnections ?? []);
  const nodeLabel = (id: string) =>
    exercise?.nodes.find((n) => n.id === id)?.label ?? id;

  const setEdgeType = (edgeId: string, type: SystemsConnectionType) => {
    setUserEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, type } : e)),
    );
  };

  const fetchSystemsPerspective = async (notes?: string): Promise<boolean> => {
    if (!exercise) return false;
    const userContext = await getUserContext();
    const { isResilience, perspectiveStep } = systemsVariantSteps(exercise);
    const res = await aiFetch("/api/ai/perspective", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "systems",
        title: exercise.title,
        domain: exercise.domain,
        scenario: exercise.scenario,
        nodes: exercise.nodes,
        intendedConnections: exercise.intendedConnections,
        shockEvent: exercise.shockEvent,
        userEdges,
        nodeImpact,
        impactVia,
        userProposedComponents: exercise.userProposedComponents ?? null,
        confidenceBefore: confidence,
        userContext: userContext || undefined,
        perspectiveAName: exercise.perspectiveAName,
        perspectiveBName: exercise.perspectiveBName,
        intendedConnectionsB: exercise.intendedConnectionsB,
        shockEventB: exercise.shockEventB,
        userPerspectiveBNotes: notes ?? exercise.userPerspectiveBNotes,
        variantKind: isResilience ? exercise.variantKind : undefined,
        criticalityGroundTruth: isResilience
          ? exercise.criticalityGroundTruth
          : undefined,
        userCriticalityRanking: isResilience
          ? userCriticalityRanking
          : undefined,
        secondShockEvent: isResilience ? exercise.secondShockEvent : undefined,
        lookAhead,
        archetype: exercise.archetype,
      }),
    });
    const json = await safeAiJson<unknown>(res);
    const parsed = parsePerspectiveFetchJson(json, "systems");
    if (!parsed.ok) {
      setError(parsed.error);
      return false;
    }
    setPerspectiveText(parsed.text);
    setPerspectiveStructured(parsed.structured);
    const partial: SystemsExerciseRow = {
      ...exercise,
      userEdges,
      nodeImpact,
      impactVia,
      confidenceBefore: confidence,
      userPerspectiveBNotes: notes ?? exercise.userPerspectiveBNotes,
      lookAhead,
      result: withFairExtras(
        scoreSystems({
          nodes: exercise.nodes,
          intendedConnections: exercise.intendedConnections,
          shockEvent: exercise.shockEvent,
          userEdges,
          nodeImpact,
          impactVia,
        }),
        isCoachingStructured(parsed.structured) ? parsed.structured.items : [],
      ),
      aiPerspective: parsed.text,
      aiPerspectiveStructured: parsed.structured,
      currentStep: perspectiveStep,
      ...(isResilience ? { secondNodeImpact, userCriticalityRanking } : {}),
    };
    await putExercise(partial);
    setExercise(partial);
    setStep(perspectiveStep);
    return true;
  };

  const finishShockStep = async () => {
    if (!exercise) return;
    setError(null);
    if (!lookAhead.forecast.trim() || !lookAhead.fix.trim()) {
      setError("Look ahead: write what happens in 5 years and a better fix.");
      return;
    }
    const partial: SystemsExerciseRow = {
      ...exercise,
      userEdges,
      nodeImpact,
      impactVia,
      lookAhead,
      confidenceBefore: confidence,
    };
    if (isResilienceSystemsExercise(exercise)) {
      const { cascadeStep } = systemsVariantSteps(exercise);
      await putExercise({ ...partial, currentStep: cascadeStep });
      setExercise({ ...partial, currentStep: cascadeStep });
      advance(cascadeStep, { ...partial, currentStep: cascadeStep });
      return;
    }
    // Guided geopolitics stays with one perspective: straight to feedback.
    if (isGeopoliticsSystemsExercise(exercise) && exercise.level !== "guided") {
      await putExercise({ ...partial, currentStep: 5 });
      setExercise({ ...partial, currentStep: 5 });
      advance(5, { ...partial, currentStep: 5 });
      return;
    }
    setLoading(true);
    try {
      const ok = await fetchSystemsPerspective();
      if (!ok) return;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perspective failed");
    } finally {
      setLoading(false);
    }
  };

  const finishCascadeStep = async () => {
    if (!exercise) return;
    setError(null);
    setLoading(true);
    try {
      const ok = await fetchSystemsPerspective();
      if (!ok) return;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perspective failed");
    } finally {
      setLoading(false);
    }
  };

  const submitSwapAndPerspective = async () => {
    if (!exercise) return;
    if (!exercise.revealedB) {
      setError(
        `Predict ${exercise.perspectiveBName ?? "the other actor"}'s view first, then show it.`,
      );
      return;
    }
    const typed = userPerspectiveBNotes.trim();
    if (typed.length < 40) {
      setError(
        "Describe how the second perspective differs (at least 40 characters).",
      );
      return;
    }
    if (perspectiveText != null) {
      advance(6);
      return;
    }
    // The prediction goes to the coach with the notes, so it can comment on it.
    const predicted = exercise.predictedDirectB ?? [];
    const label = (id: string) =>
      exercise.nodes.find((n) => n.id === id)?.label ?? id;
    const actual = exercise.shockEventB?.directlyAffected ?? [];
    const notes = predicted.length
      ? `${typed}\n\n(Before seeing ${exercise.perspectiveBName ?? "B"}'s map, I predicted the shock hits directly: ${predicted.map(label).join(", ")}. Their map says: ${actual.map(label).join(", ")}.)`
      : typed;
    setError(null);
    setLoading(true);
    try {
      const partial: SystemsExerciseRow = {
        ...exercise,
        userEdges,
        nodeImpact,
        impactVia,
        userPerspectiveBNotes: typed,
      };
      setExercise(partial);
      await fetchSystemsPerspective(notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perspective failed");
    } finally {
      setLoading(false);
    }
  };

  /** Finish the 3-step loop: save the exercise with the optional takeaway (P2.2). */
  const finishExercise = async () => {
    if (!exercise || !perspectiveText || finishing) return;
    setError(null);
    const isResilience = isResilienceSystemsExercise(exercise);
    const finalEx: SystemsExerciseRow = {
      ...exercise,
      userEdges,
      nodeImpact,
      impactVia,
      userProposedComponents: exercise.userProposedComponents ?? null,
      confidenceBefore: confidence,
      lookAhead,
      lifeExample: lifeExample.trim() || null,
      aiPerspective: perspectiveText,
      aiPerspectiveStructured:
        perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null,
      ...(isResilience ? { secondNodeImpact, userCriticalityRanking } : {}),
    };
    await finish(finalEx, systemsVariantSteps(exercise).doneStep);
  };

  const isGeoExercise = exercise
    ? isGeopoliticsSystemsExercise(exercise)
    : false;
  const isResilienceExercise = exercise
    ? isResilienceSystemsExercise(exercise)
    : false;
  const {
    criticalityStep,
    confidenceStep,
    shockStep,
    cascadeStep,
    perspectiveStep,
    doneStep,
  } = systemsVariantSteps(exercise);
  const variantLabels: readonly string[] = isResilienceExercise
    ? SYSTEMS_RESILIENCE_STEP_LABELS
    : isGeoExercise
      ? GEOPOLITICS_SYSTEMS_STEP_LABELS
      : SYSTEMS_EXERCISE_STEP_LABELS;
  // Work parts are the steps between setup and AI feedback, minus the old confidence step.
  // Guided geopolitics skips the perspective swap (step 5).
  const skipSwap = isGeoExercise && exercise?.level === "guided";
  const workParts = variantLabels
    .slice(1, perspectiveStep)
    .filter((_, i) => i + 1 !== confidenceStep && !(skipSwap && i + 1 === 5));
  const phase = practicePhase(step, perspectiveStep);
  const partIndex = workParts.indexOf(variantLabels[step]);
  const partLabel =
    phase === 1 && partIndex >= 0
      ? `Part ${partIndex + 1} of ${workParts.length} · ${workParts[partIndex]}`
      : undefined;
  const systemsFeedback =
    perspectiveStructured ?? exercise?.aiPerspectiveStructured ?? null;
  // Older rows have no level: they had the component list and no other hints (Standard).
  // Geopolitics rows made before levels ran at Expert.
  const exerciseLevel: PracticeLevel = exercise
    ? (exercise.level ?? (isGeoExercise ? "expert" : "standard"))
    : level;
  const exLevel = SYSTEMS_LEVELS[exerciseLevel];

  return {
    domain,
    setDomain,
    setupMode,
    setSetupMode,
    entryMode,
    setEntryMode,
    customScenarioText,
    setCustomScenarioText,
    domainSuggestions,
    setDomainSuggestions,
    systemsTaskType,
    setSystemsTaskType,
    userEdges,
    setUserEdges,
    nodeImpact,
    setNodeImpact,
    impactVia,
    setImpactVia,
    userCriticalityRanking,
    setUserCriticalityRanking,
    secondNodeImpact,
    setSecondNodeImpact,
    userProposedComponents,
    setUserProposedComponents,
    decomposePhase,
    setDecomposePhase,
    perspectiveText,
    setPerspectiveText,
    lookAhead,
    setLookAhead,
    lifeExample,
    setLifeExample,
    userPerspectiveBNotes,
    setUserPerspectiveBNotes,
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
    criticalityStep,
    confidenceStep,
    shockStep,
    cascadeStep,
    perspectiveStep,
    doneStep,
    flow,
    chooseLevel,
    autosave,
    startGenerate,
    autoGenerateTriggered,
    handoffRead,
    regenerate,
    linkTypes,
    nodeLabel,
    setEdgeType,
    fetchSystemsPerspective,
    finishShockStep,
    finishCascadeStep,
    submitSwapAndPerspective,
    finishExercise,
    isGeoExercise,
    isResilienceExercise,
    variantLabels,
    skipSwap,
    workParts,
    phase,
    partIndex,
    partLabel,
    systemsFeedback,
    exerciseLevel,
    exLevel,
  };
}

export type SystemsFlowState = ReturnType<typeof useSystemsFlow>;
