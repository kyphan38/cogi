"use client";

import { useState } from "react";
import { practicePhase } from "@/components/shared/ExerciseShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import { listCompletedExercises, putExercise } from "@/lib/db/exercises";
import { rememberExerciseInUrl } from "@/lib/nav/exercise-url";
import { getUserContext } from "@/lib/db/settings";
import {
  isCalibrationExercise,
  type CalibrationExerciseRow,
} from "@/lib/types/exercise";
import {
  useDebouncedSave,
  useExerciseFlow,
} from "@/components/exercises/flow/useExerciseFlow";
import {
  BINARY_CONFIDENCE_STEPS,
  CALIBRATION_CHECKS,
  CALIBRATION_CONCEPTS,
  CALIBRATION_LEVELS,
} from "@/lib/exercise/calibration-levels";
import {
  buildCalibrationItems,
  calibrationTopicFor,
  type CalibrationItem,
  type CalibrationTopic,
} from "@/lib/exercise/calibration-math";
import {
  scoreCalibration,
  type CalibrationAnswer,
} from "@/lib/exercise/calibration-score";
import { type PracticeLevel } from "@/lib/exercise/levels";
import {
  FlowStep,
  FEEDBACK_STEP,
  PART_LABELS,
  groupIdOf,
  parseNumber,
  isAnswered,
  FrequencyTable,
} from "@/components/exercises/calibration/shared";

/** State, effects and actions of the Calibration flow; the steps only render. */
export function useCalibrationFlow({
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
    usePlan,
    setUsePlan,
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    pendingSave,
  } = flow;
  const [topic, setTopic] = useState<CalibrationTopic>(() =>
    calibrationTopicFor(
      initialDomain,
      initialDomain ? groupIdOf(initialDomain) : undefined,
    ),
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
  useDebouncedSave(
    pendingSave,
    autosaveRow ? () => void putExercise(autosaveRow) : null,
    1000,
    [exercise, step],
  );

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
          for (const x of r.items)
            if ((seen.get(x.id) ?? "") < at) seen.set(x.id, at);
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
      setUsePlan("");
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
  const numberBox = (
    id: string,
    field: "low" | "high" | "estimate",
    label: string,
    suffix?: string,
  ) => {
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
          {suffix ? (
            <span className="text-muted-foreground shrink-0 text-body">
              {suffix}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const getFeedback = async () => {
    if (!exercise) return;
    setError(null);
    const missing = exercise.items.filter(
      (it) => !isAnswered(it, answers[it.id]),
    ).length;
    if (missing > 0) {
      setError(
        `Answer every question first (${missing} left). A guess is fine: just say how sure you are.`,
      );
      return;
    }
    setLoading(true);
    pendingSave.clear();
    try {
      const row: CalibrationExerciseRow = {
        ...exercise,
        confidenceBefore: confidence,
      };
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "calibration",
          exercise: row,
          userContext: userContext || undefined,
        }),
      });
      const parsed = parsePerspectiveFetchJson(
        await safeAiJson<unknown>(res),
        "analytical",
      );
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const result = scoreCalibration({
        items: row.items,
        answers: row.answers ?? {},
        intervalTarget: cfg.intervalTarget,
      });
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
  const tip = (
    key: string,
    mode: "shown" | "toggle" | "none",
    label: string,
    body: React.ReactNode,
  ) =>
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
      <div
        key={item.id}
        className="space-y-3 border-t border-border pt-4"
        data-testid="calibration-item"
      >
        <p className="text-muted-foreground text-meta">
          Question {i + 1} of {exercise!.items.length}
          {item.kind === "baserate" ? " · Base rate" : null}
          {item.kind !== "baserate" && item.seenBefore ? (
            <span data-testid="seen-before">
              {" "}
              · Seen before, not counted in your History chart
            </span>
          ) : null}
        </p>
        {item.kind === "baserate" ? (
          <p className="text-body leading-relaxed">{item.story}</p>
        ) : null}
        <p className="text-body font-medium text-foreground">{item.question}</p>

        {item.kind === "binary" ? (
          <>
            <div
              className="grid gap-2 sm:grid-cols-2"
              role="radiogroup"
              aria-label={item.question}
            >
              {item.options.map((o, oi) => (
                <button
                  key={oi}
                  type="button"
                  role="radio"
                  aria-checked={a?.choice === oi}
                  onClick={() => setAnswer(item.id, { choice: oi as 0 | 1 })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-body",
                    a?.choice === oi
                      ? "border-foreground bg-muted font-medium"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-meta font-medium">How sure are you?</p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label={`How sure: ${item.question}`}
              >
                {BINARY_CONFIDENCE_STEPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={a?.confidence === c}
                    onClick={() => setAnswer(item.id, { confidence: c })}
                    className={cn(
                      "rounded-md border px-3 py-1 text-body tabular-nums",
                      a?.confidence === c
                        ? "border-foreground bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {c}%
                  </button>
                ))}
              </div>
              {i === 0 ? (
                <p className="text-muted-foreground text-meta">
                  50% means a pure guess. 100% means you would bet anything on
                  it.
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        {item.kind === "interval" ? (
          <>
            <p className="text-muted-foreground text-meta">
              Give a range you are {cfg.intervalTarget}% sure holds the answer (
              {item.unit}).
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
            {tip(
              `table-${item.id}`,
              item.twoStep ? "none" : cfg.frequencyTable,
              "Show the table for 10,000",
              <FrequencyTable item={item} />,
            )}
            <div className="max-w-48">
              {numberBox(item.id, "estimate", "Your answer", "%")}
            </div>
          </>
        ) : null}
      </div>
    );
  };

  const answeredCount = exercise
    ? exercise.items.filter((it) => isAnswered(it, answers[it.id])).length
    : 0;

  return {
    topic,
    setTopic,
    drafts,
    setDrafts,
    openTips,
    setOpenTips,
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
    flow,
    setupLevel,
    cfg,
    save,
    autosaveRow,
    chooseLevel,
    generate,
    answers,
    setAnswer,
    numberBox,
    getFeedback,
    finish,
    phase,
    part,
    partLabel,
    tip,
    itemCard,
    answeredCount,
  };
}

export type CalibrationFlowState = ReturnType<typeof useCalibrationFlow>;
