"use client";

import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { LevelSuggestionPrompt } from "@/components/exercises/flow/LevelSuggestionPrompt";
import { HumorAnswerKey } from "@/components/exercises/HumorAnswerKey";
import type { HumorFlowState } from "@/components/exercises/humor/useHumorFlow";

export function FeedbackStep({ s, exercise }: { s: HumorFlowState; exercise: NonNullable<HumorFlowState["exercise"]> }) {
  const { step, takeaway, setTakeaway, usePlan, setUsePlan, finishing, levelSuggestion, setLevelSuggestion, chooseLevel, finish } = s;

  return (
    <div className="space-y-4">
      <HumorAnswerKey exercise={exercise} result={exercise.result!} />
      {step === 7 && levelSuggestion ? (
        <LevelSuggestionPrompt
          type="humor"
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
        takeawayPlaceholder="What will you try next time a moment like this comes up?"
      />
    </div>
  );
}
