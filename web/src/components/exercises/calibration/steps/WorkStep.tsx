"use client";

import {
  ExerciseStepCard,
  EXERCISE_STEP_META_BADGE,
} from "@/components/shared/ExerciseStepCard";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { LearnFirst } from "@/components/exercises/LearnFirst";
import { Button } from "@/components/ui/button";
import { LEVEL_LABELS } from "@/lib/exercise/levels";
import type { CalibrationFlowState } from "@/components/exercises/calibration/useCalibrationFlow";

export function WorkStep({
  s,
  exercise,
}: {
  s: CalibrationFlowState;
  exercise: NonNullable<CalibrationFlowState["exercise"]>;
}) {
  const {
    loading,
    confidence,
    setConfidence,
    save,
    getFeedback,
    part,
    itemCard,
    answeredCount,
  } = s;

  return (
    <>
      <ExerciseStepCard
        data-testid="calibration-exercise-card"
        title={exercise.title}
        description={
          <>
            {exercise.domain}
            <span className={EXERCISE_STEP_META_BADGE}>
              {LEVEL_LABELS[exercise.level]}
            </span>
          </>
        }
        bodyClassName="space-y-5"
      >
        {part === "learn" ? (
          <LearnFirst
            concepts={exercise.concepts}
            checks={exercise.conceptChecks}
            answers={exercise.conceptAnswers ?? []}
            seed={exercise.id}
            onAnswer={(ci, oi) => {
              const next = [...(exercise.conceptAnswers ?? [])];
              next[ci] = oi;
              save({ conceptAnswers: next });
            }}
            onDone={() => save({ part: "answer" })}
          />
        ) : null}

        {part === "answer" ? (
          <>
            <p className="text-muted-foreground text-body">
              Don&apos;t look anything up.
            </p>
            <div className="space-y-4">{exercise.items.map(itemCard)}</div>
            <p
              className="text-muted-foreground text-meta"
              data-testid="answered-count"
            >
              {answeredCount} of {exercise.items.length} answered
            </p>
            <ConfidenceSlider
              value={confidence}
              onChange={setConfidence}
              label="Overall, how well do you think you did?"
            />
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => save({ part: "learn" })}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => void getFeedback()}
              >
                {loading ? "Loading…" : "Check my answers"}
              </Button>
            </div>
          </>
        ) : null}
      </ExerciseStepCard>
    </>
  );
}
