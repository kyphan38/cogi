"use client";

import {
  ExerciseShell,
  practiceStepLabels,
} from "@/components/shared/ExerciseShell";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAnalyticalFlow } from "@/components/exercises/analytical/useAnalyticalFlow";
import { SetupStep } from "@/components/exercises/analytical/steps/SetupStep";
import { HighlightStep } from "@/components/exercises/analytical/steps/HighlightStep";
import { GeoStep } from "@/components/exercises/analytical/steps/GeoStep";
import { FeedbackStep } from "@/components/exercises/analytical/steps/FeedbackStep";

export function AnalyticalExerciseFlow({
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
  const s = useAnalyticalFlow({
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
    startGenerate,
    phase,
    partLabel,
  } = s;

  return (
    <ExerciseShell
      stepIndex={phase}
      stepLabels={practiceStepLabels("Highlight & tag")}
      partLabel={partLabel}
      title="Analytical"
      sub="Generate a passage, then tag its issues."
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
        <HighlightStep s={s} exercise={exercise} />
      ) : null}

      {step === 2 && exercise?.isGeopolitics ? (
        <GeoStep s={s} exercise={exercise} />
      ) : null}

      {(step === 4 || step === 7) && exercise && perspectiveText ? (
        <FeedbackStep
          s={s}
          perspectiveText={perspectiveText}
          exercise={exercise}
        />
      ) : null}
    </ExerciseShell>
  );
}
