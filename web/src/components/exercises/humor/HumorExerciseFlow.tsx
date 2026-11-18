"use client";

import { ExerciseShell, practiceStepLabels } from "@/components/shared/ExerciseShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SUPPORT_MESSAGE } from "@/lib/exercise/crisis-safety";
import { FEEDBACK_STEP } from "@/components/exercises/humor/shared";
import { useHumorFlow } from "@/components/exercises/humor/useHumorFlow";
import { SetupStep } from "@/components/exercises/humor/steps/SetupStep";
import { WorkStep } from "@/components/exercises/humor/steps/WorkStep";
import { FeedbackStep } from "@/components/exercises/humor/steps/FeedbackStep";

export function HumorExerciseFlow({
  resumeId,
  initialDomain,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const s = useHumorFlow({ resumeId, initialDomain });
  const { needsSupport, step, exercise, error, phase, partLabel } = s;

  return (
    <ExerciseShell
      stepIndex={phase}
      stepLabels={practiceStepLabels("Reply")}
      partLabel={partLabel}
      title="Light replies"
      sub="Find a reply that is kind, short and a little funny."
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {needsSupport ? (
        <Alert data-testid="humor-support">
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
      {(step === FEEDBACK_STEP || step === 7) && exercise?.result ? <FeedbackStep s={s} exercise={exercise} /> : null}
    </ExerciseShell>
  );
}
