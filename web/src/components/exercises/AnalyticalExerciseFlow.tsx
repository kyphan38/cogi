"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExerciseShell, practicePhase, practiceStepLabels } from "@/components/shared/ExerciseShell";
import { HighlightTag } from "@/components/exercises/HighlightTag";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { AIPerspective } from "@/components/shared/AIPerspective";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/toast";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import type {
  AnalyticalExerciseRow,
  UserHighlight,
} from "@/lib/types/exercise";
import type { AnalyticalExercise } from "@/lib/ai/validators/common";
import { getLanguageLevelForRequest } from "@/lib/db/settings";
import { putExercise, getExercise } from "@/lib/db/exercises";
import { getUserContext } from "@/lib/db/settings";
import { completePracticeExercise } from "@/lib/db/complete-exercise";
import { useSaveOnLeave } from "@/lib/hooks/useSaveOnLeave";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import { sanitizeRealDataText } from "@/lib/text/sanitizeRealData";
import { sanitizeUserPasteOrClipboard } from "@/lib/text/sanitizeRealDataBrowser";
import { DomainInput } from "@/components/shared/DomainInput";
import { TopicSuggestionPicker } from "@/components/shared/TopicSuggestionPicker";
import { listRecentDomains } from "@/lib/db/exercises";
import { isAnalyticalExercise } from "@/lib/types/exercise";
import { resolveDomainAndScenario } from "@/lib/ai/prompts/scenario-steering";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { isGeopoliticsAnalyticalDomain } from "@/lib/exercise/geopolitics-domains";
import { GeopoliticsRealDataHints } from "@/components/exercises/GeopoliticsRealDataHints";
import {
  ExerciseStepCard,
  EXERCISE_STEP_META_BADGE,
} from "@/components/shared/ExerciseStepCard";
import { ANALYTICAL_TAG_OPTIONS, GEOPOLITICS_TAG_OPTIONS } from "@/lib/exercise/tag-labels";
import { computeMetaGuessScore } from "@/lib/analytics/geopolitics-meta-guess";
import { analyticalResultOf, scoreAnalytical } from "@/lib/exercise/analytical-score";
import { AnalyticalAnswerKey } from "@/components/exercises/AnalyticalAnswerKey";
import { requestAnalyticalDeepDive, withDeepDive } from "@/lib/exercise/deep-dive";
import { CheckQuestions } from "@/components/exercises/CheckQuestions";
import {
  GuidedWalkthrough,
  guidedCandidatesFor,
  guidedPart,
} from "@/components/exercises/GuidedWalkthrough";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import { LevelSuggestionCard } from "@/components/shared/LevelSuggestionCard";
import { ANALYTICAL_LEVELS } from "@/lib/exercise/analytical-levels";
import {
  DEFAULT_PRACTICE_LEVEL,
  LEVEL_LABELS,
  type LevelSuggestion,
  type PracticeLevel,
} from "@/lib/exercise/levels";
import { levelSuggestionFor } from "@/lib/exercise/level-suggestion";
import { dismissLevelSuggestion, getPracticeLevel, setPracticeLevel } from "@/lib/db/settings";
import { isAnalyticalCoachingStructured } from "@/lib/types/perspective";

type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Internal step that shows AI feedback (the 3rd practice phase); 7 is "saved". */
const FEEDBACK_STEP = 4;

/**
 * Where an unfinished exercise reopens. Saved before the 3-step loop it may sit on a
 * step that no longer exists: confidence (3) now lives in the last work part (the
 * perspective guess for geopolitics, else the highlight step), and journal / action
 * (5, 6) fold into AI feedback (4).
 */
function analyticalResumeStep(saved: number | undefined, isGeopolitics: boolean): FlowStep {
  const s = saved ?? 1;
  if (s === 3) return isGeopolitics ? 2 : 1;
  if (s >= 5) return 4;
  return s as FlowStep;
}

export function AnalyticalExerciseFlow({
  resumeId,
  initialDomain,
  initialSource,
  autoGenerate,
}: { resumeId?: string; initialDomain?: string; initialSource?: "generated" | "real_data" | "custom_scenario"; autoGenerate?: boolean } = {}) {
  const { show: showToast } = useToast();
  const [step, setStep] = useState<FlowStep>(0);
  const [domain, setDomain] = useState(initialDomain?.trim() ?? "");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [exercise, setExercise] = useState<AnalyticalExerciseRow | null>(null);
  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [confidence, setConfidence] = useState(50);
  const [perspectiveText, setPerspectiveText] = useState<string | null>(null);
  const [perspectiveStructured, setPerspectiveStructured] =
    useState<AIPerspectiveStructured | null>(null);

  const [takeaway, setTakeaway] = useState("");
  const [level, setLevel] = useState<PracticeLevel>(DEFAULT_PRACTICE_LEVEL);
  const [levelSuggestion, setLevelSuggestion] = useState<LevelSuggestion>(null);
  const [finishing, setFinishing] = useState(false);
  const pendingSave = useSaveOnLeave();
  const [userPerspectiveGuess, setUserPerspectiveGuess] = useState("");
  const [missingActorGuess1, setMissingActorGuess1] = useState("");
  const [missingActorGuess2, setMissingActorGuess2] = useState("");

  const [mode, setMode] = useState<"generated" | "real_data" | "custom_scenario">(initialSource ?? "generated");
  const [entryMode, setEntryMode] = useState<"suggested" | "manual">(initialDomain ? "manual" : "suggested");
  const [customScenarioText, setCustomScenarioText] = useState("");
  const [realText, setRealText] = useState("");
  const [realWordCount, setRealWordCount] = useState(0);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const realTextareaRef = useRef<HTMLTextAreaElement>(null);

  const realSanitizedPreview = useMemo(() => sanitizeRealDataText(realText), [realText]);

  useEffect(() => {
    void listRecentDomains(20).then(setDomainSuggestions);
    void getPracticeLevel("analytical").then(setLevel);
  }, []);

  const chooseLevel = (next: PracticeLevel) => {
    setLevel(next);
    void setPracticeLevel("analytical", next);
  };

  const advance = useCallback(
    (next: FlowStep, updatedRow?: AnalyticalExerciseRow) => {
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
      if (!row || row.completedAt || !isAnalyticalExercise(row)) return;
      setExercise(row);
      setHighlights(row.userHighlights ?? []);
      setConfidence(row.confidenceBefore ?? 50);
      if (row.aiPerspective) setPerspectiveText(row.aiPerspective);
      if (row.aiPerspectiveStructured) setPerspectiveStructured(row.aiPerspectiveStructured ?? null);
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
      setTakeaway(row.takeaway ?? "");
      setStep(analyticalResumeStep(row.currentStep, row.isGeopolitics === true));
    })();
  }, [resumeId]);

  useEffect(() => {
    if (resumeId) return;
    const d = initialDomain?.trim();
    if (d) setDomain(d);
  }, [initialDomain, resumeId]);

  useEffect(() => {
    if (!exercise || step === 0 || step === 7) {
      pendingSave.clear();
      return;
    }
    const save = () => {
      void putExercise({ ...exercise, userHighlights: highlights, currentStep: step });
    };
    pendingSave.set(save);
    const timer = setTimeout(() => {
      pendingSave.clear();
      save();
    }, 2000);
    return () => clearTimeout(timer);
  }, [highlights, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const startGenerate = useCallback(async (
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
      const userContext = await getUserContext();
      const userTextForReal = effectiveMode === "real_data" ? sanitizedUserText : undefined;
      const languageLevel = await getLanguageLevelForRequest();
      // Geopolitics passages have no guided form yet, so they always run at Expert.
      const isGeopolitics = isGeopoliticsAnalyticalDomain(effectiveDomain);
      const exerciseLevel: PracticeLevel = isGeopolitics ? "expert" : level;
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: effectiveDomain,
          userContext: userContext || undefined,
          exerciseType: "analytical",
          mode: effectiveMode,
          userText: effectiveMode === "real_data" ? userTextForReal : undefined,
          customScenario: customScenarioBody,
          languageLevel,
          level: exerciseLevel,
        }),
      });
      const json = await safeAiJson<
        | { ok: true; data: AnalyticalExercise }
        | { ok: false; error: string }
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
        originalUserText: effectiveMode === "real_data" ? (sanitizedUserText ?? null) : null,
        isSoundReasoning: data.isSoundReasoning === true,
        isGeopolitics,
        hiddenPerspective: data.hiddenPerspective,
        missingActors: data.missingActors,
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
      setExercise(row);
      setHighlights([]);
      setPerspectiveText(null);
      setPerspectiveStructured(null);
      setTakeaway("");
      setUserPerspectiveGuess("");
      setMissingActorGuess1("");
      setMissingActorGuess2("");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  }, [domain, mode, realText, customScenarioText, level]);

  const autoGenerateTriggered = useRef(false);
  const [autoGenerateReady, setAutoGenerateReady] = useState(false);
  useEffect(() => {
    if (autoGenerateReady || !autoGenerate || resumeId) return;
    try {
      const raw = sessionStorage.getItem("cogi:home-source-text");
      if (raw) {
        sessionStorage.removeItem("cogi:home-source-text");
        const data = JSON.parse(raw) as {
          source?: string;
          customScenarioText?: string;
          realDataText?: string;
        };
        if (data.source === "custom_scenario" && data.customScenarioText) {
          setMode("custom_scenario");
          setCustomScenarioText(data.customScenarioText);
        } else if (data.source === "real_data" && data.realDataText) {
          setMode("real_data");
          setRealText(data.realDataText);
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
    if (highlights.length > 0) {
      const ok = window.confirm("Discard current work and regenerate?");
      if (!ok) return;
    }
    setError(null);
    void startGenerate();
  };

  /** `base` lets a caller pass a row it just updated, before state catches up. */
  const submitHighlightsAndConfidence = async (base?: AnalyticalExerciseRow) => {
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
    pendingSave.clear();
    setError(null);
    setFinishing(true);
    const finalEx: AnalyticalExerciseRow = {
      ...exercise,
      userHighlights: highlights,
      confidenceBefore: confidence,
      aiPerspective: perspectiveText,
      aiPerspectiveStructured: perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null,
    };
    try {
      const saved = await completePracticeExercise({ exercise: finalEx, takeaway });
      setExercise(saved as AnalyticalExerciseRow);
      setStep(7);
      if (!finalEx.isGeopolitics && finalEx.level) {
        void levelSuggestionFor("analytical", finalEx.level)
          .then(setLevelSuggestion)
          .catch(() => setLevelSuggestion(null));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setFinishing(false);
    }
  };

  const submitMetaGuess = async () => {
    if (!exercise?.isGeopolitics) return;
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
  const exerciseLevel: PracticeLevel | null = exercise
    ? exercise.isGeopolitics
      ? "expert"
      : (exercise.level ?? "standard")
    : null;
  const levelConfig = exerciseLevel ? ANALYTICAL_LEVELS[exerciseLevel] : null;
  const walkCandidates = useMemo(
    () => (exercise && levelConfig?.walkthrough ? guidedCandidatesFor(exercise) : []),
    [exercise, levelConfig?.walkthrough],
  );
  const walkPart =
    exercise && levelConfig?.walkthrough ? guidedPart(exercise, walkCandidates.length) : null;
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
  const feedbackStructured = perspectiveStructured ?? exercise?.aiPerspectiveStructured ?? null;
  const feedbackResult = useMemo(
    () => (exercise ? analyticalResultOf({ ...exercise, userHighlights: highlights }) : null),
    [exercise, highlights],
  );
  // Geopolitics splits the work into highlight + perspective guess.
  const partLabel =
    phase === 1 && exercise?.isGeopolitics
      ? step === 1
        ? "Part 1 of 2 · Highlight & tag"
        : "Part 2 of 2 · Perspective guess"
      : phase === 1 && walkPart
        ? walkPart === "main-claim"
          ? "Part 1 of 2 · Main claim"
          : "Part 2 of 2 · Check each sentence"
        : undefined;

  return (
    <ExerciseShell stepIndex={phase} stepLabels={practiceStepLabels("Highlight & tag")} partLabel={partLabel}>
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
        <ExerciseStepCard
          data-testid="analytical-exercise-card"
          title="Analytical exercise"
          description="Generate a passage, then highlight and tag issues before reflecting."
        >
            <LevelPicker
              value={level}
              onChange={chooseLevel}
              descriptions={{
                guided: ANALYTICAL_LEVELS.guided.description,
                standard: ANALYTICAL_LEVELS.standard.description,
                expert: ANALYTICAL_LEVELS.expert.description,
              }}
              note="Geopolitics topics always use Expert for now."
            />
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

            <div className={cn(entryMode !== "suggested" && "hidden")}>
              <TopicSuggestionPicker
                area="analytical"
                kind="exercise"
                onPick={({ title }) => {
                  setMode("generated");
                  setDomain(title);
                  void startGenerate(title, "generated");
                }}
              />
            </div>
            <div className={cn("space-y-4", entryMode !== "manual" && "hidden")}>
            <div className="grid gap-2">
              <Label>{mode === "custom_scenario" ? "Domain (optional)" : "Domain"}</Label>
              <DomainInput
                value={domain}
                onChange={setDomain}
                suggestions={domainSuggestions}
                placeholder={
                  mode === "custom_scenario"
                    ? "e.g. DevOps - leave blank to let AI infer"
                    : undefined
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select
                value={mode}
                onValueChange={(v) =>
                  setMode((v as "generated" | "real_data" | "custom_scenario") ?? "generated")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generated">AI-generated passage</SelectItem>
                  <SelectItem value="real_data">Use my own text</SelectItem>
                  <SelectItem value="custom_scenario">My scenario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <GeopoliticsRealDataHints domain={domain} mode={mode} />
            {mode === "custom_scenario" ? (
              <div className="grid gap-2">
                <Label htmlFor="custom-scenario">
                  Describe your situation - AI will design the passage around it
                </Label>
                <Textarea
                  id="custom-scenario"
                  rows={6}
                  value={customScenarioText}
                  onChange={(e) => setCustomScenarioText(e.target.value)}
                  placeholder="Paste context, stakeholders, and the tension you want to practice..."
                  className="min-h-[5rem]"
                />
                <p className="text-muted-foreground text-xs">
                  Optional domain above steers tone/register; the scenario drives content.
                </p>
              </div>
            ) : null}
            {mode === "real_data" ? (
              <div className="grid gap-2">
                <Label htmlFor="real-text">
                  Paste your own content (up to 2,000 words after sanitization)
                </Label>
                <Textarea
                  ref={realTextareaRef}
                  id="real-text"
                  rows={6}
                  value={realText}
                  onChange={(e) => {
                    setRealText(e.target.value);
                    setPasteNotice(null);
                  }}
                  onPaste={(e) => {
                    const plain = e.clipboardData.getData("text/plain");
                    if (!plain) return;
                    e.preventDefault();
                    const el = realTextareaRef.current;
                    const start = el?.selectionStart ?? realText.length;
                    const end = el?.selectionEnd ?? realText.length;
                    const r = sanitizeUserPasteOrClipboard(plain);
                    if (r.htmlRejected) {
                      setPasteNotice("Blocked unsafe HTML from clipboard. Use plain text.");
                      return;
                    }
                    const next = `${realText.slice(0, start)}${r.text}${realText.slice(end)}`;
                    setRealText(next);
                    if (r.hadBlockedHtml) {
                      setPasteNotice("Some HTML tags were removed from the paste.");
                    } else {
                      setPasteNotice(null);
                    }
                    requestAnimationFrame(() => {
                      if (!el) return;
                      const pos = start + r.text.length;
                      el.selectionStart = pos;
                      el.selectionEnd = pos;
                    });
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={loading}
                    onClick={() => {
                      void (async () => {
                        try {
                          const t = await navigator.clipboard.readText();
                          const r = sanitizeUserPasteOrClipboard(t);
                          if (r.htmlRejected) {
                            setPasteNotice("Blocked unsafe HTML from clipboard.");
                            return;
                          }
                          setRealText(r.text);
                          setRealWordCount(r.wordCount);
                          setPasteNotice(null);
                          showToast(
                            r.hadBlockedHtml
                              ? "Some HTML was flattened to plain text."
                              : "Imported from clipboard.",
                            r.hadBlockedHtml ? "info" : "success",
                          );
                        } catch {
                          showToast(
                            "Could not read clipboard. Grant permission or paste manually.",
                            "error",
                          );
                        }
                      })();
                    }}
                  >
                    Import from clipboard
                  </Button>
                </div>
                {pasteNotice ? (
                  <p className="text-muted-foreground text-xs">{pasteNotice}</p>
                ) : null}
                {realText.trim() ? (
                  <p className="text-muted-foreground text-xs">
                    Words after sanitization (same rules as server): {realSanitizedPreview.wordCount}
                    {realSanitizedPreview.wordCount > 2000 ? (
                      <span className="text-destructive font-medium">
                        {" "}
                        - over 2,000; shorten before generating.
                      </span>
                    ) : null}
                    {realWordCount ? ` · Last generate used: ${realWordCount} words` : null}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Tip: paste an email, plan, or article you want to analyze.
                  </p>
                )}
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
        </ExerciseStepCard>
      ) : null}

      {step === 1 && exercise ? (
        <ExerciseStepCard
          data-testid="analytical-exercise-card"
          title={exercise.title}
          description={
            <>
              Domain: {exercise.domain}
              {exerciseLevel ? (
                <span className={EXERCISE_STEP_META_BADGE}>{LEVEL_LABELS[exerciseLevel]}</span>
              ) : null}
            </>
          }
          bodyClassName="space-y-4"
        >
            {levelConfig?.walkthrough ? (
              <GuidedWalkthrough ex={exercise} highlights={highlights} onProgress={onWalkProgress} />
            ) : (
              <>
                {levelConfig?.countHint === "issues" && !exercise.isSoundReasoning ? (
                  <p className="text-sm text-zinc-900" data-testid="issue-count-hint">
                    This passage has <span className="font-medium">{exercise.embeddedIssues.length} issues</span>{" "}
                    to find.
                  </p>
                ) : null}
                {levelConfig?.checkQuestions === "toggle" ? <CheckQuestions mode="toggle" /> : null}
                <HighlightTag
                  passage={exercise.passage}
                  highlights={highlights}
                  onChange={setHighlights}
                  tagOptions={
                    exercise.isGeopolitics ? GEOPOLITICS_TAG_OPTIONS : ANALYTICAL_TAG_OPTIONS
                  }
                  selectionMode={levelConfig?.selectionMode ?? "sentence"}
                  showQuestions={levelConfig?.checkQuestions !== "hidden"}
                  onSelectionOverlap={() =>
                    setError("Selection overlaps an existing highlight. Remove or adjust first.")
                  }
                />
              </>
            )}
            {/* Geopolitics asks for confidence after the perspective guess instead; the
                guided walkthrough asks once every suggested sentence is checked. */}
            {!exercise.isGeopolitics && (walkPart == null || walkPart === "done") ? (
              <>
                <ConfidenceSlider value={confidence} onChange={setConfidence} />
                {loading ? <PerspectiveLoadingCard /> : null}
              </>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => {
                const updated = { ...exercise, userHighlights: highlights, currentStep: 1 as const };
                setExercise(updated);
                void putExercise(updated);
                setStep(0);
              }}>
                Back
              </Button>
              <Button type="button" variant="secondary" onClick={regenerate}>
                Regenerate
              </Button>
              {walkPart == null || walkPart === "done" ? (
              <Button
                type="button"
                onClick={() => {
                  setError(null);
                  if (highlights.length < 1) {
                    if (exercise.isGeopolitics) {
                      setError("Add at least one highlight.");
                      return;
                    }
                    // A passage can be sound; saying so is a valid answer.
                    if (!window.confirm("You found no problems in this passage. Get feedback anyway?")) {
                      return;
                    }
                  }
                  const updated = { ...exercise, userHighlights: highlights };
                  setExercise(updated);
                  if (exercise.isGeopolitics) advance(2, updated);
                  else void submitHighlightsAndConfidence(updated);
                }}
                disabled={loading}
              >
                {exercise.isGeopolitics
                  ? "Continue to perspective guess"
                  : loading
                    ? "Loading…"
                    : "Get AI feedback"}
              </Button>
              ) : null}
            </div>
        </ExerciseStepCard>
      ) : null}

      {step === 2 && exercise?.isGeopolitics ? (
        <Card>
          <CardHeader>
            <CardTitle>Perspective & missing actors</CardTitle>
            <CardDescription>
              Before seeing the debrief: whose viewpoint is this written from? Which
              stakeholders or perspectives are absent?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="perspective-guess">
                Whose perspective is this written from?
              </Label>
              <Textarea
                id="perspective-guess"
                rows={3}
                placeholder="e.g. US-aligned security think tank, ASEAN small-state pragmatist…"
                value={userPerspectiveGuess}
                onChange={(e) => setUserPerspectiveGuess(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="missing-actor-1">
                Missing actor or perspective (at least one)
              </Label>
              <Input
                id="missing-actor-1"
                value={missingActorGuess1}
                onChange={(e) => setMissingActorGuess1(e.target.value)}
                placeholder="e.g. Vietnam / coastal ASEAN states"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="missing-actor-2">Second missing actor (optional)</Label>
              <Input
                id="missing-actor-2"
                value={missingActorGuess2}
                onChange={(e) => setMissingActorGuess2(e.target.value)}
                placeholder="e.g. fishing communities / informal economy"
              />
            </div>
            <ConfidenceSlider value={confidence} onChange={setConfidence} />
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={loading} onClick={() => {
                void putExercise({ ...exercise, userHighlights: highlights, currentStep: 1 });
                setStep(1);
              }}>
                Back
              </Button>
              <Button type="button" disabled={loading} onClick={() => void submitMetaGuess()}>
                {loading ? "Loading…" : "Get AI feedback"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(step === 4 || step === 7) && exercise && perspectiveText ? (
        <div className="space-y-4">
          {exercise.isGeopolitics && exercise.hiddenPerspective ? (
            <Card>
              <CardHeader>
                <CardTitle>Ground truth reveal</CardTitle>
                <CardDescription>
                  Compare your guesses to what the passage embedded.
                  {typeof exercise.metaGuessScore === "number"
                    ? ` Meta-guess score: ${exercise.metaGuessScore}/100.`
                    : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">Hidden perspective: </span>
                  {exercise.hiddenPerspective}
                </p>
                <p>
                  <span className="font-medium">Missing actors: </span>
                  {(exercise.missingActors ?? []).join("; ")}
                </p>
                {exercise.userPerspectiveGuess ? (
                  <p className="text-muted-foreground">
                    Your perspective guess: {exercise.userPerspectiveGuess}
                  </p>
                ) : null}
                {(exercise.userMissingActorsGuess ?? []).length > 0 ? (
                  <p className="text-muted-foreground">
                    Your missing-actor guesses:{" "}
                    {exercise.userMissingActorsGuess!.join("; ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
          <AnalyticalAnswerKey
            exercise={{ ...exercise, userHighlights: highlights, confidenceBefore: confidence }}
            result={feedbackResult!}
            coaching={isAnalyticalCoachingStructured(feedbackStructured) ? feedbackStructured : null}
            deepDives={exercise.deepDives}
            onRequestDeepDive={async (ref) => {
              const d = await requestAnalyticalDeepDive(exercise, ref);
              setExercise((prev) => (prev ? withDeepDive(prev, ref, d) : prev));
            }}
          />
          {/* Feedback saved before the answer key (clarity v2 or plain text). */}
          {!isAnalyticalCoachingStructured(feedbackStructured) ? (
            <AIPerspective
              text={perspectiveText}
              structured={feedbackStructured}
              perspectiveKind="analytical"
            />
          ) : null}
          {step === 7 && levelSuggestion ? (
            <LevelSuggestionCard
              suggestion={levelSuggestion}
              onAccept={() => {
                chooseLevel(levelSuggestion.to);
                showToast(`Level set to ${LEVEL_LABELS[levelSuggestion.to]} for your next exercise.`);
                setLevelSuggestion(null);
              }}
              onDismiss={() => {
                void dismissLevelSuggestion("analytical");
                setLevelSuggestion(null);
              }}
            />
          ) : null}
          <PracticeFinishCard
            takeaway={takeaway}
            takeawayPlaceholder={
              feedbackResult && (feedbackResult.found < feedbackResult.total || feedbackResult.trapsHit > 0)
                ? "Why was one sentence you missed (or a trap) tricky? One sentence is enough."
                : undefined
            }
            onTakeawayChange={setTakeaway}
            onFinish={finishExercise}
            saving={finishing}
            finished={step === 7}
          />
        </div>
      ) : null}

    </ExerciseShell>
  );
}
