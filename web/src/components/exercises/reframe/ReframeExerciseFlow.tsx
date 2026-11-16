"use client";

import {
  ExerciseShell,
  practiceStepLabels,
} from "@/components/shared/ExerciseShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SUPPORT_MESSAGE } from "@/lib/exercise/crisis-safety";
import { FEEDBACK_STEP } from "@/components/exercises/reframe/shared";
import { useReframeFlow } from "@/components/exercises/reframe/useReframeFlow";
import { SetupStep } from "@/components/exercises/reframe/steps/SetupStep";
import { WorkStep } from "@/components/exercises/reframe/steps/WorkStep";
import { FeedbackStep } from "@/components/exercises/reframe/steps/FeedbackStep";

export function ReframeExerciseFlow({
  resumeId,
  initialDomain,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const s = useReframeFlow({ resumeId, initialDomain });
  const { needsSupport, step, exercise, error, phase, partLabel } = s;

  return (
    <ExerciseShell
      stepIndex={phase}
      stepLabels={practiceStepLabels("Think it through")}
      partLabel={partLabel}
      title="Reframe"
      sub="Spot thinking traps, then rewrite one thought."
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {needsSupport ? (
        <Alert data-testid="reframe-support">
          <AlertTitle>{SUPPORT_MESSAGE.title}</AlertTitle>
          <AlertDescription>
            {SUPPORT_MESSAGE.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </AlertDescription>
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
