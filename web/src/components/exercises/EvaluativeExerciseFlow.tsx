"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdaptiveSetupHint } from "@/components/adaptive/AdaptiveSetupHint";
import {
  ExerciseShell,
  EVALUATIVE_EXERCISE_STEP_LABELS,
  GEOPOLITICS_EVALUATIVE_STEP_LABELS,
  EVALUATIVE_UNCERTAINTY_STEP_LABELS,
} from "@/components/shared/ExerciseShell";
import { EvaluativeBlindSpotAlerts } from "@/components/exercises/EvaluativeBlindSpotAlerts";
import { EvaluativeStakeholderMappingCard } from "@/components/exercises/EvaluativeStakeholderMappingCard";
import { EvaluativeWeightAlignment } from "@/components/exercises/EvaluativeWeightAlignment";
import { EvaluativeMatrixBoard } from "@/components/exercises/EvaluativeMatrixBoard";
import { EvaluativeOutcomeInputRow } from "@/components/exercises/EvaluativeOutcomeInputRow";
import { EvaluativeDealbreakerAlerts } from "@/components/exercises/EvaluativeDealbreakerAlerts";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { AIPerspective } from "@/components/shared/AIPerspective";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Slider } from "@/components/ui/slider";
import type {
  ConfidenceRecord,
  EmotionLabel,
  EvaluativeCriteriaFeedback,
  EvaluativeExerciseRow,
  EvaluativeMatrixRow,
  EvaluativeQuadrant,
  EvaluativeScoringRow,
  EvaluativeUncertaintyRow,
  JournalDraft,
} from "@/lib/types/exercise";
import {
  isGeopoliticsEvaluativePayload,
  type EvaluativeExercisePayload,
  type EvaluativeTaskType,
} from "@/lib/ai/validators/evaluative";
import {
  computeOptionEv,
  computeEvaluativeAccuracy,
  EVALUATIVE_UNCERTAINTY_PROBABILITY_EPSILON,
} from "@/lib/analytics/calibration-evaluative";
import { computeDisqualifiedOptions } from "@/lib/analytics/evaluative-dealbreaker";
import type { JournalEntry } from "@/lib/types/journal";
import type { ActionBridge } from "@/lib/types/action";
import {
  buildAdaptiveHintsForRequest,
  getLanguageLevelForRequest,
} from "@/lib/adaptive/adaptive-hints";
import { putExercise, getExercise } from "@/lib/db/exercises";
import { getUserContext } from "@/lib/db/settings";
import { completeExerciseFlow } from "@/lib/db/complete-exercise";
import {
  getPromptIdsUsedInLastNCompleted,
  getRecentJournalSnippetsForDomain,
} from "@/lib/db/journal";
import { pickJournalPrompts, type JournalPromptItem } from "@/lib/ai/prompts/journal-pool";
import { currentIsoWeekKey } from "@/lib/db/actions";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import type {
  AIPerspectiveStructured,
  EvaluativeScoringCriterionBreakdown,
} from "@/lib/types/perspective";
import { DomainInput } from "@/components/shared/DomainInput";
import { TopicSuggestionPicker } from "@/components/shared/TopicSuggestionPicker";
import { listRecentDomains } from "@/lib/db/exercises";
import { isEvaluativeExercise } from "@/lib/types/exercise";
import { resolveDomainAndScenario } from "@/lib/ai/prompts/scenario-steering";

type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

function isGeopoliticsEvaluativeExercise(ex: EvaluativeExerciseRow): boolean {
  return (
    ex.variant === "scoring" &&
    (ex.isGeopolitics ?? Boolean(ex.stakeholderNote?.trim()))
  );
}

function payloadToRow(
  id: string,
  domain: string,
  data: EvaluativeExercisePayload,
  customScenario?: string,
): EvaluativeExerciseRow {
  if (data.variant === "matrix") {
    const row: EvaluativeMatrixRow = {
      id,
      type: "evaluative",
      variant: "matrix",
      domain,
      customScenario,
      title: data.title,
      scenario: data.scenario,
      userProposedCriteria: null,
      axisX: data.axisX,
      axisY: data.axisY,
      options: data.options,
      placements: {},
      confidenceBefore: null,
      aiPerspective: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    return row;
  }
  if (data.variant === "uncertainty") {
    const row: EvaluativeUncertaintyRow = {
      id,
      type: "evaluative",
      variant: "uncertainty",
      domain,
      customScenario,
      title: data.title,
      scenario: data.scenario,
      options: data.options,
      userProbabilities: {},
      userPayoffs: {},
      outcomeIntuitionText: "",
      confidenceBefore: null,
      aiPerspective: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    return row;
  }
  const geo = isGeopoliticsEvaluativePayload(data);
  const weights: Record<string, number> = {};
  const scores: Record<string, Record<string, number>> = {};
  for (const c of data.criteria) {
    weights[c.id] = geo ? 3 : c.suggestedWeight;
  }
  for (const o of data.options) {
    if (geo) {
      scores[o.id] = Object.fromEntries(data.criteria.map((c) => [c.id, 3]));
    } else {
      scores[o.id] = { ...o.suggestedScores };
    }
  }
  const row: EvaluativeScoringRow = {
    id,
    type: "evaluative",
    variant: "scoring",
    domain,
    customScenario,
    title: data.title,
    scenario: data.scenario,
    isGeopolitics: geo,
    stakeholderNote: geo ? data.stakeholderNote : undefined,
    userStakeholderMapping: geo ? null : undefined,
    stakeholderMappingRevealed: false,
    userProposedCriteria: null,
    criteria: data.criteria,
    options: data.options,
    hiddenCriteria: data.hiddenCriteria,
    criterionWeights: weights,
    scores,
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  return row;
}

export function EvaluativeExerciseFlow({
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
  const [evaluativeTaskType, setEvaluativeTaskType] = useState<EvaluativeTaskType>("auto");
  const [entryMode, setEntryMode] = useState<"suggested" | "manual">(initialDomain ? "manual" : "suggested");
  const [customScenarioText, setCustomScenarioText] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [exercise, setExercise] = useState<EvaluativeExerciseRow | null>(null);
  const [placements, setPlacements] = useState<Partial<Record<string, EvaluativeQuadrant>>>({});
  const [criterionWeights, setCriterionWeights] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [userProposedCriteria, setUserProposedCriteria] = useState<
    { name: string; rationale: string }[]
  >(() => Array.from({ length: 4 }, () => ({ name: "", rationale: "" })));
  const [criteriaPhase, setCriteriaPhase] = useState<"input" | "compare">("input");
  const [criteriaFeedback, setCriteriaFeedback] = useState<EvaluativeCriteriaFeedback | null>(null);
  const [criteriaFeedbackLoading, setCriteriaFeedbackLoading] = useState(false);
  const [userStakeholderMapping, setUserStakeholderMapping] = useState<
    { name: string; wants: string }[]
  >(() => Array.from({ length: 4 }, () => ({ name: "", wants: "" })));
  const [stakeholderMappingRevealed, setStakeholderMappingRevealed] = useState(false);

  const [outcomeIntuitionText, setOutcomeIntuitionText] = useState("");
  const [userProbabilities, setUserProbabilities] = useState<Record<string, Record<string, number>>>(
    {},
  );
  const [userPayoffs, setUserPayoffs] = useState<Record<string, Record<string, number>>>({});

  const [confidence, setConfidence] = useState(50);
  const [perspectiveText, setPerspectiveText] = useState<string | null>(null);
  const [perspectiveStructured, setPerspectiveStructured] =
    useState<AIPerspectiveStructured | null>(null);

  const [journalPrompts, setJournalPrompts] = useState<JournalPromptItem[]>([]);
  const [journalAnswers, setJournalAnswers] = useState<Record<string, string>>({});
  const [aiRefLine, setAiRefLine] = useState<string | null>(null);
  const [journalPrimed, setJournalPrimed] = useState(false);
  const journalEffectIdRef = useRef(0);

  const [actionText, setActionText] = useState("");

  const [emotionLabel, setEmotionLabel] = useState<EmotionLabel>("neutral");

  useEffect(() => {
    void listRecentDomains(20).then(setDomainSuggestions);
  }, []);

  const advance = useCallback(
    (next: FlowStep, updatedRow?: EvaluativeExerciseRow) => {
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
      if (!row || row.completedAt || !isEvaluativeExercise(row)) return;
      setExercise(row);
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
        if (row.userStakeholderMapping && row.userStakeholderMapping.length > 0) {
          setUserStakeholderMapping(row.userStakeholderMapping);
        }
        setStakeholderMappingRevealed(row.stakeholderMappingRevealed === true);
      }
      setConfidence(row.confidenceBefore ?? 50);
      if (row.aiPerspective) setPerspectiveText(row.aiPerspective);
      if (row.aiPerspectiveStructured) setPerspectiveStructured(row.aiPerspectiveStructured ?? null);
      if (row.journalDraft) {
        setJournalPrompts(row.journalDraft.prompts);
        setJournalAnswers(row.journalDraft.responses);
        setAiRefLine(row.journalDraft.aiReferenceLine);
        setEmotionLabel(row.journalDraft.emotionLabel ?? "neutral");
        setJournalPrimed(true);
      }
      if (row.actionDraftText) setActionText(row.actionDraftText);
      setStep((row.currentStep ?? 1) as FlowStep);
    })();
  }, [resumeId]);

  useEffect(() => {
    if (resumeId) return;
    const d = initialDomain?.trim();
    if (d) setDomain(d);
  }, [initialDomain, resumeId]);

  useEffect(() => {
    if (!exercise || (step !== 5 && step !== 6) || !journalPrimed) return;
    const timer = setTimeout(() => {
      const journalDraft: JournalDraft = {
        prompts: journalPrompts,
        responses: journalAnswers,
        aiReferenceLine: aiRefLine,
        emotionLabel,
      };
      void putExercise({ ...exercise, journalDraft, actionDraftText: actionText, currentStep: step });
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalAnswers, actionText, emotionLabel, step]);

  useEffect(() => {
    if (!exercise || step === 0 || step === 7) return;
    const timer = setTimeout(() => {
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
                        .map((e) => ({ name: e.name.trim(), wants: e.wants.trim() }))
                        .filter((e) => e.name || e.wants)
                    : scoringEx?.userStakeholderMapping,
                stakeholderMappingRevealed:
                  scoringEx && isGeopoliticsEvaluativeExercise(scoringEx)
                    ? stakeholderMappingRevealed
                    : scoringEx?.stakeholderMappingRevealed,
                currentStep: step,
              };
      void putExercise(updated);
    }, 2000);
    return () => clearTimeout(timer);
  }, [
    placements,
    scores,
    criterionWeights,
    userStakeholderMapping,
    stakeholderMappingRevealed,
    userProbabilities,
    userPayoffs,
    outcomeIntuitionText,
    step,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const adaptiveHints = await buildAdaptiveHintsForRequest("evaluative");
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
          adaptiveHints,
          languageLevel,
          evaluativeTaskType,
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
      const row: EvaluativeExerciseRow = {
        ...payloadToRow(id, d, json.data, customScenarioOut),
        currentStep: 1,
      };
      await putExercise(row);
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
      setJournalAnswers({});
      setAiRefLine(null);
      setJournalPrimed(false);
      setActionText("");
      setEmotionLabel("neutral");
      setUserProposedCriteria(Array.from({ length: 4 }, () => ({ name: "", rationale: "" })));
      setCriteriaPhase("input");
      setCriteriaFeedback(null);
      setCriteriaFeedbackLoading(false);
      setUserStakeholderMapping(Array.from({ length: 4 }, () => ({ name: "", wants: "" })));
      setStakeholderMappingRevealed(false);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  }, [domain, setupMode, customScenarioText, evaluativeTaskType]);

  const autoGenerateTriggered = useRef(false);
  const [autoGenerateReady, setAutoGenerateReady] = useState(false);
  useEffect(() => {
    if (autoGenerateReady || !autoGenerate || resumeId) return;
    try {
      const raw = sessionStorage.getItem("cogi:home-source-text");
      if (raw) {
        sessionStorage.removeItem("cogi:home-source-text");
        const data = JSON.parse(raw) as { source?: string; customScenarioText?: string };
        if (data.source === "custom_scenario" && data.customScenarioText) {
          setSetupMode("custom_scenario");
          setCustomScenarioText(data.customScenarioText);
        }
      }
    } catch { /* ignore */ }
    setAutoGenerateReady(true);
  }, [autoGenerate, autoGenerateReady, resumeId]);

  useEffect(() => {
    if (autoGenerateTriggered.current || !autoGenerateReady || resumeId) return;
    const d = initialDomain?.trim();
    if (!d) return;
    autoGenerateTriggered.current = true;
    void startGenerate();
  }, [autoGenerateReady, initialDomain, resumeId, startGenerate]);

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
      userStakeholderMapping: cleaned.length > 0 ? cleaned : exercise.userStakeholderMapping,
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
    return { ...exercise, userProbabilities, userPayoffs, outcomeIntuitionText };
  };

  const uncertaintyReady = () => {
    const ex = mergedUncertaintyExercise();
    if (!ex) return false;
    return ex.options.every((o) => {
      const probs = o.outcomes.map((out) => userProbabilities[o.id]?.[out.id]);
      const payoffs = o.outcomes.map((out) => userPayoffs[o.id]?.[out.id]);
      if (probs.some((p) => typeof p !== "number") || payoffs.some((p) => typeof p !== "number")) {
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
      await putExercise(partial);
      setExercise(partial);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perspective failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 5 || journalPrimed || !exercise) return;
    const effectId = ++journalEffectIdRef.current;
    let cancelled = false;
    void (async () => {
      try {
        const excluded = await getPromptIdsUsedInLastNCompleted(5);
        const forAccuracy: EvaluativeExerciseRow =
          exercise.variant === "matrix"
            ? { ...exercise, placements }
            : exercise.variant === "uncertainty"
              ? { ...exercise, userProbabilities, userPayoffs }
              : { ...exercise, criterionWeights, scores };
        const accuracy = computeEvaluativeAccuracy(forAccuracy);
        const picks = pickJournalPrompts(excluded, {
          exerciseType: "evaluative",
          accuracy,
          confidenceBefore: confidence,
          overconfident: confidence - accuracy > 20,
          underconfident: accuracy - confidence > 20,
        });
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        setJournalPrompts(picks);
        const init: Record<string, string> = {};
        picks.forEach((p) => {
          init[p.id] = "";
        });
        setJournalAnswers(init);
        setJournalPrimed(true);

        const snippets = await getRecentJournalSnippetsForDomain(exercise.domain, 3);
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        if (snippets.length === 0) {
          setAiRefLine(null);
          return;
        }
        const res = await aiFetch("/api/ai/journal-ref", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            domain: exercise.domain,
            snippets,
          }),
        });
        const j = await safeAiJson<{ ok: true; line: string | null }>(res);
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        if (j.ok && j.line) setAiRefLine(j.line);
      } catch {
        if (!cancelled && effectId === journalEffectIdRef.current) setAiRefLine(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, journalPrimed, exercise]);

  const journalValid = () => {
    const vals = Object.values(journalAnswers);
    const long = vals.filter((v) => v.trim().length > 10);
    return long.length >= 2;
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

  const finishExercise = async () => {
    if (!exercise || !perspectiveText) return;
    if (!journalValid()) {
      setError("Answer at least two prompts with more than 10 characters each.");
      return;
    }
    if (actionText.trim().length < 15) {
      setError("Action must be at least 15 characters.");
      return;
    }
    setError(null);
    const forAccuracy: EvaluativeExerciseRow =
      exercise.variant === "matrix"
        ? { ...exercise, placements }
        : exercise.variant === "uncertainty"
          ? { ...exercise, userProbabilities, userPayoffs }
          : { ...exercise, criterionWeights, scores };
    const accuracy = computeEvaluativeAccuracy(forAccuracy);
    const confidenceRecord: ConfidenceRecord = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      confidenceBefore: confidence,
      actualAccuracy: accuracy,
      gap: confidence - accuracy,
      createdAt: new Date().toISOString(),
    };
    const journalEntry: JournalEntry = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      promptIds: journalPrompts.map((p) => p.id),
      aiReferenceLine: aiRefLine,
      responses: { ...journalAnswers },
      emotionLabel,
      createdAt: new Date().toISOString(),
    };
    const action: ActionBridge = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      oneAction: actionText.trim(),
      weeklyFollowThrough: [{ weekKey: currentIsoWeekKey(), done: false }],
      createdAt: new Date().toISOString(),
    };
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
            completedAt: new Date().toISOString(),
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
              completedAt: new Date().toISOString(),
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
              completedAt: new Date().toISOString(),
            };
    try {
      await completeExerciseFlow({
        exercise: finalEx,
        journal: journalEntry,
        confidence: confidenceRecord,
        action,
      });
      setExercise(finalEx);
      setStep(7);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const scoringBreakdown = useMemo<EvaluativeScoringCriterionBreakdown[] | undefined>(() => {
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

  const isGeoExercise = exercise ? isGeopoliticsEvaluativeExercise(exercise) : false;
  const stepLabels =
    exercise?.variant === "uncertainty"
      ? EVALUATIVE_UNCERTAINTY_STEP_LABELS
      : isGeoExercise
        ? GEOPOLITICS_EVALUATIVE_STEP_LABELS
        : EVALUATIVE_EXERCISE_STEP_LABELS;

  return (
    <ExerciseShell stepIndex={step} stepLabels={stepLabels}>
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
            <CardTitle>Evaluative exercise</CardTitle>
            <CardDescription>
              AI picks a 2×2 matrix (two criteria) or a weighted scoring table (three or more
              criteria). Then you compare with the model’s framing.
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

            <div className="grid gap-2">
              <Label>Task type</Label>
              <Select
                value={evaluativeTaskType}
                onValueChange={(v) => setEvaluativeTaskType((v as EvaluativeTaskType) ?? "auto")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Surprise me</SelectItem>
                  <SelectItem value="dealbreaker">Dealbreaker check</SelectItem>
                  <SelectItem value="uncertainty">Uncertainty & expected value</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={cn(entryMode !== "suggested" && "hidden")}>
              <TopicSuggestionPicker
                area="evaluative"
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
                <Label htmlFor="ev-custom-scenario">Your scenario</Label>
                <Textarea
                  id="ev-custom-scenario"
                  rows={5}
                  value={customScenarioText}
                  onChange={(e) => setCustomScenarioText(e.target.value)}
                  placeholder="Describe the situation, trade-offs, and what you want to practice..."
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
            <AdaptiveSetupHint exerciseType="evaluative" />
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

      {step === 1 && exercise && exercise.variant === "uncertainty" ? (
        <Card>
          <CardHeader>
            <CardTitle>{exercise.title}</CardTitle>
            <CardDescription className="leading-relaxed">{exercise.scenario}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Options</h3>
              <ul className="space-y-2 text-sm">
                {exercise.options.map((o) => (
                  <li key={o.id} className="rounded-md border bg-muted/10 p-2">
                    <p className="font-medium">{o.title}</p>
                    <p className="text-muted-foreground text-xs">{o.description}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-2">
              <Label>
                Before estimating probabilities, what&apos;s your gut read on which option is
                best, and why?
              </Label>
              <Textarea
                value={outcomeIntuitionText}
                onChange={(e) => setOutcomeIntuitionText(e.target.value)}
                rows={4}
                placeholder="Your intuition before running the numbers…"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const next: EvaluativeUncertaintyRow = {
                    ...exercise,
                    outcomeIntuitionText,
                    currentStep: 2,
                  };
                  void putExercise(next);
                  setExercise(next);
                  setStep(2);
                }}
              >
                Continue to estimate
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 && exercise && exercise.variant !== "uncertainty" ? (
        <Card>
          <CardHeader>
            <CardTitle>{exercise.title}</CardTitle>
            <CardDescription className="leading-relaxed">{exercise.scenario}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Options</h3>
              <ul className="space-y-2 text-sm">
                {exercise.options.map((o) => (
                  <li key={o.id} className="rounded-md border bg-muted/10 p-2">
                    <p className="font-medium">{o.title}</p>
                    <p className="text-muted-foreground text-xs">{o.description}</p>
                  </li>
                ))}
              </ul>
            </div>

            {isGeoExercise && exercise.variant === "scoring" ? (
              <EvaluativeStakeholderMappingCard
                exercise={exercise}
                rows={userStakeholderMapping}
                revealed={stakeholderMappingRevealed}
                onRowsChange={setUserStakeholderMapping}
                onRevealedChange={setStakeholderMappingRevealed}
                onError={setError}
                onBack={() => {
                  const updated = { ...exercise, currentStep: 1 as const };
                  setExercise(updated);
                  void putExercise(updated);
                  setStep(0);
                }}
                onContinue={(cleaned) => {
                  const next: EvaluativeScoringRow = {
                    ...exercise,
                    userStakeholderMapping: cleaned,
                    stakeholderMappingRevealed: true,
                    currentStep: 2,
                  };
                  void putExercise(next);
                  setExercise(next);
                  setStep(2);
                }}
              />
            ) : criteriaPhase === "input" ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  What 2–4 criteria would you use to evaluate these options? For each, give a short
                  name and explain why it matters (up to ~500 words).
                </p>
                {exercise.criteriaCandidates && exercise.criteriaCandidates.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {exercise.criteriaCandidates.map((c) => {
                        const selected = userProposedCriteria.some((r) => r.name === c);
                        return (
                          <button
                            key={c}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setUserProposedCriteria((prev) => {
                                const idx = prev.findIndex((r) => r.name === c);
                                if (idx >= 0) {
                                  const next = [...prev];
                                  next[idx] = { name: "", rationale: "" };
                                  return next;
                                }
                                const emptyIdx = prev.findIndex((r) => !r.name.trim());
                                if (emptyIdx === -1) return prev;
                                const next = [...prev];
                                next[emptyIdx] = { name: c, rationale: next[emptyIdx]!.rationale };
                                return next;
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
                      {userProposedCriteria.filter((r) => r.name.trim()).length}/4 selected
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-4">
                  {userProposedCriteria.map((row, idx) => {
                    const hasCandidates = Boolean(
                      exercise.criteriaCandidates && exercise.criteriaCandidates.length > 0,
                    );
                    if (hasCandidates && !row.name.trim()) return null;
                    const wordCount = row.rationale.trim()
                      ? row.rationale.trim().split(/\s+/).filter(Boolean).length
                      : 0;
                    return (
                      <div key={idx} className="grid gap-2">
                        {hasCandidates ? (
                          <p className="text-sm font-medium">{row.name}</p>
                        ) : (
                          <Input
                            value={row.name}
                            placeholder={`Criterion ${idx + 1} name`}
                            maxLength={40}
                            onChange={(e) =>
                              setUserProposedCriteria((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx]!, name: e.target.value };
                                return next;
                              })
                            }
                          />
                        )}
                        <Textarea
                          value={row.rationale}
                          placeholder="Why it matters (up to ~500 words)"
                          rows={3}
                          maxLength={3000}
                          onChange={(e) =>
                            setUserProposedCriteria((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx]!, rationale: e.target.value };
                              return next;
                            })
                          }
                        />
                        <p
                          className={cn(
                            "text-right text-xs",
                            wordCount > 500 ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {wordCount} / 500 words
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => {
                    const updated = { ...exercise, currentStep: 1 as const };
                    setExercise(updated);
                    void putExercise(updated);
                    setStep(0);
                  }}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const cleaned = userProposedCriteria
                        .map((c) => ({ name: c.name.trim(), rationale: c.rationale.trim() }))
                        .filter((c) => c.name && c.rationale);
                      if (cleaned.length < 2) {
                        setError("Enter at least 2 criteria.");
                        return;
                      }
                      if (cleaned.some((c) => c.rationale.split(/\s+/).filter(Boolean).length > 500)) {
                        setError("Keep each rationale to 500 words or fewer.");
                        return;
                      }
                      setError(null);
                      setCriteriaPhase("compare");
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
                      Your criteria
                    </p>
                    <ul className="space-y-2 text-sm">
                      {userProposedCriteria
                        .map((c) => ({ name: c.name.trim(), rationale: c.rationale.trim() }))
                        .filter((c) => c.name && c.rationale)
                        .map((c, i) => (
                          <li key={i}>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-muted-foreground text-xs">{c.rationale}</p>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                      AI framework
                    </p>
                    {exercise.variant === "matrix" ? (
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="font-medium">X: {exercise.axisX.label}</p>
                          <p className="text-muted-foreground text-xs">
                            {exercise.axisX.lowLabel} → {exercise.axisX.highLabel}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Y: {exercise.axisY.label}</p>
                          <p className="text-muted-foreground text-xs">
                            {exercise.axisY.lowLabel} → {exercise.axisY.highLabel}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {exercise.criteria.map((c) => (
                          <li key={c.id}>
                            <p className="font-medium">{c.label}</p>
                            <p className="text-muted-foreground text-xs">{c.description}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                {criteriaFeedbackLoading ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <InlineSpinner /> Getting AI feedback on your criteria…
                  </div>
                ) : criteriaFeedback ? (
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                      AI feedback on your criteria
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{criteriaFeedback.text}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setCriteriaFeedback(null);
                      setCriteriaPhase("input");
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const cleaned = userProposedCriteria
                        .map((c) => ({ name: c.name.trim(), rationale: c.rationale.trim() }))
                        .filter((c) => c.name && c.rationale);
                      const next: EvaluativeExerciseRow =
                        exercise.variant === "matrix"
                          ? { ...exercise, userProposedCriteria: cleaned, currentStep: 2 }
                          : { ...exercise, userProposedCriteria: cleaned, currentStep: 2 };
                      void putExercise(next);
                      setExercise(next);
                      setStep(2);
                    }}
                  >
                    Continue to evaluate
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
            <CardDescription className="leading-relaxed">{exercise.scenario}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {exercise.variant === "matrix" ? (
              <EvaluativeMatrixBoard
                axisX={exercise.axisX}
                axisY={exercise.axisY}
                options={exercise.options}
                placements={placements}
                onPlacementsChange={setPlacements}
              />
            ) : exercise.variant === "uncertainty" ? (
              <div className="space-y-6">
                {exercise.options.map((o) => {
                  const ev = computeOptionEv(
                    o.outcomes.map((out) => ({
                      probability: userProbabilities[o.id]?.[out.id] ?? 0,
                      payoff: userPayoffs[o.id]?.[out.id] ?? 0,
                    })),
                  );
                  return (
                    <div key={o.id} className="space-y-3 rounded-md border p-3">
                      <div>
                        <p className="font-medium">{o.title}</p>
                        <p className="text-muted-foreground text-xs">{o.description}</p>
                      </div>
                      {o.outcomes.map((out) => (
                        <EvaluativeOutcomeInputRow
                          key={out.id}
                          outcome={out}
                          userProbability={userProbabilities[o.id]?.[out.id]}
                          userPayoff={userPayoffs[o.id]?.[out.id]}
                          onProbabilityChange={(p) =>
                            setUserProbabilities((prev) => ({
                              ...prev,
                              [o.id]: { ...prev[o.id], [out.id]: p },
                            }))
                          }
                          onPayoffChange={(payoff) =>
                            setUserPayoffs((prev) => ({
                              ...prev,
                              [o.id]: { ...prev[o.id], [out.id]: payoff },
                            }))
                          }
                        />
                      ))}
                      <p className="text-sm font-medium">
                        Your expected value: {ev === null ? "—" : `$${ev.toFixed(2)}`}
                      </p>
                    </div>
                  );
                })}
                {!uncertaintyReady() ? (
                  <p className="text-destructive text-xs">
                    For each option, your outcome probabilities must sum to 100% and every outcome
                    needs a payoff.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                {exercise.criteria.some((c) => c.isDealbreaker) ? (
                  <EvaluativeDealbreakerAlerts
                    disqualified={computeDisqualifiedOptions(exercise, scores)}
                  />
                ) : null}
                <div className="max-h-[min(60vh,640px)] overflow-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border p-2 text-left sticky top-0 z-10 bg-card">Option</th>
                      {exercise.criteria.map((c) => (
                        <th
                          key={c.id}
                          className="border p-2 text-left align-bottom sticky top-0 z-10 bg-card"
                        >
                          <div className="font-medium">{c.label}</div>
                          <p className="text-muted-foreground mt-1 text-xs font-normal">
                            {c.description}
                          </p>
                          <div className="mt-2 text-xs">Weight (1–5)</div>
                          <Slider
                            min={1}
                            max={5}
                            value={[criterionWeights[c.id] ?? 3]}
                            onValueChange={(v) => {
                              const n = Array.isArray(v) ? (v[0] ?? 3) : v;
                              setCriterionWeights((prev) => ({
                                ...prev,
                                [c.id]: n,
                              }));
                            }}
                            className="mt-2 w-full"
                          />
                          <span className="text-muted-foreground text-xs">
                            AI suggested: {c.suggestedWeight}
                          </span>
                        </th>
                      ))}
                      <th className="border p-2 text-right sticky top-0 z-10 bg-card">
                        Weighted avg
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercise.options.map((o) => (
                      <tr key={o.id}>
                        <td className="border p-2 align-top">
                          <p className="font-medium">{o.title}</p>
                          <p className="text-muted-foreground text-xs">{o.description}</p>
                        </td>
                        {exercise.criteria.map((c) => (
                          <td key={c.id} className="border p-2 align-top">
                            <div className="text-xs">Score (1–5)</div>
                            <Slider
                              min={1}
                              max={5}
                              value={[scores[o.id]?.[c.id] ?? 3]}
                              onValueChange={(v) => {
                                const n = Array.isArray(v) ? (v[0] ?? 3) : v;
                                setScores((prev) => ({
                                  ...prev,
                                  [o.id]: { ...prev[o.id], [c.id]: n },
                                }));
                              }}
                              className="mt-2 w-full"
                            />
                            <span className="text-muted-foreground text-xs">
                              AI: {o.suggestedScores[c.id]}
                            </span>
                          </td>
                        ))}
                        <td className="border p-2 text-right font-medium">
                          {weightedRowTotal(o.id).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => {
                const updated =
                  exercise.variant === "matrix"
                    ? { ...exercise, placements, currentStep: 1 as const }
                    : exercise.variant === "uncertainty"
                      ? { ...exercise, userProbabilities, userPayoffs, currentStep: 1 as const }
                      : { ...exercise, currentStep: 1 as const };
                setExercise(updated);
                void putExercise(updated);
                setStep(0);
              }}>
                Back
              </Button>
              <Button type="button" variant="secondary" onClick={regenerate}>
                Regenerate
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const updated: EvaluativeExerciseRow =
                    exercise.variant === "matrix"
                      ? { ...exercise, placements }
                      : exercise.variant === "uncertainty"
                        ? { ...exercise, userProbabilities, userPayoffs }
                        : { ...exercise, criterionWeights, scores };
                  setExercise(updated);
                  advance(3, updated);
                }}
                disabled={
                  (exercise.variant === "matrix" && !matrixReady()) ||
                  (exercise.variant === "uncertainty" && !uncertaintyReady())
                }
              >
                Continue to confidence
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Confidence</CardTitle>
            <CardDescription>
              How confident are you that your evaluation matches strong judgment (before the
              detailed AI comparison)?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConfidenceSlider
              value={confidence}
              onChange={setConfidence}
              label="How confident are you in your evaluation?"
            />
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => {
                  void putExercise({ ...exercise, currentStep: 2 as const });
                  setStep(2);
                }}
              >
                Back
              </Button>
              <Button type="button" disabled={loading} onClick={() => void submitPerspective()}>
                {loading ? (
                  <>
                    <InlineSpinner /> Loading…
                  </>
                ) : (
                  "Show AI perspective"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 && exercise && perspectiveText ? (
        <Card>
          <CardHeader>
            <CardTitle>AI perspective</CardTitle>
            <CardDescription>Collaborative comparison - not a numeric grade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercise.variant === "scoring" && isGeoExercise ? (
              <>
                <EvaluativeBlindSpotAlerts hiddenCriteria={exercise.hiddenCriteria} />
                <EvaluativeWeightAlignment
                  criteria={exercise.criteria}
                  userWeights={criterionWeights}
                />
              </>
            ) : exercise.variant === "scoring" ? (
              <EvaluativeBlindSpotAlerts hiddenCriteria={exercise.hiddenCriteria} />
            ) : null}
            <AIPerspective
              text={perspectiveText}
              structured={perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null}
              exerciseId={exercise.id}
              perspectiveKind={
                exercise.variant === "matrix"
                  ? "evaluative-matrix"
                  : exercise.variant === "uncertainty"
                    ? "evaluative-uncertainty"
                    : "evaluative-scoring"
              }
              exerciseTitle={exercise.title}
              domain={exercise.domain}
              evaluativeScoringBreakdown={exercise.variant === "scoring" ? scoringBreakdown : undefined}
              highlightTerms={perspectiveHighlightTerms}
            />
            <Button type="button" onClick={() => advance(5)}>
              Continue to journal
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 5 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Journal</CardTitle>
            <CardDescription>
              Reflect on how you weighed trade-offs. At least two answers need more than 10
              characters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>What emotion might be influencing your thinking right now?</Label>
              <Select
                value={emotionLabel}
                onValueChange={(v) =>
                  setEmotionLabel(
                    (v as
                      | "anxious"
                      | "excited"
                      | "frustrated"
                      | "confident"
                      | "uncertain"
                      | "defensive"
                      | "neutral") ?? "neutral",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anxious">Anxious</SelectItem>
                  <SelectItem value="excited">Excited</SelectItem>
                  <SelectItem value="frustrated">Frustrated</SelectItem>
                  <SelectItem value="confident">Confident</SelectItem>
                  <SelectItem value="uncertain">Uncertain</SelectItem>
                  <SelectItem value="defensive">Defensive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {aiRefLine ? (
              <p className="text-muted-foreground border-l-2 pl-3 text-sm italic">{aiRefLine}</p>
            ) : null}
            {journalPrompts.map((p) => (
              <div key={p.id} className="grid gap-2">
                <Label>{p.text}</Label>
                <Textarea
                  value={journalAnswers[p.id] ?? ""}
                  onChange={(e) =>
                    setJournalAnswers((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => setStep(4)}>
              Back
            </Button>
            <Button type="button" onClick={() => advance(6)}>
              Continue to action
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 6 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Action bridge</CardTitle>
            <CardDescription>One concrete action you will take (min. 15 characters).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              rows={3}
              placeholder="e.g. I will revisit the weight on risk next sprint planning…"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(5)}>
                Back
              </Button>
              <Button type="button" onClick={() => void finishExercise()}>
                Finish exercise
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 7 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Exercise saved</CardTitle>
            <CardDescription>Saved to your account (Firebase) in exercise history.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/" className={cn(buttonVariants({ variant: "secondary" }))}>
              Home
            </Link>
            <Link href="/exercise/history" className={cn(buttonVariants({ variant: "outline" }))}>
              History
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </ExerciseShell>
  );
}
