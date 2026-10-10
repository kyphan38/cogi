"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ExerciseShell,
  practicePhase,
  practiceStepLabels,
  GEOPOLITICS_SYSTEMS_STEP_LABELS,
  SYSTEMS_EXERCISE_STEP_LABELS,
  SYSTEMS_RESILIENCE_STEP_LABELS,
} from "@/components/shared/ExerciseShell";
import { SystemsFlowCanvas } from "@/components/exercises/SystemsFlowCanvas";
import { SystemsPerspectiveCompare } from "@/components/exercises/SystemsPerspectiveCompare";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { AIPerspective } from "@/components/shared/AIPerspective";
import { SystemsAnswerKey } from "@/components/exercises/SystemsAnswerKey";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import { LinkTypeGuide } from "@/components/exercises/LinkTypeGuide";
import { LevelSuggestionCard } from "@/components/shared/LevelSuggestionCard";
import { useToast } from "@/components/ui/toast";
import { SYSTEMS_LEVELS } from "@/lib/exercise/systems-levels";
import {
  DEFAULT_PRACTICE_LEVEL,
  LEVEL_LABELS,
  type LevelSuggestion,
  type PracticeLevel,
} from "@/lib/exercise/levels";
import { levelSuggestionFor } from "@/lib/exercise/level-suggestion";
import { dismissLevelSuggestion, getPracticeLevel, setPracticeLevel } from "@/lib/db/settings";
import { scoreSystems, systemsResultOf } from "@/lib/exercise/systems-score";
import { isCoachingStructured } from "@/lib/types/perspective";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  SystemsExerciseRow,
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
import { completePracticeExercise } from "@/lib/db/complete-exercise";
import { useSaveOnLeave } from "@/lib/hooks/useSaveOnLeave";
import { takeScenarioHandoff } from "@/lib/topics/scenario-handoff";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import { DomainInput } from "@/components/shared/DomainInput";
import { TopicSuggestionPicker } from "@/components/shared/TopicSuggestionPicker";
import { listRecentDomains, putExercise, getExercise } from "@/lib/db/exercises";
import { rememberExerciseInUrl } from "@/lib/nav/exercise-url";
import { isSystemsExercise } from "@/lib/types/exercise";
import { resolveDomainAndScenario } from "@/lib/ai/prompts/scenario-steering";

const EDGE_TYPES: SystemsConnectionType[] = [
  "depends_on",
  "conflicts_with",
  "enables",
  "risks",
];

type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

function isGeopoliticsSystemsExercise(ex: SystemsExerciseRow): boolean {
  return (
    ex.isGeopolitics ??
    Boolean(
      ex.perspectiveBName?.trim() &&
        ex.intendedConnectionsB?.length &&
        ex.shockEventB,
    )
  );
}

function isResilienceSystemsExercise(ex: SystemsExerciseRow): boolean {
  return ex.variantKind === "resilience";
}

/** Resilience inserts a "Criticality" step after Connect and a "Cascade" step after the first
 * shock; geopolitics inserts a "Perspective swap" step after the first shock. The two variants
 * are mutually exclusive, so each row is at most one of isGeo/isResilience. */
function systemsVariantSteps(ex: SystemsExerciseRow | null): {
  isGeo: boolean;
  isResilience: boolean;
  criticalityStep: FlowStep;
  confidenceStep: FlowStep;
  shockStep: FlowStep;
  cascadeStep: FlowStep;
  perspectiveStep: FlowStep;
  journalStep: FlowStep;
  actionStep: FlowStep;
  doneStep: FlowStep;
} {
  const isGeo = ex ? isGeopoliticsSystemsExercise(ex) : false;
  const isResilience = ex ? isResilienceSystemsExercise(ex) : false;
  return {
    isGeo,
    isResilience,
    criticalityStep: 3,
    confidenceStep: isResilience ? 4 : 3,
    shockStep: isResilience ? 5 : 4,
    cascadeStep: 6,
    perspectiveStep: isResilience ? 7 : isGeo ? 6 : 5,
    journalStep: isResilience ? 8 : isGeo ? 7 : 6,
    actionStep: isResilience ? 9 : isGeo ? 8 : 7,
    doneStep: isResilience ? 10 : isGeo ? 9 : 8,
  };
}

/**
 * Where an unfinished exercise reopens. Saved before the 3-step loop it may sit on a
 * step that no longer exists: confidence now lives in the shock step, and journal /
 * action fold into AI feedback.
 */
function systemsResumeStep(row: SystemsExerciseRow): FlowStep {
  const { confidenceStep, shockStep, perspectiveStep, journalStep, actionStep } = systemsVariantSteps(row);
  const saved = (row.currentStep ?? 1) as FlowStep;
  if (saved === confidenceStep) return shockStep;
  if (saved === journalStep || saved === actionStep) return perspectiveStep;
  return saved;
}

function emptyImpact(nodeIds: string[]): Record<string, SystemsNodeImpact> {
  const o: Record<string, SystemsNodeImpact> = {};
  for (const id of nodeIds) o[id] = "none";
  return o;
}

function cycleImpact(v: SystemsNodeImpact): SystemsNodeImpact {
  if (v === "none") return "direct";
  if (v === "direct") return "indirect";
  return "none";
}

export function SystemsExerciseFlow({
  resumeId,
  initialDomain,
  initialSource,
  autoGenerate,
}: { resumeId?: string; initialDomain?: string; initialSource?: "generated" | "real_data" | "custom_scenario"; autoGenerate?: boolean } = {}) {
  const [step, setStep] = useState<FlowStep>(0);
  const [domain, setDomain] = useState(initialDomain?.trim() ?? "");
  const [setupMode, setSetupMode] = useState<"generated" | "custom_scenario">(
    initialSource === "custom_scenario" ? "custom_scenario" : "generated",
  );
  const [entryMode, setEntryMode] = useState<"suggested" | "manual">(initialDomain ? "manual" : "suggested");
  const [customScenarioText, setCustomScenarioText] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [systemsTaskType, setSystemsTaskType] = useState<SystemsTaskType>("auto");
  const [level, setLevel] = useState<PracticeLevel>(DEFAULT_PRACTICE_LEVEL);
  const { show: showToast } = useToast();
  const [levelSuggestion, setLevelSuggestion] = useState<LevelSuggestion>(null);

  const [exercise, setExercise] = useState<SystemsExerciseRow | null>(null);
  const [userEdges, setUserEdges] = useState<SystemsUserEdge[]>([]);
  const [nodeImpact, setNodeImpact] = useState<Record<string, SystemsNodeImpact>>({});
  /** Indirect node -> the node the shock comes through (PLAN-learning.md L4). */
  const [impactVia, setImpactVia] = useState<Record<string, string>>({});
  const [userCriticalityRanking, setUserCriticalityRanking] = useState<Record<string, number>>(
    {},
  );
  const [secondNodeImpact, setSecondNodeImpact] = useState<Record<string, SystemsNodeImpact>>(
    {},
  );
  const [userProposedComponents, setUserProposedComponents] = useState<string[]>([]);
  const [decomposePhase, setDecomposePhase] = useState<"input" | "compare">("input");

  const [confidence, setConfidence] = useState(50);
  const [perspectiveText, setPerspectiveText] = useState<string | null>(null);
  const [perspectiveStructured, setPerspectiveStructured] =
    useState<AIPerspectiveStructured | null>(null);

  const [takeaway, setTakeaway] = useState("");
  const [finishing, setFinishing] = useState(false);
  const pendingSave = useSaveOnLeave();
  const [userPerspectiveBNotes, setUserPerspectiveBNotes] = useState("");

  useEffect(() => {
    void listRecentDomains(20).then(setDomainSuggestions);
    void getPracticeLevel("systems").then(setLevel);
  }, []);

  const chooseLevel = (next: PracticeLevel) => {
    setLevel(next);
    void setPracticeLevel("systems", next);
    // Task types the new level does not offer fall back to auto.
    if (!SYSTEMS_LEVELS[next].taskTypes.includes(systemsTaskType)) setSystemsTaskType("auto");
  };

  const advance = useCallback(
    (next: FlowStep, updatedRow?: SystemsExerciseRow) => {
      const row = updatedRow ?? exercise;
      if (row) void putExercise({ ...row, currentStep: next });
      setStep(next);
    },
    [exercise],
  );

  useEffect(() => {
    if (!resumeId) return;
    void (async () => {
      const row = await getExercise(resumeId);
      if (!row || row.completedAt || !isSystemsExercise(row)) return;
      setExercise(row);
      setUserEdges(row.userEdges ?? []);
      setNodeImpact(row.nodeImpact ?? {});
      setImpactVia(row.impactVia ?? {});
      setUserCriticalityRanking(row.userCriticalityRanking ?? {});
      setSecondNodeImpact(row.secondNodeImpact ?? {});
      if (row.userProposedComponents && row.userProposedComponents.length > 0) {
        setUserProposedComponents(row.userProposedComponents);
        setDecomposePhase("compare");
      }
      setConfidence(row.confidenceBefore ?? 50);
      if (row.aiPerspective) setPerspectiveText(row.aiPerspective);
      if (row.aiPerspectiveStructured) setPerspectiveStructured(row.aiPerspectiveStructured ?? null);
      setUserPerspectiveBNotes(row.userPerspectiveBNotes ?? "");
      setTakeaway(row.takeaway ?? "");
      setStep(systemsResumeStep(row));
    })();
  }, [resumeId]);

  useEffect(() => {
    if (resumeId) return;
    const d = initialDomain?.trim();
    if (d) setDomain(d);
  }, [initialDomain, resumeId]);

  useEffect(() => {
    const { doneStep } = systemsVariantSteps(exercise);
    if (!exercise || step === 0 || step === doneStep) {
      pendingSave.clear();
      return;
    }
    const save = () => {
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
    pendingSave.set(save);
    const timer = setTimeout(() => {
      pendingSave.clear();
      save();
    }, 2000);
    return () => clearTimeout(timer);
  }, [userEdges, nodeImpact, impactVia, secondNodeImpact, userCriticalityRanking, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const startGenerate = useCallback(async (
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
        (isGeopoliticsSystemsPayload(data) || isGeopoliticsAnalyticalDomain(d));
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
      setUserPerspectiveBNotes("");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  }, [domain, setupMode, customScenarioText, systemsTaskType, level]);

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
    if (autoGenerateTriggered.current || !autoGenerate || !autoGenerateReady || resumeId) return;
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

  const setEdgeType = (edgeId: string, type: SystemsConnectionType) => {
    setUserEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, type } : e)),
    );
  };

  const fetchSystemsPerspective = async (
    notes?: string,
  ): Promise<boolean> => {
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
        criticalityGroundTruth: isResilience ? exercise.criticalityGroundTruth : undefined,
        userCriticalityRanking: isResilience ? userCriticalityRanking : undefined,
        secondShockEvent: isResilience ? exercise.secondShockEvent : undefined,
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
      result: scoreSystems({
        nodes: exercise.nodes,
        intendedConnections: exercise.intendedConnections,
        shockEvent: exercise.shockEvent,
        userEdges,
        nodeImpact,
        impactVia,
      }),
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
    const partial: SystemsExerciseRow = {
      ...exercise,
      userEdges,
      nodeImpact,
      impactVia,
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
      setError(`Predict ${exercise.perspectiveBName ?? "the other actor"}'s view first, then show it.`);
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
    const label = (id: string) => exercise.nodes.find((n) => n.id === id)?.label ?? id;
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
    pendingSave.clear();
    setError(null);
    setFinishing(true);
    const isResilience = isResilienceSystemsExercise(exercise);
    const finalEx: SystemsExerciseRow = {
      ...exercise,
      userEdges,
      nodeImpact,
      impactVia,
      userProposedComponents: exercise.userProposedComponents ?? null,
      confidenceBefore: confidence,
      aiPerspective: perspectiveText,
      aiPerspectiveStructured: perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null,
      ...(isResilience ? { secondNodeImpact, userCriticalityRanking } : {}),
    };
    try {
      const saved = await completePracticeExercise({ exercise: finalEx, takeaway });
      setExercise(saved as SystemsExerciseRow);
      setStep(systemsVariantSteps(exercise).doneStep);
      if (finalEx.level) {
        void levelSuggestionFor("systems", finalEx.level)
          .then(setLevelSuggestion)
          .catch(() => setLevelSuggestion(null));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setFinishing(false);
    }
  };

  const isGeoExercise = exercise ? isGeopoliticsSystemsExercise(exercise) : false;
  const isResilienceExercise = exercise ? isResilienceSystemsExercise(exercise) : false;
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
    phase === 1 && partIndex >= 0 ? `Part ${partIndex + 1} of ${workParts.length} · ${workParts[partIndex]}` : undefined;
  const systemsFeedback = perspectiveStructured ?? exercise?.aiPerspectiveStructured ?? null;
  // Older rows have no level: they had the component list and no other hints (Standard).
  // Geopolitics rows made before levels ran at Expert.
  const exerciseLevel: PracticeLevel = exercise
    ? (exercise.level ?? (isGeoExercise ? "expert" : "standard"))
    : level;
  const exLevel = SYSTEMS_LEVELS[exerciseLevel];

  return (
    <ExerciseShell stepIndex={phase} stepLabels={practiceStepLabels("Map the system")} partLabel={partLabel}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          {step === 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => {
                setError(null);
                void startGenerate();
              }}
            >
              Retry
            </Button>
          ) : null}
        </Alert>
      ) : null}

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Systems exercise</CardTitle>
            <CardDescription>
              Map dependencies on a fixed canvas, then respond to a shock scenario.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={entryMode === "suggested" ? "default" : "outline"}
                onClick={() => setEntryMode("suggested")}
              >
                Suggested topics
              </Button>
              <Button
                type="button"
                size="sm"
                variant={entryMode === "manual" ? "default" : "outline"}
                onClick={() => setEntryMode("manual")}
              >
                Type your own
              </Button>
            </div>

            <LevelPicker
              value={level}
              onChange={chooseLevel}
              descriptions={{
                guided: SYSTEMS_LEVELS.guided.description,
                standard: SYSTEMS_LEVELS.standard.description,
                expert: SYSTEMS_LEVELS.expert.description,
              }}
              note="Geopolitics topics: Guided maps one side's view; Standard and Expert add the other side's view, which you predict first."
            />

            {SYSTEMS_LEVELS[level].taskTypes.length > 1 ? (
            <div className="grid gap-2">
              <Label>Task type</Label>
              <Select
                value={systemsTaskType}
                onValueChange={(v) => setSystemsTaskType((v as SystemsTaskType) ?? "auto")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="geopolitics">Geopolitical (dual perspective)</SelectItem>
                  <SelectItem value="resilience">Resilience audit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            ) : null}

            <div className={cn(entryMode !== "suggested" && "hidden")}>
              <TopicSuggestionPicker
                area="systems"
                kind="exercise"
                onPick={({ title }) => {
                  setSetupMode("generated");
                  setDomain(title);
                  void startGenerate(title, "generated");
                }}
              />
            </div>
            <div className={cn("space-y-4", entryMode !== "manual" && "hidden")}>
            <div className="grid gap-2">
              <Label>{setupMode === "custom_scenario" ? "Domain (optional)" : "Domain"}</Label>
              <DomainInput
                value={domain}
                onChange={setDomain}
                suggestions={domainSuggestions}
                placeholder={
                  setupMode === "custom_scenario"
                    ? "e.g. DevOps - leave blank to let AI infer"
                    : undefined
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select
                value={setupMode}
                onValueChange={(v) =>
                  setSetupMode((v as "generated" | "custom_scenario") ?? "generated")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generated">AI-generated from domain</SelectItem>
                  <SelectItem value="custom_scenario">My scenario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {setupMode === "custom_scenario" ? (
              <div className="grid gap-2">
                <Label htmlFor="sys-custom-scenario">Your scenario</Label>
                <Textarea
                  id="sys-custom-scenario"
                  rows={5}
                  value={customScenarioText}
                  onChange={(e) => setCustomScenarioText(e.target.value)}
                  placeholder="Describe stakeholders, components, and tensions for the dependency map..."
                  className="min-h-[5rem]"
                />
              </div>
            ) : null}
            <p className="text-muted-foreground text-xs">
              Personal context for AI is read from{" "}
              <Link href="/settings" className="underline">
                Settings
              </Link>
              .
            </p>
            <div className="flex gap-2">
              <Button type="button" disabled={loading} onClick={() => void startGenerate()}>
                {loading ? (
                  <>
                    <InlineSpinner /> Generating…
                  </>
                ) : (
                  "Generate exercise"
                )}
              </Button>
              {exercise ? (
                <Button type="button" variant="secondary" onClick={() => setStep((exercise.currentStep ?? 1) as FlowStep)}>
                  Continue existing exercise
                </Button>
              ) : null}
            </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>{exercise.title}</CardTitle>
            <CardDescription>Domain: {exercise.domain}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{exercise.scenario}</p>
            {decomposePhase === "input" ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Pick the 6 factors that matter most.
                </p>
                {exLevel.componentCandidates &&
                exercise.componentCandidates &&
                exercise.componentCandidates.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {exercise.componentCandidates.map((c) => {
                        const selected = userProposedComponents.includes(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setUserProposedComponents((prev) => {
                                if (prev.includes(c)) return prev.filter((s) => s !== c);
                                if (prev.length >= 6) return prev;
                                return [...prev, c];
                              })
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm transition-colors",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "hover:bg-accent",
                            )}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {userProposedComponents.length}/6 selected
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {Array.from({ length: 6 }, (_, i) => userProposedComponents[i] ?? "").map((v, i) => (
                      <Input
                        key={i}
                        value={v}
                        maxLength={30}
                        placeholder={`Component ${i + 1}`}
                        onChange={(e) =>
                          setUserProposedComponents((prev) => {
                            const next = [...prev];
                            next[i] = e.target.value;
                            return next;
                          })
                        }
                      />
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => {
                    const updated = { ...exercise, userEdges, nodeImpact, currentStep: 1 as const };
                    setExercise(updated);
                    void putExercise(updated);
                    setStep(0);
                  }}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const cleaned = userProposedComponents.map((s) => s.trim()).filter(Boolean);
                      if (cleaned.length !== 6) {
                        setError("Choose 6 components.");
                        return;
                      }
                      setError(null);
                      setDecomposePhase("compare");
                    }}
                  >
                    Compare and continue
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                      Your components
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {userProposedComponents.map((s, i) => (
                        <li key={i}>{s.trim() || "-"}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">AI nodes</p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {exercise.nodes.map((n) => (
                        <li key={n.id}>{n.label}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setDecomposePhase("input")}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const cleaned = userProposedComponents.map((s) => s.trim()).filter(Boolean);
                      const nextRow: SystemsExerciseRow = {
                        ...exercise,
                        userProposedComponents: cleaned.length === 6 ? cleaned : null,
                        currentStep: 2,
                      };
                      void putExercise(nextRow);
                      setExercise(nextRow);
                      setStep(2);
                    }}
                  >
                    Continue to connect
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>{exercise.title}</CardTitle>
            <CardDescription>Domain: {exercise.domain}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{exercise.scenario}</p>
            {exLevel.linkCountHint ? (
              <p className="text-sm text-zinc-900" data-testid="link-count-hint">
                The model draws <span className="font-medium">{exercise.intendedConnections.length} links</span>{" "}
                between these nodes. Try to find them.
              </p>
            ) : null}
            {exLevel.linkTypeGuide !== "hidden" ? <LinkTypeGuide mode={exLevel.linkTypeGuide} /> : null}
            <SystemsFlowCanvas
              nodes={exercise.nodes}
              userEdges={userEdges}
              onUserEdgesChange={setUserEdges}
              mode="connect"
              nodeImpact={nodeImpact}
            />
            <p className="text-muted-foreground text-xs">
              Drag bottom → top to link. Max {20}. Backspace deletes.
            </p>
            {userEdges.length > 0 ? (
              <ul className="space-y-2 rounded-md border p-2 text-sm">
                {userEdges.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground font-mono text-xs">
                      {e.source} → {e.target}
                    </span>
                    <Select
                      value={e.type}
                      onValueChange={(v) => {
                        const t = v as SystemsConnectionType;
                        setEdgeType(e.id, t);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EDGE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => {
                void putExercise({ ...exercise, userEdges, nodeImpact, currentStep: 1 });
                setStep(1);
              }}>
                Back
              </Button>
              <Button type="button" variant="secondary" onClick={regenerate}>
                Regenerate
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setError(null);
                  if (userEdges.length < 1) {
                    setError("Add at least one connection before continuing.");
                    return;
                  }
                  // Confidence is part of the shock step now, so base/geo go straight there.
                  const next = isResilienceExercise ? criticalityStep : shockStep;
                  void putExercise({ ...exercise, userEdges, currentStep: next });
                  setExercise({ ...exercise, userEdges, currentStep: next });
                  setStep(next);
                }}
              >
                Done connecting
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === criticalityStep && exercise && isResilienceExercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Criticality ranking</CardTitle>
            <CardDescription>
              Before either shock hits, rank each node by how critical it is to the system (1 =
              most critical single point of failure, 6 = least critical).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SystemsFlowCanvas
              nodes={exercise.nodes}
              userEdges={userEdges}
              onUserEdgesChange={setUserEdges}
              mode="readonly"
              nodeImpact={nodeImpact}
            />
            <div className="grid gap-2">
              {exercise.nodes.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-2"
                >
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-muted-foreground text-xs">{n.description}</p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    className="w-16"
                    value={userCriticalityRanking[n.id] ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setUserCriticalityRanking((prev) => {
                        const next = { ...prev };
                        if (raw === "") {
                          delete next[n.id];
                          return next;
                        }
                        const v = Number(raw);
                        if (!Number.isFinite(v)) return prev;
                        next[n.id] = v;
                        return next;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void putExercise({ ...exercise, userEdges, nodeImpact, currentStep: 2 });
                  setStep(2);
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setError(null);
                  const ranks = exercise.nodes.map((n) => userCriticalityRanking[n.id]);
                  const valid =
                    ranks.every(
                      (r) => typeof r === "number" && Number.isInteger(r) && r >= 1 && r <= 6,
                    ) && new Set(ranks).size === 6;
                  if (!valid) {
                    setError("Rank all 6 nodes 1-6, using each rank exactly once.");
                    return;
                  }
                  const nextRow: SystemsExerciseRow = {
                    ...exercise,
                    userEdges,
                    nodeImpact,
                    userCriticalityRanking,
                    currentStep: shockStep,
                  };
                  void putExercise(nextRow);
                  setExercise(nextRow);
                  setStep(shockStep);
                }}
              >
                Continue to shock
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === shockStep && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Shock scenario</CardTitle>
            <CardDescription>
              Click nodes to cycle: unaffected → directly affected (solid border) → indirectly
              affected (dashed border). The node also says &quot;direct&quot; or &quot;indirect&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium">{exercise.shockEvent.description}</p>
            {exLevel.impactCountHint ? (
              <p className="text-sm text-zinc-900" data-testid="impact-count-hint">
                In the model, {exercise.shockEvent.directlyAffected.length} node
                {exercise.shockEvent.directlyAffected.length === 1 ? " is" : "s are"} directly and{" "}
                {exercise.shockEvent.indirectlyAffected.length} indirectly affected.
              </p>
            ) : null}
            <SystemsFlowCanvas
              nodes={exercise.nodes}
              userEdges={userEdges}
              onUserEdgesChange={setUserEdges}
              mode="shock"
              nodeImpact={nodeImpact}
              onToggleNodeImpact={(id) => {
                setNodeImpact((prev) => ({
                  ...prev,
                  [id]: cycleImpact(prev[id] ?? "none"),
                }));
              }}
            />
            {(() => {
              const indirect = exercise.nodes.filter((n) => nodeImpact[n.id] === "indirect");
              if (indirect.length === 0) return null;
              return (
                <div className="space-y-3 rounded-2xl border border-zinc-200 p-4" data-testid="spread-questions">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">How does the shock reach each indirect node?</p>
                    <p className="text-muted-foreground text-xs">
                      Pick the node it passes through.
                    </p>
                  </div>
                  {indirect.map((n) => {
                    const choices = exercise.nodes.filter(
                      (m) => m.id !== n.id && (nodeImpact[m.id] ?? "none") !== "none",
                    );
                    return (
                      <div key={n.id} className="space-y-1.5" data-testid="spread-question">
                        <p className="text-sm">
                          <span className="font-medium">{n.label}</span> is hit through:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {choices.length === 0 ? (
                            <span className="text-muted-foreground text-xs">Mark another node as affected first.</span>
                          ) : (
                            choices.map((m) => (
                              <Button
                                key={m.id}
                                type="button"
                                size="sm"
                                variant={impactVia[n.id] === m.id ? "default" : "outline"}
                                aria-pressed={impactVia[n.id] === m.id}
                                onClick={() => setImpactVia((prev) => ({ ...prev, [n.id]: m.id }))}
                              >
                                {m.label}
                              </Button>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <ConfidenceSlider
              value={confidence}
              onChange={setConfidence}
              label="How confident are you in your dependency map?"
            />
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={loading} onClick={() => {
                const backStep = isResilienceExercise ? criticalityStep : 2;
                void putExercise({ ...exercise, userEdges, nodeImpact, currentStep: backStep });
                setStep(backStep);
              }}>
                Back
              </Button>
              <Button type="button" disabled={loading} onClick={() => void finishShockStep()}>
                {loading ? (
                  <>
                    <InlineSpinner /> Loading…
                  </>
                ) : isResilienceExercise ? (
                  "Continue to cascade"
                ) : isGeoExercise && !skipSwap ? (
                  "Continue to perspective comparison"
                ) : (
                  "Submit impact and get AI reflection"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === cascadeStep && exercise && isResilienceExercise && exercise.secondShockEvent ? (
        <Card>
          <CardHeader>
            <CardTitle>Cascade</CardTitle>
            <CardDescription>
              A second shock cascades from the first. Mark impact, then compare your criticality
              ranking to the model&apos;s.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium">{exercise.secondShockEvent.description}</p>
            <SystemsFlowCanvas
              nodes={exercise.nodes}
              userEdges={userEdges}
              onUserEdgesChange={setUserEdges}
              mode="shock"
              nodeImpact={secondNodeImpact}
              onToggleNodeImpact={(id) => {
                setSecondNodeImpact((prev) => ({
                  ...prev,
                  [id]: cycleImpact(prev[id] ?? "none"),
                }));
              }}
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Criticality ranking: you vs. the model</p>
              <ul className="space-y-1.5">
                {(exercise.criticalityGroundTruth ?? [])
                  .slice()
                  .sort((a, b) => a.criticalityRank - b.criticalityRank)
                  .map((hint) => {
                    const node = exercise.nodes.find((n) => n.id === hint.nodeId);
                    const userRank = userCriticalityRanking[hint.nodeId];
                    const match = userRank === hint.criticalityRank;
                    return (
                      <li
                        key={hint.nodeId}
                        className={cn(
                          "rounded-md border p-2 text-sm",
                          match ? "border-zinc-900" : "border-zinc-300",
                        )}
                      >
                        <span className="font-medium">{node?.label ?? hint.nodeId}</span>
                        {" - "}your rank: {userRank ?? "-"}, model rank: {hint.criticalityRank}
                        {match ? <span className="font-medium">{" · match"}</span> : null}
                        <p className="text-muted-foreground mt-0.5 text-xs">{hint.rationale}</p>
                      </li>
                    );
                  })}
              </ul>
            </div>
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => {
                  void putExercise({
                    ...exercise,
                    userEdges,
                    nodeImpact,
                    secondNodeImpact,
                    currentStep: shockStep,
                  });
                  setStep(shockStep);
                }}
              >
                Back
              </Button>
              <Button type="button" disabled={loading} onClick={() => void finishCascadeStep()}>
                {loading ? (
                  <>
                    <InlineSpinner /> Loading…
                  </>
                ) : (
                  "Submit impact and get AI reflection"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 5 && exercise && isGeoExercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Perspective comparison</CardTitle>
            <CardDescription>
              You mapped this system from {exercise.perspectiveAName ?? "Actor A"}&apos;s
              view. How would {exercise.perspectiveBName ?? "Actor B"} see it differently?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercise.intendedConnectionsB && exercise.shockEventB && !exercise.revealedB ? (
              <div className="space-y-3 rounded-2xl border border-zinc-200 p-4" data-testid="predict-b">
                <p className="text-sm font-medium">
                  Predict first: from {exercise.perspectiveBName ?? "Actor B"}&apos;s view, which parts does the shock hit
                  directly?
                </p>
                <div className="flex flex-wrap gap-2">
                  {exercise.nodes.map((n) => {
                    const on = (exercise.predictedDirectB ?? []).includes(n.id);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          const prev = exercise.predictedDirectB ?? [];
                          const next = { ...exercise, predictedDirectB: on ? prev.filter((x) => x !== n.id) : [...prev, n.id] };
                          setExercise(next);
                          void putExercise(next);
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm",
                          on ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50",
                        )}
                      >
                        {n.label}
                      </button>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  disabled={(exercise.predictedDirectB ?? []).length === 0}
                  onClick={() => {
                    const next = { ...exercise, revealedB: true };
                    setExercise(next);
                    void putExercise(next);
                  }}
                >
                  Show {exercise.perspectiveBName ?? "Actor B"}&apos;s view
                </Button>
              </div>
            ) : null}
            {exercise.revealedB && exercise.predictedDirectB?.length && exercise.shockEventB ? (
              (() => {
                const actual = new Set(exercise.shockEventB.directlyAffected);
                const hits = exercise.predictedDirectB.filter((id) => actual.has(id)).length;
                return (
                  <p className="text-sm" data-testid="predict-b-result">
                    Your prediction matched <span className="font-medium">{hits} of {actual.size}</span> directly hit
                    parts
                    {exercise.predictedDirectB.length > hits
                      ? `, with ${exercise.predictedDirectB.length - hits} extra`
                      : ""}
                    .
                  </p>
                );
              })()
            ) : null}
            {exercise.intendedConnectionsB && exercise.shockEventB && exercise.revealedB ? (
              <SystemsPerspectiveCompare
                nodes={exercise.nodes}
                userEdges={userEdges}
                nodeImpact={nodeImpact}
                perspectiveAName={exercise.perspectiveAName ?? "Perspective A"}
                perspectiveBName={exercise.perspectiveBName ?? "Perspective B"}
                intendedConnectionsA={exercise.intendedConnections}
                intendedConnectionsB={exercise.intendedConnectionsB}
                shockEvent={exercise.shockEvent}
                shockEventB={exercise.shockEventB}
              />
            ) : null}
            {exercise.revealedB ? (
            <div className="grid gap-2">
              <Label htmlFor="perspective-b-notes">
                What structural differences matter most for{" "}
                {exercise.perspectiveBName ?? "the other actor"}?
              </Label>
              <Textarea
                id="perspective-b-notes"
                rows={4}
                value={userPerspectiveBNotes}
                onChange={(e) => setUserPerspectiveBNotes(e.target.value)}
                placeholder="e.g. Different central hubs, reversed dependencies, who bears shock risk…"
              />
            </div>
            ) : null}
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={loading} onClick={() => setStep(4)}>
                Back
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => void submitSwapAndPerspective()}
              >
                {loading ? (
                  <>
                    <InlineSpinner /> Loading reflection…
                  </>
                ) : (
                  "Submit and get AI reflection"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(step === perspectiveStep || step === doneStep) && exercise && perspectiveText ? (
        <div className="space-y-4">
          <SystemsAnswerKey
            exercise={{ ...exercise, userEdges, confidenceBefore: confidence }}
            result={systemsResultOf({ ...exercise, userEdges, nodeImpact })}
            coaching={isCoachingStructured(systemsFeedback) ? systemsFeedback : null}
          />
          {/* Feedback saved before the comparison view (clarity v2 or plain text). */}
          {!isCoachingStructured(systemsFeedback) ? (
            <AIPerspective text={perspectiveText} structured={systemsFeedback} perspectiveKind="systems" />
          ) : null}
          {step === doneStep && levelSuggestion ? (
            <LevelSuggestionCard
              suggestion={levelSuggestion}
              onAccept={() => {
                chooseLevel(levelSuggestion.to);
                showToast(`Level set to ${LEVEL_LABELS[levelSuggestion.to]} for your next exercise.`);
                setLevelSuggestion(null);
              }}
              onDismiss={() => {
                void dismissLevelSuggestion("systems");
                setLevelSuggestion(null);
              }}
            />
          ) : null}
          <PracticeFinishCard
            takeaway={takeaway}
            onTakeawayChange={setTakeaway}
            onFinish={finishExercise}
            saving={finishing}
            finished={step === doneStep}
          />
        </div>
      ) : null}

    </ExerciseShell>
  );
}
