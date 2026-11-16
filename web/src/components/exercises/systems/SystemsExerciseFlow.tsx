"use client";

import {
  ExerciseShell,
  practiceStepLabels,
} from "@/components/shared/ExerciseShell";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSystemsFlow } from "@/components/exercises/systems/useSystemsFlow";
import { SetupStep } from "@/components/exercises/systems/steps/SetupStep";
import { DecomposeStep } from "@/components/exercises/systems/steps/DecomposeStep";
import { ConnectStep } from "@/components/exercises/systems/steps/ConnectStep";
import { CriticalityStep } from "@/components/exercises/systems/steps/CriticalityStep";
import { ShockStep } from "@/components/exercises/systems/steps/ShockStep";
import { CascadeStep } from "@/components/exercises/systems/steps/CascadeStep";
import { GeoPerspectiveStep } from "@/components/exercises/systems/steps/GeoPerspectiveStep";
import { FeedbackStep } from "@/components/exercises/systems/steps/FeedbackStep";

export function SystemsExerciseFlow({
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
  const s = useSystemsFlow({
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
    criticalityStep,
    shockStep,
    cascadeStep,
    perspectiveStep,
    doneStep,
    startGenerate,
    isGeoExercise,
    isResilienceExercise,
    phase,
    partLabel,
  } = s;

  return (
    <ExerciseShell
      stepIndex={phase}
      stepLabels={practiceStepLabels("Map the system")}
      partLabel={partLabel}
      title="Systems"
      sub="Map the system, then follow a shock through it."
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

      {step === 1 && exercise ? (
        <DecomposeStep s={s} exercise={exercise} />
      ) : null}

      {step === 2 && exercise ? (
        <ConnectStep s={s} exercise={exercise} />
      ) : null}

      {step === criticalityStep && exercise && isResilienceExercise ? (
        <CriticalityStep s={s} exercise={exercise} />
      ) : null}

      {step === shockStep && exercise ? (
        <ShockStep s={s} exercise={exercise} />
      ) : null}

      {step === cascadeStep &&
      exercise &&
      isResilienceExercise &&
      exercise.secondShockEvent ? (
        <CascadeStep s={s} exercise={exercise} />
      ) : null}

      {step === 5 && exercise && isGeoExercise ? (
        <GeoPerspectiveStep s={s} exercise={exercise} />
      ) : null}

      {(step === perspectiveStep || step === doneStep) &&
      exercise &&
      perspectiveText ? (
        <FeedbackStep
          s={s}
          perspectiveText={perspectiveText}
          exercise={exercise}
        />
      ) : null}
    </ExerciseShell>
  );
}
