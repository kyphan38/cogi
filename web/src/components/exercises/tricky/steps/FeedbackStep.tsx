"use client";

import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { LevelSuggestionPrompt } from "@/components/exercises/flow/LevelSuggestionPrompt";
import { TrickyAnswerKey } from "@/components/exercises/TrickyAnswerKey";
import type { TrickyFlowState } from "@/components/exercises/tricky/useTrickyFlow";

export function FeedbackStep({ s, exercise }: { s: TrickyFlowState; exercise: NonNullable<TrickyFlowState["exercise"]> }) {
  const { step, takeaway, setTakeaway, usePlan, setUsePlan, finishing, levelSuggestion, setLevelSuggestion, chooseLevel, finish } = s;

  return (
    <div className="space-y-4">
      <TrickyAnswerKey exercise={exercise} result={exercise.result!} />
      {step === 7 && levelSuggestion ? (
        <LevelSuggestionPrompt
          type="tricky"
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
        takeawayPlaceholder="What will you say next time someone asks a question like this?"
      />
    </div>
  );
}
