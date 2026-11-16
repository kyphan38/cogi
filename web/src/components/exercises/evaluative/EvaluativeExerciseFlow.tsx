"use client";

import {
  ExerciseShell,
  practiceStepLabels,
} from "@/components/shared/ExerciseShell";
import { LevelSuggestionPrompt } from "@/components/exercises/flow/LevelSuggestionPrompt";
import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEvaluativeFlow } from "@/components/exercises/evaluative/useEvaluativeFlow";
import { SetupStep } from "@/components/exercises/evaluative/steps/SetupStep";
import { UncertaintyStartStep } from "@/components/exercises/evaluative/steps/UncertaintyStartStep";
import { CriteriaStep } from "@/components/exercises/evaluative/steps/CriteriaStep";
import { EvaluateStep } from "@/components/exercises/evaluative/steps/EvaluateStep";
import { FeedbackStep } from "@/components/exercises/evaluative/steps/FeedbackStep";

export function EvaluativeExerciseFlow({
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
  const s = useEvaluativeFlow({
    resumeId,
    initialDomain,
    initialSource,
    autoGenerate,
  });
  const {
    perspectiveText,
    step,
    exercise,
    error,
    setError,
    takeaway,
    setTakeaway,
    usePlan,
    setUsePlan,
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    chooseLevel,
    startGenerate,
    finishExercise,
    phase,
    partLabel,
  } = s;

  return (
    <ExerciseShell
      stepIndex={phase}
      stepLabels={practiceStepLabels("Evaluate")}
      partLabel={partLabel}
      title="Evaluative"
      sub="Weigh options on a board, then compare with the AI."
    >
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

      {step === 0 ? <SetupStep s={s} /> : null}

      {step === 1 && exercise && exercise.variant === "uncertainty" ? (
        <UncertaintyStartStep s={s} exercise={exercise} />
      ) : null}

      {step === 1 && exercise && exercise.variant !== "uncertainty" ? (
        <CriteriaStep s={s} exercise={exercise} />
      ) : null}

      {step === 2 && exercise ? (
        <EvaluateStep s={s} exercise={exercise} />
      ) : null}

      {(step === 4 || step === 7) && exercise && perspectiveText ? (
        <FeedbackStep
          s={s}
          perspectiveText={perspectiveText}
          exercise={exercise}
        />
      ) : null}

      {step === 7 && levelSuggestion ? (
        <LevelSuggestionPrompt
          type="evaluative"
          suggestion={levelSuggestion}
          onChoose={chooseLevel}
          onClose={() => setLevelSuggestion(null)}
        />
      ) : null}

      {(step === 4 || step === 7) && exercise && perspectiveText ? (
        <PracticeFinishCard
          takeaway={takeaway}
          onTakeawayChange={setTakeaway}
          usePlan={usePlan}
          onUsePlanChange={setUsePlan}
          onFinish={finishExercise}
          saving={finishing}
          finished={step === 7}
        />
      ) : null}
    </ExerciseShell>
  );
}
