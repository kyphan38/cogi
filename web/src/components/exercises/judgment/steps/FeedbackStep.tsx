"use client";

import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { LevelSuggestionPrompt } from "@/components/exercises/flow/LevelSuggestionPrompt";
import { JudgmentAnswerKey } from "@/components/exercises/JudgmentAnswerKey";
import { isCoachingStructured } from "@/lib/types/perspective";
import type { JudgmentFlowState } from "@/components/exercises/judgment/useJudgmentFlow";

export function FeedbackStep({
  s,
  exercise,
}: {
  s: JudgmentFlowState;
  exercise: NonNullable<JudgmentFlowState["exercise"]>;
}) {
  const {
    step,
    perspectiveStructured,
    takeaway,
    setTakeaway,
    usePlan,
    setUsePlan,
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    chooseLevel,
    finish,
  } = s;

  return (
    <>
      <div className="space-y-4">
        <JudgmentAnswerKey
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
            type="judgment"
            suggestion={levelSuggestion}
            onChoose={chooseLevel}
            onClose={() => setLevelSuggestion(null)}
          />
        ) : null}
        <PracticeFinishCard
          takeaway={takeaway}
          onTakeawayChange={setTakeaway}
          usePlan={usePlan}
          onUsePlanChange={setUsePlan}
          onFinish={finish}
          saving={finishing}
          finished={step === 7}
          takeawayPlaceholder="What will you do differently in a real situation like this?"
        />
      </div>
    </>
  );
}
