"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { practicePhase } from "@/components/shared/ExerciseShell";
import { ConceptList } from "@/components/exercises/LearnFirst";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import { putExercise } from "@/lib/db/exercises";
import { rememberExerciseInUrl } from "@/lib/nav/exercise-url";
import {
  getLanguageLevelForRequest,
  getPracticeLevel,
  getUserContext,
} from "@/lib/db/settings";
import { getGenerationContext, trackStepFromUrl } from "@/lib/db/generation-context";
import {
  isReframeExercise,
  type ReframeExerciseRow,
} from "@/lib/types/exercise";
import {
  useDebouncedSave,
  useExerciseFlow,
} from "@/components/exercises/flow/useExerciseFlow";
import { takeScenarioText } from "@/lib/topics/scenario-handoff";
import type {
  ReframeAnswer,
  ReframeExercisePayload,
  ReframeThought,
} from "@/lib/ai/validators/reframe";
import type { JudgmentContext } from "@/lib/exercise/judgment-levels";
import {
  answerName,
  FEELING_WORDS,
  REFRAME_LEVELS,
} from "@/lib/exercise/reframe-levels";
import { scoreReframe } from "@/lib/exercise/reframe-score";
import { shuffledOrder } from "@/lib/exercise/guided-candidates";
import { type PracticeLevel } from "@/lib/exercise/levels";
import {
  FlowStep,
  FEEDBACK_STEP,
  PART_LABELS,
  answerOptions,
  answersForScoring,
  TrapPicker,
  TrapGuide,
  FeelingSlider,
} from "@/components/exercises/reframe/shared";

/** State, effects and actions of the Reframe flow; the steps only render. */
export function useReframeFlow({
  resumeId,
  initialDomain,
  initialSource,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const flow = useExerciseFlow<ReframeExerciseRow, FlowStep>({
    type: "reframe",
    resumeId,
    isRow: isReframeExercise,
    onResume: (row) => {
      // Guided: resume at the first thought not answered yet.
      const next = row.thoughts.findIndex((t) => row.answers?.[t.id] == null);
      setThoughtIndex(next >= 0 ? next : Math.max(0, row.thoughts.length - 1));
      setStep(row.aiPerspective ? FEEDBACK_STEP : 1);
    },
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
    usePlan,
    setUsePlan,
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
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [selectedThought, setSelectedThought] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  const handedScenario = useRef<string | null | undefined>(undefined);
  const setupLevel = REFRAME_LEVELS[level];
  const cfg = exercise ? REFRAME_LEVELS[exercise.level] : setupLevel;
  const options = answerOptions(cfg);

  useEffect(() => {
    // A scenario from the New exercise page needs a level with "My situation" (PLAN-topic-ideas.md T2).
    // Read once: in dev, React runs this effect twice and the text is cleared on read.
    if (handedScenario.current === undefined)
      handedScenario.current = resumeId ? null : takeScenarioText();
    const handed = handedScenario.current;
    // `?source=custom_scenario` (a track's "your own" step) opens "My situation" empty.
    const ownOnly = !resumeId && initialSource === "custom_scenario";
    void getPracticeLevel("reframe").then((saved) => {
      if (!handed && !ownOnly) {
        setLevel(saved);
        return;
      }
      setLevel(REFRAME_LEVELS[saved].ownSituation ? saved : "standard");
      setSource("custom_scenario");
      if (handed) setOwnSituation(handed);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Update the row; the effect below saves it a second after the last change. */
  const save = (patch: Partial<ReframeExerciseRow>) => {
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
    if (!REFRAME_LEVELS[next].ownSituation) setSource("generated");
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
        getGenerationContext(),
        getLanguageLevelForRequest(),
      ]);
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseType: "reframe",
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
        | { ok: true; data: ReframeExercisePayload }
        | { ok: false; error: string; safety?: "concern" }
      >(res);
      if (!json.ok) {
        if (json.safety === "concern") setNeedsSupport(true);
        else setError(json.error);
        return;
      }
      const data = json.data;
      const row: ReframeExerciseRow = {
        id: crypto.randomUUID(),
        type: "reframe",
        domain: area.trim(),
        context,
        customScenario:
          source === "custom_scenario" ? ownSituation.trim() : undefined,
        title: data.title,
        scenario: data.scenario,
        concepts: data.concepts,
        conceptChecks: data.conceptChecks,
        thoughts: data.thoughts,
        rewrite: data.rewrite,
        level,
        part: "learn",
        conceptAnswers: [],
        intensityBefore: 50,
        intensityAfter: 50,
        answers: {},
        rewriteChoice: null,
        confidenceBefore: null,
        aiPerspective: null,
        trackStepId: trackStepFromUrl(),
        createdAt: new Date().toISOString(),
        completedAt: null,
        currentStep: 1,
      };
      await putExercise(row);
      rememberExerciseInUrl(row);
      setExercise(row);
      setThoughtIndex(0);
      setSelectedThought(null);
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

  const rewriteMissing = (ex: ReframeExerciseRow): string | null => {
    if (cfg.rewrite === "choose")
      return ex.rewriteChoice == null
        ? "Pick the most balanced thought."
        : null;
    if (
      cfg.rewrite === "evidence" &&
      (!ex.evidenceFor?.trim() || !ex.evidenceAgainst?.trim())
    ) {
      return "Write the evidence for and against the thought.";
    }
    return (ex.balancedThought?.trim().length ?? 0) < 10
      ? "Write your balanced thought (a full sentence)."
      : null;
  };

  const getFeedback = async () => {
    if (!exercise) return;
    setError(null);
    setNeedsSupport(false);
    const missing = rewriteMissing(exercise);
    if (missing) {
      setError(missing);
      return;
    }
    setLoading(true);
    pendingSave.clear();
    try {
      const row: ReframeExerciseRow = {
        ...exercise,
        answers: answersForScoring(exercise),
        confidenceBefore: confidence,
      };
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "reframe",
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
      const result = scoreReframe({
        thoughts: row.thoughts,
        answers: row.answers ?? {},
        rewrite: row.rewrite,
        rewriteChoice: row.rewriteChoice,
        rewriteWritten: cfg.rewrite !== "choose",
      });
      const next: ReframeExerciseRow = {
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

  const rewriteOrder = useMemo(
    () =>
      exercise
        ? shuffledOrder(
            exercise.rewrite.options.length,
            `${exercise.id}-rewrite`,
          )
        : [],
    [exercise],
  );

  const phase = practicePhase(step, FEEDBACK_STEP);
  const part = exercise?.part ?? "learn";
  const partLabel = phase === 1 ? PART_LABELS[part] : undefined;
  const answers = exercise?.answers ?? {};
  const setAnswer = (id: string, a: ReframeAnswer) =>
    save({ answers: { ...answers, [id]: a } });
  const thoughtsDone =
    exercise != null &&
    (cfg.layout === "monologue" ||
      exercise.thoughts.every((t) => answers[t.id] != null));
  const target = exercise?.thoughts.find(
    (t) => t.id === exercise.rewrite.thoughtId,
  );
  const trapCount =
    exercise?.thoughts.filter((t) => t.trap !== "realistic").length ?? 0;

  const countHint =
    !exercise || cfg.countHint === null
      ? "Mark only the thoughts you think are traps. Some, or even most, may be fair."
      : cfg.countHint === "traps"
        ? `${trapCount} of these ${exercise.thoughts.length} thoughts are traps.`
        : `${trapCount} of these thoughts are traps and ${exercise.thoughts.length - trapCount} is realistic.`;

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

  const feelingBlock = exercise ? (
    <div className="space-y-3" data-testid="feeling-step">
      <p className="text-body font-medium text-foreground">
        First, name the main feeling. Be specific.
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Main feeling"
      >
        {FEELING_WORDS.map((w) => (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={exercise.feeling === w}
            onClick={() => save({ feeling: w })}
            className={cn(
              "rounded-md border px-3 py-1.5 text-body",
              exercise.feeling === w
                ? "border-foreground bg-primary text-primary-foreground"
                : "border-border hover:bg-muted",
            )}
          >
            {w}
          </button>
        ))}
      </div>
      <FeelingSlider
        id="intensity-before"
        label="How strong is it?"
        value={exercise.intensityBefore ?? 50}
        onChange={(v) => save({ intensityBefore: v })}
      />
    </div>
  ) : null;

  /** Guided: one thought per screen; the first pick is kept and the answer shown. */
  const oneByOne = (ex: ReframeExerciseRow) => {
    const i = Math.min(thoughtIndex, ex.thoughts.length - 1);
    const t = ex.thoughts[i]!;
    const picked = answers[t.id];
    const right =
      picked != null &&
      (picked === t.trap ||
        (picked !== "realistic" && t.alsoAccepted.includes(picked)));
    return (
      <div className="space-y-3" data-testid="thought-question">
        <p className="text-muted-foreground text-meta">
          Thought {i + 1} of {ex.thoughts.length}
        </p>
        <blockquote className="border-l-2 border-foreground pl-3 text-body italic text-foreground">
          {t.text}
        </blockquote>
        <TrapPicker
          options={options}
          picked={picked}
          onPick={(a) => setAnswer(t.id, a)}
          disabled={picked != null}
          label={`Which trap is in: ${t.text}`}
          showQuestions
        />
        {picked != null ? (
          <>
            <p
              className="flex items-start gap-2 text-body"
              data-testid="thought-feedback"
            >
              {right ? (
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
              ) : (
                <X className="mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              <span>
                <span className="font-medium">
                  {right
                    ? "Right. "
                    : `Not quite: it is ${answerName(t.trap)}. `}
                </span>
                {t.why}
              </span>
            </p>
            <Button
              type="button"
              disabled={!ex.feeling}
              onClick={() => {
                if (i < ex.thoughts.length - 1) setThoughtIndex(i + 1);
                else save({ part: "reframe", spotLocked: true });
              }}
            >
              {i < ex.thoughts.length - 1
                ? "Next thought"
                : "Reframe a thought"}
            </Button>
          </>
        ) : null}
      </div>
    );
  };

  const listLayout = (ex: ReframeExerciseRow) => (
    <div className="space-y-5">
      <TrapGuide options={options} />
      {ex.thoughts.map((t, i) => (
        <div key={t.id} className="space-y-2" data-testid="thought-question">
          <p className="text-muted-foreground text-meta">Thought {i + 1}</p>
          <blockquote className="border-l-2 border-foreground pl-3 italic text-foreground">
            {t.text}
          </blockquote>
          <TrapPicker
            options={options}
            picked={answers[t.id]}
            onPick={(a) => setAnswer(t.id, a)}
            disabled={ex.spotLocked === true}
            label={`Which trap is in: ${t.text}`}
            showQuestions={false}
          />
        </div>
      ))}
    </div>
  );

  const monologue = (ex: ReframeExerciseRow) => {
    const sel: ReframeThought | undefined = ex.thoughts.find(
      (t) => t.id === selectedThought,
    );
    return (
      <div className="space-y-4">
        <TrapGuide options={options} />
        <p className="text-muted-foreground text-meta">
          Tap a thought to mark it. Leave fair thoughts as they are.
        </p>
        <p
          className="border-l-2 border-border pl-4 text-body leading-[1.75] text-foreground"
          data-testid="monologue"
        >
          {ex.thoughts.map((t) => {
            const a = answers[t.id];
            const marked = a != null && a !== "realistic";
            return (
              <span key={t.id}>
                <button
                  type="button"
                  aria-pressed={selectedThought === t.id}
                  onClick={() => setSelectedThought(t.id)}
                  className={cn(
                    "rounded px-0.5 text-left",
                    selectedThought === t.id
                      ? "bg-border"
                      : marked
                        ? "bg-muted"
                        : "bg-foreground/5 hover:bg-foreground/10",
                  )}
                >
                  {t.text}
                </button>
                {marked ? (
                  <span className="text-muted-foreground ml-1 text-meta">
                    [{answerName(a)}]
                  </span>
                ) : null}{" "}
              </span>
            );
          })}
        </p>
        {sel ? (
          <div className="space-y-2" data-testid="thought-question">
            <p className="text-body font-medium text-foreground">
              &ldquo;{sel.text}&rdquo;
            </p>
            <TrapPicker
              options={options}
              picked={answers[sel.id]}
              onPick={(a) => setAnswer(sel.id, a)}
              disabled={ex.spotLocked === true}
              label={`Which trap is in: ${sel.text}`}
              showQuestions={false}
            />
          </div>
        ) : null}
      </div>
    );
  };

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
    thoughtIndex,
    setThoughtIndex,
    selectedThought,
    setSelectedThought,
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
    usePlan,
    setUsePlan,
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    pendingSave,
    flow,
    handedScenario,
    setupLevel,
    cfg,
    options,
    save,
    autosaveRow,
    chooseLevel,
    generate,
    rewriteMissing,
    getFeedback,
    finish,
    rewriteOrder,
    phase,
    part,
    partLabel,
    answers,
    setAnswer,
    thoughtsDone,
    target,
    trapCount,
    countHint,
    scenarioBlock,
    feelingBlock,
    oneByOne,
    listLayout,
    monologue,
  };
}

export type ReframeFlowState = ReturnType<typeof useReframeFlow>;
