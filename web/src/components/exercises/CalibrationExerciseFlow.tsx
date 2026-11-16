"use client";

import { useState } from "react";
import { ExerciseShell, practicePhase, practiceStepLabels } from "@/components/shared/ExerciseShell";
import { ExerciseStepCard, EXERCISE_STEP_META_BADGE } from "@/components/shared/ExerciseStepCard";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { LevelSuggestionPrompt } from "@/components/exercises/flow/LevelSuggestionPrompt";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import { LearnFirst } from "@/components/exercises/LearnFirst";
import { CalibrationAnswerKey } from "@/components/exercises/CalibrationAnswerKey";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import { listCompletedExercises, putExercise } from "@/lib/db/exercises";
import { rememberExerciseInUrl } from "@/lib/nav/exercise-url";
import { getUserContext } from "@/lib/db/settings";
import { isCalibrationExercise, type CalibrationExerciseRow } from "@/lib/types/exercise";
import { isCoachingStructured } from "@/lib/types/perspective";
import { useDebouncedSave, useExerciseFlow } from "@/components/exercises/flow/useExerciseFlow";
import { CALIBRATION_CATEGORIES } from "@/lib/exercise/calibration-bank";
import { catalogGroupOf } from "@/lib/exercise/exercise-domain-catalog";
import { GEOPOLITICS_DOMAIN_GROUPS } from "@/lib/exercise/geopolitics-domains";
import {
  BINARY_CONFIDENCE_STEPS,
  CALIBRATION_CHECKS,
  CALIBRATION_CONCEPTS,
  CALIBRATION_LEVELS,
} from "@/lib/exercise/calibration-levels";
import {
  BASE_RATE_POPULATION,
  buildCalibrationItems,
  calibrationTopicFor,
  type BaseRateItem,
  type CalibrationItem,
  type CalibrationTopic,
} from "@/lib/exercise/calibration-math";
import { scoreCalibration, type CalibrationAnswer } from "@/lib/exercise/calibration-score";
import { LEVEL_LABELS, type PracticeLevel } from "@/lib/exercise/levels";

type FlowStep = 0 | 1 | 4 | 7;
/** Internal step that shows AI feedback (the 3rd practice phase); 7 is "saved". */
const FEEDBACK_STEP = 4;

const PART_LABELS = {
  learn: "Part 1 of 2 · Learn first",
  answer: "Part 2 of 2 · Answer and say how sure",
} as const;

const TOPICS: CalibrationTopic[] = ["Mixed", ...CALIBRATION_CATEGORIES];

/** The Practice-page group a domain comes from, so the topic can start close to it. */
function groupIdOf(domain: string): string | undefined {
  const d = domain.trim();
  return catalogGroupOf(d)?.id ?? GEOPOLITICS_DOMAIN_GROUPS.find((g) => (g.domains as readonly string[]).includes(d))?.id;
}

/** "1,200" or "1 200" -> 1200; empty or not a number -> undefined. */
export function parseNumber(text: string): number | undefined {
  const t = text.replace(/[,\s]/g, "");
  if (!t) return undefined;
  const v = Number(t);
  return Number.isFinite(v) ? v : undefined;
}

const fmt = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 1 });

function isAnswered(item: CalibrationItem, a: CalibrationAnswer | undefined): boolean {
  if (!a) return false;
  if (item.kind === "binary") return a.choice != null && a.confidence != null;
  if (item.kind === "interval") return a.low != null && a.high != null;
  return a.estimate != null;
}

/** The "out of 10,000" table for a base-rate problem (first test only). */
export function FrequencyTable({ item }: { item: BaseRateItem }) {
  const c = item.counts;
  const l = item.labels;
  return (
    <div className="border-t border-border pt-3 text-body" data-testid="frequency-table">
      <p className="font-medium">
        Out of {fmt(BASE_RATE_POPULATION)} {l.unit}:
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li>
          {fmt(c.has)} {l.has}. {fmt(c.truePositives)} of them {l.positive}.
        </li>
        <li>
          {fmt(c.hasNot)} {l.hasNot}. {fmt(c.falsePositives)} of them still {l.positive}.
        </li>
      </ul>
      <p className="text-muted-foreground mt-1">
        Of all the {l.unit} that {l.positive}, how many really {l.has}?
      </p>
    </div>
  );
}

/** Calibration: how sure vs how right (PLAN-psychology.md P2). Built in code; the AI only coaches. */
export function CalibrationExerciseFlow({
  resumeId,
  initialDomain,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const flow = useExerciseFlow<CalibrationExerciseRow, FlowStep>({
    type: "calibration",
    resumeId,
    isRow: isCalibrationExercise,
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
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    pendingSave,
  } = flow;
  const [topic, setTopic] = useState<CalibrationTopic>(() =>
    calibrationTopicFor(initialDomain, initialDomain ? groupIdOf(initialDomain) : undefined),
  );
  /** What is typed in number boxes, so "1." or "1,2" stays while typing. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openTips, setOpenTips] = useState<Record<string, boolean>>({});

  const setupLevel = CALIBRATION_LEVELS[level];
  const cfg = exercise ? CALIBRATION_LEVELS[exercise.level] : setupLevel;

  const save = (patch: Partial<CalibrationExerciseRow>) => {
    setExercise((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const autosaveRow = step === 1 ? exercise : null;
  useDebouncedSave(pendingSave, autosaveRow ? () => void putExercise(autosaveRow) : null, 1000, [exercise, step]);

  const chooseLevel = (next: PracticeLevel) => {
    flow.chooseLevel(next);
  };

  const generate = async () => {
    setError(null);
    setLoading(true);
    try {
      // Questions from earlier exercises go last (oldest first), so repeats come only when the topic runs out.
      const seen = new Map<string, string>();
      try {
        const done = await listCompletedExercises({ type: "calibration" });
        for (const r of done) {
          if (!isCalibrationExercise(r)) continue;
          const at = r.completedAt ?? r.createdAt;
          for (const x of r.items) if ((seen.get(x.id) ?? "") < at) seen.set(x.id, at);
        }
      } catch {
        // No history yet (or offline): any order is fine.
      }
      const id = crypto.randomUUID();
      const row: CalibrationExerciseRow = {
        id,
        type: "calibration",
        domain: topic,
        title: `How sure are you? ${topic}`,
        items: buildCalibrationItems({ id, level, topic, seenAt: seen }),
        concepts: [...CALIBRATION_CONCEPTS],
        conceptChecks: [...CALIBRATION_CHECKS],
        level,
        part: "learn",
        conceptAnswers: [],
        answers: {},
        confidenceBefore: null,
        aiPerspective: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        currentStep: 1,
      };
      await putExercise(row);
      rememberExerciseInUrl(row);
      setExercise(row);
      setDrafts({});
      setOpenTips({});
      setPerspectiveStructured(null);
      setTakeaway("");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the exercise");
    } finally {
      setLoading(false);
    }
  };

  const answers = exercise?.answers ?? {};
  const setAnswer = (id: string, patch: CalibrationAnswer) =>
    save({ answers: { ...answers, [id]: { ...answers[id], ...patch } } });
  const numberBox = (id: string, field: "low" | "high" | "estimate", label: string, suffix?: string) => {
    const key = `${id}-${field}`;
    const stored = answers[id]?.[field];
    return (
      <div className="grid gap-1">
        <Label htmlFor={key} className="text-meta">
          {label}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={key}
            inputMode="decimal"
            autoComplete="off"
            value={drafts[key] ?? (stored != null ? String(stored) : "")}
            onChange={(e) => {
              setDrafts((d) => ({ ...d, [key]: e.target.value }));
              setAnswer(id, { [field]: parseNumber(e.target.value) });
            }}
          />
          {suffix ? <span className="text-muted-foreground shrink-0 text-body">{suffix}</span> : null}
        </div>
      </div>
    );
  };

  const getFeedback = async () => {
    if (!exercise) return;
    setError(null);
    const missing = exercise.items.filter((it) => !isAnswered(it, answers[it.id])).length;
    if (missing > 0) {
      setError(`Answer every question first (${missing} left). A guess is fine: just say how sure you are.`);
      return;
    }
    setLoading(true);
    pendingSave.clear();
    try {
      const row: CalibrationExerciseRow = { ...exercise, confidenceBefore: confidence };
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "calibration", exercise: row, userContext: userContext || undefined }),
      });
      const parsed = parsePerspectiveFetchJson(await safeAiJson<unknown>(res), "analytical");
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const result = scoreCalibration({ items: row.items, answers: row.answers ?? {}, intervalTarget: cfg.intervalTarget });
      const next: CalibrationExerciseRow = {
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

  const phase = practicePhase(step, FEEDBACK_STEP);
  const part = exercise?.part ?? "learn";
  const partLabel = phase === 1 ? PART_LABELS[part] : undefined;
  const tip = (key: string, mode: "shown" | "toggle" | "none", label: string, body: React.ReactNode) =>
    mode === "none" ? null : mode === "shown" || openTips[key] ? (
      body
    ) : (
      <button
        type="button"
        className="text-muted-foreground text-meta hover:text-foreground active:text-foreground"
        onClick={() => setOpenTips((t) => ({ ...t, [key]: true }))}
      >
        {label}
      </button>
    );

  const itemCard = (item: CalibrationItem, i: number) => {
    const a = answers[item.id];
    return (
      <div key={item.id} className="space-y-3 border-t border-border pt-4" data-testid="calibration-item">
        <p className="text-muted-foreground text-meta">
          Question {i + 1} of {exercise!.items.length}
          {item.kind === "baserate" ? " · Base rate" : null}
          {item.kind !== "baserate" && item.seenBefore ? (
            <span data-testid="seen-before"> · Seen before, not counted in your History chart</span>
          ) : null}
        </p>
        {item.kind === "baserate" ? <p className="text-body leading-relaxed">{item.story}</p> : null}
        <p className="text-body font-medium text-foreground">{item.question}</p>

        {item.kind === "binary" ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={item.question}>
              {item.options.map((o, oi) => (
                <button
                  key={oi}
                  type="button"
                  role="radio"
                  aria-checked={a?.choice === oi}
                  onClick={() => setAnswer(item.id, { choice: oi as 0 | 1 })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-body",
                    a?.choice === oi ? "border-foreground bg-muted font-medium" : "border-border hover:bg-muted",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-meta font-medium">How sure are you?</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`How sure: ${item.question}`}>
                {BINARY_CONFIDENCE_STEPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={a?.confidence === c}
                    onClick={() => setAnswer(item.id, { confidence: c })}
                    className={cn(
                      "rounded-md border px-3 py-1 text-body tabular-nums",
                      a?.confidence === c ? "border-foreground bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                    )}
                  >
                    {c}%
                  </button>
                ))}
              </div>
              {i === 0 ? <p className="text-muted-foreground text-meta">50% means a pure guess. 100% means you would bet anything on it.</p> : null}
            </div>
          </>
        ) : null}

        {item.kind === "interval" ? (
          <>
            <p className="text-muted-foreground text-meta">
              Give a range you are {cfg.intervalTarget}% sure holds the answer ({item.unit}).
            </p>
            <div className="grid grid-cols-2 gap-3">
              {numberBox(item.id, "low", "Low", item.unit)}
              {numberBox(item.id, "high", "High", item.unit)}
            </div>
            {tip(
              `range-${item.id}`,
              cfg.rangeTip,
              "Show a tip",
              <p className="text-muted-foreground text-meta">
                Tip: most people make ranges too narrow.
              </p>,
            )}
          </>
        ) : null}

        {item.kind === "baserate" ? (
          <>
            {tip(`table-${item.id}`, item.twoStep ? "none" : cfg.frequencyTable, "Show the table for 10,000", <FrequencyTable item={item} />)}
            <div className="max-w-48">{numberBox(item.id, "estimate", "Your answer", "%")}</div>
          </>
        ) : null}
      </div>
    );
  };

  const answeredCount = exercise ? exercise.items.filter((it) => isAnswered(it, answers[it.id])).length : 0;

  return (
    <ExerciseShell stepIndex={phase} stepLabels={practiceStepLabels("Think it through")} partLabel={partLabel} title="Calibration" sub="Say how sure you are, then check.">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === 0 ? (
        <ExerciseStepCard
          data-testid="calibration-setup"
        >
          <LevelPicker
            value={level}
            onChange={chooseLevel}
            descriptions={{
              guided: CALIBRATION_LEVELS.guided.description,
              standard: CALIBRATION_LEVELS.standard.description,
              expert: CALIBRATION_LEVELS.expert.description,
            }}
            note={`Takes ${setupLevel.minutes}. Answers are checked, not AI.`}
          />
          <div className="grid gap-2">
            <Label>Topic</Label>
            <div className="flex flex-wrap gap-2" data-testid="calibration-topics">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={topic === t}
                  onClick={() => setTopic(t)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-body",
                    topic === t ? "border-foreground bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground text-meta">Base-rate problems are the same for every topic.</p>
          </div>
          <div>
            <Button type="button" disabled={loading} onClick={() => void generate()}>
              Start exercise
            </Button>
          </div>
        </ExerciseStepCard>
      ) : null}

      {step === 1 && exercise ? (
        <ExerciseStepCard
          data-testid="calibration-exercise-card"
          title={exercise.title}
          description={
            <>
              {exercise.domain}
              <span className={EXERCISE_STEP_META_BADGE}>{LEVEL_LABELS[exercise.level]}</span>
            </>
          }
          bodyClassName="space-y-5"
        >
          {part === "learn" ? (
            <LearnFirst
              concepts={exercise.concepts}
              checks={exercise.conceptChecks}
              answers={exercise.conceptAnswers ?? []}
              seed={exercise.id}
              onAnswer={(ci, oi) => {
                const next = [...(exercise.conceptAnswers ?? [])];
                next[ci] = oi;
                save({ conceptAnswers: next });
              }}
              onDone={() => save({ part: "answer" })}
            />
          ) : null}

          {part === "answer" ? (
            <>
              <p className="text-muted-foreground text-body">
                Don&apos;t look anything up.
              </p>
              <div className="space-y-4">{exercise.items.map(itemCard)}</div>
              <p className="text-muted-foreground text-meta" data-testid="answered-count">
                {answeredCount} of {exercise.items.length} answered
              </p>
              <ConfidenceSlider
                value={confidence}
                onChange={setConfidence}
                label="Overall, how well do you think you did?"
              />
              {loading ? <PerspectiveLoadingCard /> : null}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" disabled={loading} onClick={() => save({ part: "learn" })}>
                  Back
                </Button>
                <Button type="button" disabled={loading} onClick={() => void getFeedback()}>
                  {loading ? "Loading…" : "Check my answers"}
                </Button>
              </div>
            </>
          ) : null}
        </ExerciseStepCard>
      ) : null}

      {(step === FEEDBACK_STEP || step === 7) && exercise?.result ? (
        <div className="space-y-4">
          <CalibrationAnswerKey
            exercise={exercise}
            result={exercise.result}
            coaching={isCoachingStructured(perspectiveStructured) ? perspectiveStructured : null}
          />
          {step === 7 && levelSuggestion ? (
            <LevelSuggestionPrompt
              type="calibration"
              suggestion={levelSuggestion}
              onChoose={chooseLevel}
              onClose={() => setLevelSuggestion(null)}
            />
          ) : null}
          <PracticeFinishCard
            takeaway={takeaway}
            onTakeawayChange={setTakeaway}
            onFinish={finish}
            saving={finishing}
            finished={step === 7}
            takeawayPlaceholder="Where in real life are you more sure than you should be?"
          />
        </div>
      ) : null}
    </ExerciseShell>
  );
}
