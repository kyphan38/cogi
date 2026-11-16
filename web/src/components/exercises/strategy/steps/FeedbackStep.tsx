"use client";

import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { LevelSuggestionPrompt } from "@/components/exercises/flow/LevelSuggestionPrompt";
import { StrategyAnswerKey } from "@/components/exercises/StrategyAnswerKey";
import { isCoachingStructured } from "@/lib/types/perspective";
import type { StrategyFlowState } from "@/components/exercises/strategy/useStrategyFlow";

export function FeedbackStep({
  s,
  exercise,
}: {
  s: StrategyFlowState;
  exercise: NonNullable<StrategyFlowState["exercise"]>;
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
        <StrategyAnswerKey
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
            type="strategy"
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
          takeawayPlaceholder="Where in your life do you see a game like this?"
        />
      </div>
    </>
  );
}
