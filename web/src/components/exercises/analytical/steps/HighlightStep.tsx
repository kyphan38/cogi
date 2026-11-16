"use client";

import { HighlightTag } from "@/components/exercises/HighlightTag";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { Button } from "@/components/ui/button";
import { putExercise } from "@/lib/db/exercises";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import {
  ExerciseStepCard,
  EXERCISE_STEP_META_BADGE,
} from "@/components/shared/ExerciseStepCard";
import {
  ANALYTICAL_TAG_OPTIONS,
  GEOPOLITICS_TAG_OPTIONS,
} from "@/lib/exercise/tag-labels";
import { CheckQuestions } from "@/components/exercises/CheckQuestions";
import { GuidedWalkthrough } from "@/components/exercises/GuidedWalkthrough";
import { LearnFirst } from "@/components/exercises/LearnFirst";
import { LEVEL_LABELS } from "@/lib/exercise/levels";
import type { AnalyticalFlowState } from "@/components/exercises/analytical/useAnalyticalFlow";

export function HighlightStep({
  s,
  exercise,
}: {
  s: AnalyticalFlowState;
  exercise: NonNullable<AnalyticalFlowState["exercise"]>;
}) {
  const {
    highlights,
    setHighlights,
    setStep,
    setExercise,
    setError,
    loading,
    confidence,
    setConfidence,
    advance,
    regenerate,
    submitHighlightsAndConfidence,
    exerciseLevel,
    levelConfig,
    saveRow,
    walkPart,
    onWalkProgress,
  } = s;

  return (
    <>
      <ExerciseStepCard
        data-testid="analytical-exercise-card"
        title={exercise.title}
        description={
          <>
            Domain: {exercise.domain}
            {exerciseLevel ? (
              <span className={EXERCISE_STEP_META_BADGE}>
                {LEVEL_LABELS[exerciseLevel]}
              </span>
            ) : null}
          </>
        }
        bodyClassName="space-y-4"
      >
        {exercise.isGeopolitics &&
        exercise.learnDone === false &&
        exercise.concepts &&
        exercise.conceptChecks ? (
          <LearnFirst
            concepts={exercise.concepts}
            checks={exercise.conceptChecks}
            answers={exercise.conceptAnswers ?? []}
            seed={exercise.id}
            onAnswer={(ci, oi) => {
              const next = [...(exercise.conceptAnswers ?? [])];
              next[ci] = oi;
              saveRow({ conceptAnswers: next });
            }}
            onDone={() => saveRow({ learnDone: true })}
          />
        ) : levelConfig?.walkthrough ? (
          <GuidedWalkthrough
            ex={exercise}
            highlights={highlights}
            onProgress={onWalkProgress}
          />
        ) : (
          <>
            {exercise.isGeopolitics && exercise.source !== "real_data" ? (
              <p
                className="text-muted-foreground text-meta"
                data-testid="fiction-label"
              >
                Scenario: some details may be fictional. Do not learn facts from
                it; learn to read it.
              </p>
            ) : null}
            {levelConfig?.countHint === "issues-and-traps" &&
            !exercise.isSoundReasoning ? (
              <p
                className="text-body text-foreground"
                data-testid="issue-count-hint"
              >
                This passage has{" "}
                <span className="font-medium">
                  {exercise.embeddedIssues.length} issue
                  {exercise.embeddedIssues.length === 1 ? "" : "s"}
                </span>{" "}
                and{" "}
                <span className="font-medium">
                  {exercise.validPoints.length} trap
                  {exercise.validPoints.length === 1 ? "" : "s"}
                </span>{" "}
                (sound statements that only look biased).
              </p>
            ) : null}
            {levelConfig?.countHint === "issues" &&
            !exercise.isSoundReasoning ? (
              <p
                className="text-body text-foreground"
                data-testid="issue-count-hint"
              >
                This passage has{" "}
                <span className="font-medium">
                  {exercise.embeddedIssues.length} issue
                  {exercise.embeddedIssues.length === 1 ? "" : "s"}
                </span>{" "}
                to find.
              </p>
            ) : null}
            {levelConfig?.checkQuestions === "toggle" ? (
              <CheckQuestions
                mode="toggle"
                geopolitics={exercise.isGeopolitics === true}
              />
            ) : null}
            {exercise.isGeopolitics &&
            levelConfig?.checkQuestions === "shown" ? (
              <CheckQuestions mode="shown" geopolitics />
            ) : null}
            <HighlightTag
              passage={exercise.passage}
              highlights={highlights}
              onChange={setHighlights}
              tagOptions={
                exercise.isGeopolitics
                  ? GEOPOLITICS_TAG_OPTIONS
                  : ANALYTICAL_TAG_OPTIONS
              }
              selectionMode={levelConfig?.selectionMode ?? "sentence"}
              showQuestions={levelConfig?.checkQuestions !== "hidden"}
              onSelectionOverlap={() =>
                setError(
                  "Selection overlaps an existing highlight. Remove or adjust first.",
                )
              }
            />
          </>
        )}
        {/* Geopolitics asks for confidence after the perspective guess instead; the
                  guided walkthrough asks once every suggested sentence is checked. */}
        {!exercise.isGeopolitics &&
        (walkPart == null || walkPart === "done") ? (
          <>
            <ConfidenceSlider value={confidence} onChange={setConfidence} />
            {loading ? <PerspectiveLoadingCard /> : null}
          </>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const updated = {
                ...exercise,
                userHighlights: highlights,
                currentStep: 1 as const,
              };
              setExercise(updated);
              void putExercise(updated);
              setStep(0);
            }}
          >
            Back
          </Button>
          <Button type="button" variant="secondary" onClick={regenerate}>
            Regenerate
          </Button>
          {(walkPart == null || walkPart === "done") &&
          exercise.learnDone !== false ? (
            <Button
              type="button"
              onClick={() => {
                setError(null);
                if (highlights.length < 1) {
                  if (exercise.isGeopolitics) {
                    setError("Add at least one highlight.");
                    return;
                  }
                  // A passage can be sound; saying so is a valid answer.
                  if (
                    !window.confirm(
                      "You found no problems in this passage. Get feedback anyway?",
                    )
                  ) {
                    return;
                  }
                }
                const updated = { ...exercise, userHighlights: highlights };
                setExercise(updated);
                if (exercise.isGeopolitics) advance(2, updated);
                else void submitHighlightsAndConfidence(updated);
              }}
              disabled={loading}
            >
              {exercise.isGeopolitics
                ? "Continue to perspective guess"
                : loading
                  ? "Loading…"
                  : "Get AI feedback"}
            </Button>
          ) : null}
        </div>
      </ExerciseStepCard>
    </>
  );
}
