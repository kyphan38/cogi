"use client";

import { ExerciseShell, practiceStepLabels } from "@/components/shared/ExerciseShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SUPPORT_MESSAGE } from "@/lib/exercise/crisis-safety";
import { FEEDBACK_STEP } from "@/components/exercises/tricky/shared";
import { useTrickyFlow } from "@/components/exercises/tricky/useTrickyFlow";
import { SetupStep } from "@/components/exercises/tricky/steps/SetupStep";
import { WorkStep } from "@/components/exercises/tricky/steps/WorkStep";
import { FeedbackStep } from "@/components/exercises/tricky/steps/FeedbackStep";

export function TrickyExerciseFlow({
  resumeId,
  initialDomain,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const s = useTrickyFlow({ resumeId, initialDomain });
  const { needsSupport, step, exercise, error, phase, partLabel } = s;

  return (
    <ExerciseShell
      stepIndex={phase}
      stepLabels={practiceStepLabels("Answer")}
      partLabel={partLabel}
      title="Tricky questions"
      sub="Someone asks a loaded question. Answer with a clear, fair view."
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {needsSupport ? (
        <Alert data-testid="tricky-support">
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
