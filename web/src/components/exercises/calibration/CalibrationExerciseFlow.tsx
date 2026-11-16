"use client";

import {
  ExerciseShell,
  practiceStepLabels,
} from "@/components/shared/ExerciseShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FEEDBACK_STEP } from "@/components/exercises/calibration/shared";
import { useCalibrationFlow } from "@/components/exercises/calibration/useCalibrationFlow";
import { SetupStep } from "@/components/exercises/calibration/steps/SetupStep";
import { WorkStep } from "@/components/exercises/calibration/steps/WorkStep";
import { FeedbackStep } from "@/components/exercises/calibration/steps/FeedbackStep";

export {
  parseNumber,
  FrequencyTable,
} from "@/components/exercises/calibration/shared";

export function CalibrationExerciseFlow({
  resumeId,
  initialDomain,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const s = useCalibrationFlow({ resumeId, initialDomain });
  const { step, exercise, error, phase, partLabel } = s;

  return (
    <ExerciseShell
      stepIndex={phase}
      stepLabels={practiceStepLabels("Think it through")}
      partLabel={partLabel}
      title="Calibration"
      sub="Say how sure you are, then check."
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === 0 ? <SetupStep s={s} /> : null}

      {step === 1 && exercise ? <WorkStep s={s} exercise={exercise} /> : null}

      {(step === FEEDBACK_STEP || step === 7) && exercise?.result ? (
        <FeedbackStep s={s} exercise={exercise} />
      ) : null}
    </ExerciseShell>
  );
}
