"use client";

import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { LevelSuggestionPrompt } from "@/components/exercises/flow/LevelSuggestionPrompt";
import { CalibrationAnswerKey } from "@/components/exercises/CalibrationAnswerKey";
import { isCoachingStructured } from "@/lib/types/perspective";
import type { CalibrationFlowState } from "@/components/exercises/calibration/useCalibrationFlow";

export function FeedbackStep({
  s,
  exercise,
}: {
  s: CalibrationFlowState;
  exercise: NonNullable<CalibrationFlowState["exercise"]>;
}) {
  const {
    step,
    perspectiveStructured,
    takeaway,
    setTakeaway,
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    chooseLevel,
    finish,
  } = s;

  return (
    <>
      <div className="space-y-4">
        <CalibrationAnswerKey
          exercise={exercise}
          result={exercise.result!}
          coaching={
            isCoachingStructured(perspectiveStructured)
              ? perspectiveStructured
              : null
          }
        />
        {step === 7 && levelSuggestion ? (
          <LevelSuggestionPrompt
            type="calibration"
            suggestion={levelSuggestion}
            onChoose={chooseLevel}
            onClose={() => setLevelSuggestion(null)}
          />
        ) : null}
        <PracticeFinishCard
          takeaway={takeaway}
          onTakeawayChange={setTakeaway}
          onFinish={finish}
          saving={finishing}
          finished={step === 7}
          takeawayPlaceholder="Where in real life are you more sure than you should be?"
        />
      </div>
    </>
  );
}
