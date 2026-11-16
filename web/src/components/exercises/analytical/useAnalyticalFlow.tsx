"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { practicePhase } from "@/components/shared/ExerciseShell";
import { useToast } from "@/components/ui/toast";
import type {
  AnalyticalExerciseRow,
  UserHighlight,
} from "@/lib/types/exercise";
import type { AnalyticalExercise } from "@/lib/ai/validators/common";
import { getLanguageLevelForRequest } from "@/lib/db/settings";
import { getGenerationContext } from "@/lib/db/generation-context";
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
import { sanitizeRealDataText } from "@/lib/text/sanitizeRealData";
import { sanitizeUserPasteOrClipboard } from "@/lib/text/sanitizeRealDataBrowser";
import { listRecentDomains } from "@/lib/db/exercises";
import { isAnalyticalExercise } from "@/lib/types/exercise";
import { resolveDomainAndScenario } from "@/lib/ai/prompts/scenario-steering";
import { isGeopoliticsAnalyticalDomain } from "@/lib/exercise/geopolitics-domains";
import { computeMetaGuessScore } from "@/lib/analytics/geopolitics-meta-guess";
import {
  analyticalResultOf,
  scoreAnalytical,
} from "@/lib/exercise/analytical-score";
import {
  guidedCandidatesFor,
  guidedPart,
} from "@/components/exercises/GuidedWalkthrough";
import {
  ANALYTICAL_LEVELS,
  GEO_ANALYTICAL_LEVELS,
} from "@/lib/exercise/analytical-levels";
import {
  geoGuessMissing,
  geoLensLines,
} from "@/components/exercises/GeoGuessStep";
import { scoreGeoGuess } from "@/lib/exercise/geo-guess";
import { type PracticeLevel } from "@/lib/exercise/levels";
import {
  FlowStep,
  FEEDBACK_STEP,
  analyticalResumeStep,
} from "@/components/exercises/analytical/shared";

/** State, effects and actions of the Analytical flow; the steps only render. */
export function useAnalyticalFlow({
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
  const { show: showToast } = useToast();
  const flow = useExerciseFlow<AnalyticalExerciseRow, FlowStep>({
    type: "analytical",
    resumeId,
    isRow: isAnalyticalExercise,
    onResume: (row) => {
      setHighlights(row.userHighlights ?? []);
      if (row.aiPerspective) setPerspectiveText(row.aiPerspective);
      setUserPerspectiveGuess(row.userPerspectiveGuess ?? "");
      const actors = row.userMissingActorsGuess ?? [];
      setMissingActorGuess1(actors[0] ?? "");
      setMissingActorGuess2(actors[1] ?? "");
      if (row.domain) setDomain(row.domain);
      if (row.source === "real_data") {
        setMode("real_data");
        if (row.originalUserText) setRealText(row.originalUserText);
      } else if (row.customScenario) {
        setMode("custom_scenario");
        setCustomScenarioText(row.customScenario);
      }
      setStep(
        analyticalResumeStep(row.currentStep, row.isGeopolitics === true),
      );
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
    advance,
    finish,
  } = flow;
  const [domain, setDomain] = useState(initialDomain?.trim() ?? "");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);

  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [perspectiveText, setPerspectiveText] = useState<string | null>(null);

  const [userPerspectiveGuess, setUserPerspectiveGuess] = useState("");
  const [missingActorGuess1, setMissingActorGuess1] = useState("");
  const [missingActorGuess2, setMissingActorGuess2] = useState("");

  const [mode, setMode] = useState<
    "generated" | "real_data" | "custom_scenario"
  >(initialSource ?? "generated");
  const [entryMode, setEntryMode] = useState<"suggested" | "manual">(
    initialDomain ? "manual" : "suggested",
  );
  const [customScenarioText, setCustomScenarioText] = useState("");
  const [realText, setRealText] = useState("");
  const [realWordCount, setRealWordCount] = useState(0);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const realTextareaRef = useRef<HTMLTextAreaElement>(null);

  const realSanitizedPreview = useMemo(
    () => sanitizeRealDataText(realText),
    [realText],
  );

  useEffect(() => {
    void listRecentDomains(20).then(setDomainSuggestions);
  }, []);

  const chooseLevel = (next: PracticeLevel) => {
    flow.chooseLevel(next);
  };

  useEffect(() => {
    if (resumeId) return;
    const d = initialDomain?.trim();
    if (d) setDomain(d);
  }, [initialDomain, resumeId]);

  useDebouncedSave(
    pendingSave,
    exercise && step !== 0 && step !== 7
      ? () =>
          void putExercise({
            ...exercise,
            userHighlights: highlights,
            currentStep: step,
          })
      : null,
    2000,
    [highlights, step],
  );

  const startGenerate = useCallback(
    async (
      domainOverride?: string,
      modeOverride?: "generated" | "real_data" | "custom_scenario",
    ) => {
      setError(null);
      setPasteNotice(null);
      const domainInput = domainOverride ?? domain;
      const effectiveMode = modeOverride ?? mode;

      let effectiveDomain: string;
      let customScenarioBody: string | undefined;

      if (effectiveMode === "custom_scenario") {
        const r = resolveDomainAndScenario({
          mode: "custom_scenario",
          domain: domainInput,
          customScenario: customScenarioText,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        effectiveDomain = r.effectiveDomain;
        customScenarioBody = r.customScenarioOut;
      } else {
        const d = domainInput.trim();
        if (!d) {
          setError("Enter a domain.");
          return;
        }
        effectiveDomain = d;
      }

      let sanitizedUserText: string | undefined;
      if (effectiveMode === "real_data") {
        const trimmed = realText.trim();
        if (!trimmed) {
          setError("Paste your text before generating an exercise.");
          return;
        }
        const client = sanitizeUserPasteOrClipboard(realText);
        if (client.htmlRejected) {
          setError(
            "That paste looked like unsafe HTML (script, iframe, or embed). Paste plain text only.",
          );
          return;
        }
        if (client.wordCount > 2000) {
          setError(
            "Your text is too long. Please paste only the most relevant section. (Max 2,000 words after sanitization.)",
          );
          return;
        }
        sanitizedUserText = client.text;
        setRealText(client.text);
        setRealWordCount(client.wordCount);
      }
      setLoading(true);
      try {
        const userContext = await getGenerationContext();
        const userTextForReal =
          effectiveMode === "real_data" ? sanitizedUserText : undefined;
        const languageLevel = await getLanguageLevelForRequest();
        // Geopolitics passages have their own level settings (PLAN-geopolitics.md G1.1).
        const isGeopolitics = isGeopoliticsAnalyticalDomain(effectiveDomain);
        const exerciseLevel: PracticeLevel = level;
        const res = await aiFetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: effectiveDomain,
            userContext: userContext || undefined,
            exerciseType: "analytical",
            mode: effectiveMode,
            userText:
              effectiveMode === "real_data" ? userTextForReal : undefined,
            customScenario: customScenarioBody,
            languageLevel,
            level: exerciseLevel,
          }),
        });
        const json = await safeAiJson<
          { ok: true; data: AnalyticalExercise } | { ok: false; error: string }
        >(res);
        if (!json.ok) {
          setError(json.error);
          return;
        }
        const data = json.data;
        const id = crypto.randomUUID();
        const row: AnalyticalExerciseRow = {
          id,
          type: "analytical",
          domain: effectiveDomain,
          customScenario: customScenarioBody,
          source: effectiveMode === "real_data" ? "real_data" : "ai",
          title: data.title,
          passage: data.passage,
          originalUserText:
            effectiveMode === "real_data" ? (sanitizedUserText ?? null) : null,
          isSoundReasoning: data.isSoundReasoning === true,
          isGeopolitics,
          hiddenPerspective: data.hiddenPerspective,
          missingActors: data.missingActors,
          concepts: data.concepts,
          conceptChecks: data.conceptChecks,
          conceptAnswers: [],
          learnDone: !data.concepts?.length,
          perspectiveOptions: data.perspectiveOptions,
          perspectiveChoice: null,
          actorCandidates: data.actorCandidates,
          actorChoices: [],
          lensQuestions: data.lensQuestions,
          lensAnswers: {},
          lensText: {},
          embeddedIssues: data.embeddedIssues,
          validPoints: data.validPoints,
          userHighlights: [],
          level: exerciseLevel,
          mainClaimQuiz: data.mainClaimQuiz,
          mainClaimAnswer: null,
          guidedIndex: 0,
          confidenceBefore: null,
          aiPerspective: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
          currentStep: 1,
        };
        await putExercise(row);
        rememberExerciseInUrl(row);
        setExercise(row);
        setHighlights([]);
        setPerspectiveText(null);
        setPerspectiveStructured(null);
        setTakeaway("");
        setUsePlan("");
        setUserPerspectiveGuess("");
        setMissingActorGuess1("");
        setMissingActorGuess2("");
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
      mode,
      realText,
      customScenarioText,
      level,
      setError,
      setExercise,
      setLoading,
      setPerspectiveStructured,
      setStep,
      setTakeaway,
      usePlan,
      setUsePlan,
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
        setMode("custom_scenario");
        setCustomScenarioText(data.customScenarioText);
      } else if (data?.source === "real_data" && data.realDataText) {
        setMode("real_data");
        setRealText(data.realDataText);
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
    if (highlights.length > 0) {
      const ok = window.confirm("Discard current work and regenerate?");
      if (!ok) return;
    }
    setError(null);
    void startGenerate();
  };

  /** `base` lets a caller pass a row it just updated, before state catches up. */
  const submitHighlightsAndConfidence = async (
    base?: AnalyticalExerciseRow,
  ) => {
    const ex = base ?? exercise;
    if (!ex) return;
    if (perspectiveText != null) {
      advance(4);
      return;
    }
    // Zero highlights is a real answer for a passage the user finds sound; the
    // highlight step confirms it before getting here.
    setError(null);
    setLoading(true);
    try {
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ex.title,
          passage: ex.passage,
          embeddedIssues: ex.embeddedIssues,
          validPoints: ex.validPoints,
          userHighlights: highlights,
          confidenceBefore: confidence,
          domain: ex.domain,
          userContext: userContext || undefined,
          hiddenPerspective: ex.hiddenPerspective,
          missingActors: ex.missingActors,
          userPerspectiveGuess: ex.userPerspectiveGuess,
          userMissingActorsGuess: ex.userMissingActorsGuess,
          metaGuessScore: ex.metaGuessScore,
          geoGuess: ex.geoGuess ?? undefined,
          lensLines:
            geoCfg && ex.lensQuestions?.length
              ? geoLensLines(ex, geoCfg)
              : undefined,
        }),
      });
      const json = await safeAiJson<unknown>(res);
      const parsed = parsePerspectiveFetchJson(json, "analytical");
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      setPerspectiveText(parsed.text);
      setPerspectiveStructured(parsed.structured);
      const partial: AnalyticalExerciseRow = {
        ...ex,
        userHighlights: highlights,
        result: scoreAnalytical({
          passage: ex.passage,
          embeddedIssues: ex.embeddedIssues,
          validPoints: ex.validPoints,
          highlights,
        }),
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

  /** Finish the 3-step loop: save the exercise with the optional takeaway (P2.2). */
  const finishExercise = async () => {
    if (!exercise || !perspectiveText || finishing) return;
    setError(null);
    const finalEx: AnalyticalExerciseRow = {
      ...exercise,
      userHighlights: highlights,
      confidenceBefore: confidence,
      aiPerspective: perspectiveText,
      aiPerspectiveStructured:
        perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null,
    };
    await finish(finalEx);
  };

  const submitMetaGuess = async () => {
    if (!exercise?.isGeopolitics) return;
    if (geoCfg && exercise.perspectiveOptions?.length) {
      const missing = geoGuessMissing(exercise, geoCfg);
      if (missing) {
        setError(missing);
        return;
      }
      setError(null);
      const guess = scoreGeoGuess({
        hiddenPerspective: exercise.hiddenPerspective ?? "",
        perspectiveOptions: exercise.perspectiveOptions,
        perspectiveChoice: exercise.perspectiveChoice,
        missingActors: exercise.missingActors ?? [],
        actorChoices: exercise.actorChoices ?? [],
        lensQuestions: exercise.lensQuestions ?? [],
        lensAnswers: exercise.lensAnswers ?? {},
        lensFree: geoCfg.lenses === "free",
      });
      const picked =
        exercise.perspectiveChoice != null
          ? exercise.perspectiveOptions[exercise.perspectiveChoice]
          : "";
      const partial: AnalyticalExerciseRow = {
        ...exercise,
        userPerspectiveGuess: exercise.userPerspectiveGuess?.trim() || picked,
        userMissingActorsGuess: exercise.actorChoices ?? [],
        metaGuessScore: guess.score,
        geoGuess: guess,
      };
      setExercise(partial);
      await submitHighlightsAndConfidence(partial);
      return;
    }
    const perspective = userPerspectiveGuess.trim();
    const actors = [missingActorGuess1, missingActorGuess2]
      .map((a) => a.trim())
      .filter(Boolean);
    if (!perspective) {
      setError("Describe whose perspective you think this passage reflects.");
      return;
    }
    if (actors.length < 1) {
      setError("Name at least one missing actor or perspective.");
      return;
    }
    setError(null);
    const score = computeMetaGuessScore(
      exercise.hiddenPerspective ?? "",
      exercise.missingActors ?? [],
      perspective,
      actors,
    );
    const partial: AnalyticalExerciseRow = {
      ...exercise,
      userPerspectiveGuess: perspective,
      userMissingActorsGuess: actors,
      metaGuessScore: score,
    };
    setExercise(partial);
    await submitHighlightsAndConfidence(partial);
  };

  const phase = practicePhase(step, FEEDBACK_STEP);
  // Older rows have no level: they were made before levels, with sentence taps.
  // Geopolitics rows made before levels ran at Expert.
  const exerciseLevel: PracticeLevel | null = exercise
    ? exercise.isGeopolitics
      ? (exercise.level ?? "expert")
      : (exercise.level ?? "standard")
    : null;
  const geoCfg =
    exercise?.isGeopolitics && exerciseLevel
      ? GEO_ANALYTICAL_LEVELS[exerciseLevel]
      : null;
  const plainConfig = exerciseLevel ? ANALYTICAL_LEVELS[exerciseLevel] : null;
  // Geopolitics uses its own selection, hints and check questions, and no walkthrough.
  const levelConfig = geoCfg
    ? {
        ...plainConfig!,
        walkthrough: false,
        selectionMode: geoCfg.selectionMode,
        countHint: geoCfg.countHint,
        checkQuestions: geoCfg.checkQuestions,
      }
    : plainConfig;
  const saveRow = (patch: Partial<AnalyticalExerciseRow>) => {
    if (!exercise) return;
    const updated = { ...exercise, ...patch, userHighlights: highlights };
    setExercise(updated);
    void putExercise(updated);
  };
  const walkCandidates = useMemo(
    () =>
      exercise && levelConfig?.walkthrough ? guidedCandidatesFor(exercise) : [],
    [exercise, levelConfig?.walkthrough],
  );
  const walkPart =
    exercise && levelConfig?.walkthrough
      ? guidedPart(exercise, walkCandidates.length)
      : null;
  /** Save walkthrough progress (and the answer it just recorded) right away. */
  const onWalkProgress = (
    patch: { mainClaimAnswer?: number; guidedIndex?: number },
    nextHighlights?: UserHighlight[],
  ) => {
    if (!exercise) return;
    if (nextHighlights) setHighlights(nextHighlights);
    const updated: AnalyticalExerciseRow = {
      ...exercise,
      ...patch,
      userHighlights: nextHighlights ?? highlights,
    };
    setExercise(updated);
    void putExercise(updated);
  };
  const feedbackStructured =
    perspectiveStructured ?? exercise?.aiPerspectiveStructured ?? null;
  const feedbackResult = useMemo(
    () =>
      exercise
        ? analyticalResultOf({ ...exercise, userHighlights: highlights })
        : null,
    [exercise, highlights],
  );
  // Geopolitics splits the work into highlight + perspective guess.
  const partLabel =
    phase === 1 && exercise?.isGeopolitics
      ? exercise.learnDone === false
        ? "Part 1 of 3 · Learn first"
        : step === 1
          ? exercise.concepts?.length
            ? "Part 2 of 3 · Highlight & tag"
            : "Part 1 of 2 · Highlight & tag"
          : exercise.concepts?.length
            ? "Part 3 of 3 · Viewpoint & lenses"
            : "Part 2 of 2 · Perspective guess"
      : phase === 1 && walkPart
        ? walkPart === "main-claim"
          ? "Part 1 of 2 · Main claim"
          : "Part 2 of 2 · Check each sentence"
        : undefined;

  return {
    domain,
    setDomain,
    domainSuggestions,
    setDomainSuggestions,
    highlights,
    setHighlights,
    perspectiveText,
    setPerspectiveText,
    userPerspectiveGuess,
    setUserPerspectiveGuess,
    missingActorGuess1,
    setMissingActorGuess1,
    missingActorGuess2,
    setMissingActorGuess2,
    mode,
    setMode,
    entryMode,
    setEntryMode,
    customScenarioText,
    setCustomScenarioText,
    realText,
    setRealText,
    realWordCount,
    setRealWordCount,
    pasteNotice,
    setPasteNotice,
    autoGenerateReady,
    setAutoGenerateReady,
    showToast,
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
    advance,
    finish,
    flow,
    realTextareaRef,
    realSanitizedPreview,
    chooseLevel,
    startGenerate,
    autoGenerateTriggered,
    handoffRead,
    regenerate,
    submitHighlightsAndConfidence,
    finishExercise,
    submitMetaGuess,
    phase,
    exerciseLevel,
    geoCfg,
    plainConfig,
    levelConfig,
    saveRow,
    walkCandidates,
    walkPart,
    onWalkProgress,
    feedbackStructured,
    feedbackResult,
    partLabel,
  };
}

export type AnalyticalFlowState = ReturnType<typeof useAnalyticalFlow>;
