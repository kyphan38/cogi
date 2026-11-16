"use client";

import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { LevelSuggestionPrompt } from "@/components/exercises/flow/LevelSuggestionPrompt";
import { ReframeAnswerKey } from "@/components/exercises/ReframeAnswerKey";
import { isCoachingStructured } from "@/lib/types/perspective";
import type { ReframeFlowState } from "@/components/exercises/reframe/useReframeFlow";

export function FeedbackStep({
  s,
  exercise,
}: {
  s: ReframeFlowState;
  exercise: NonNullable<ReframeFlowState["exercise"]>;
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
        <ReframeAnswerKey
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
            type="reframe"
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
          takeawayPlaceholder="Which trap will you watch for in your own thoughts this week?"
        />
      </div>
    </>
  );
}
