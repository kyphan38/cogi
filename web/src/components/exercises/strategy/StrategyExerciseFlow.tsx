"use client";

import {
  ExerciseShell,
  practiceStepLabels,
} from "@/components/shared/ExerciseShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FEEDBACK_STEP } from "@/components/exercises/strategy/shared";
import { useStrategyFlow } from "@/components/exercises/strategy/useStrategyFlow";
import { SetupStep } from "@/components/exercises/strategy/steps/SetupStep";
import { WorkStep } from "@/components/exercises/strategy/steps/WorkStep";
import { FeedbackStep } from "@/components/exercises/strategy/steps/FeedbackStep";

export function StrategyExerciseFlow({
  resumeId,
  initialDomain,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const s = useStrategyFlow({ resumeId, initialDomain });
  const { step, exercise, error, facts, A, B, phase, partLabel, answers } = s;

  return (
    <ExerciseShell
      stepIndex={phase}
      stepLabels={practiceStepLabels("Read the game")}
      partLabel={partLabel}
      title="Strategic situations"
      sub="Game theory in real stories."
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === 0 ? <SetupStep s={s} /> : null}

      {step === 1 && exercise && A && B && answers && facts ? (
        <WorkStep
          s={s}
          exercise={exercise}
          facts={facts}
          A={A}
          B={B}
          answers={answers}
        />
      ) : null}

      {(step === FEEDBACK_STEP || step === 7) && exercise?.result ? (
        <FeedbackStep s={s} exercise={exercise} />
      ) : null}
    </ExerciseShell>
  );
}
