"use client";

import {
  ExerciseShell,
  practiceStepLabels,
} from "@/components/shared/ExerciseShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SUPPORT_MESSAGE } from "@/lib/exercise/crisis-safety";
import { FEEDBACK_STEP } from "@/components/exercises/judgment/shared";
import { useJudgmentFlow } from "@/components/exercises/judgment/useJudgmentFlow";
import { SetupStep } from "@/components/exercises/judgment/steps/SetupStep";
import { WorkStep } from "@/components/exercises/judgment/steps/WorkStep";
import { FeedbackStep } from "@/components/exercises/judgment/steps/FeedbackStep";

export function JudgmentExerciseFlow({
  resumeId,
  initialDomain,
  initialSource,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const s = useJudgmentFlow({ resumeId, initialDomain, initialSource });
  const { needsSupport, step, exercise, error, phase, partLabel } = s;

  return (
    <ExerciseShell
      stepIndex={phase}
      stepLabels={practiceStepLabels("Think it through")}
      partLabel={partLabel}
      title="Life situations"
      sub="Read a real situation, then choose a response."
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {needsSupport ? (
        <Alert data-testid="judgment-support">
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
