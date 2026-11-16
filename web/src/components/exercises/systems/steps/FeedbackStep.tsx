"use client";

import { AIPerspective } from "@/components/shared/AIPerspective";
import { SystemsAnswerKey } from "@/components/exercises/SystemsAnswerKey";
import { SystemsPatternCard } from "@/components/exercises/SystemsPatternCard";
import { LevelSuggestionPrompt } from "@/components/exercises/flow/LevelSuggestionPrompt";
import { systemsResultOf } from "@/lib/exercise/systems-score";
import { isCoachingStructured } from "@/lib/types/perspective";
import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import type { SystemsFlowState } from "@/components/exercises/systems/useSystemsFlow";

export function FeedbackStep({
  s,
  perspectiveText,
  exercise,
}: {
  s: SystemsFlowState;
  perspectiveText: NonNullable<SystemsFlowState["perspectiveText"]>;
  exercise: NonNullable<SystemsFlowState["exercise"]>;
}) {
  const {
    userEdges,
    nodeImpact,
    userCriticalityRanking,
    lookAhead,
    lifeExample,
    setLifeExample,
    step,
    confidence,
    takeaway,
    setTakeaway,
    usePlan,
    setUsePlan,
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    doneStep,
    chooseLevel,
    finishExercise,
    systemsFeedback,
  } = s;

  return (
    <>
      <div className="space-y-4">
        <SystemsAnswerKey
          exercise={{
            ...exercise,
            userEdges,
            confidenceBefore: confidence,
            userCriticalityRanking,
            lookAhead,
          }}
          result={systemsResultOf({ ...exercise, userEdges, nodeImpact })}
          coaching={
            isCoachingStructured(systemsFeedback) ? systemsFeedback : null
          }
        />
        {/* Feedback saved before the comparison view (clarity v2 or plain text). */}
        {!isCoachingStructured(systemsFeedback) ? (
          <AIPerspective
            text={perspectiveText}
            structured={systemsFeedback}
            perspectiveKind="systems"
          />
        ) : null}
        {step === doneStep && levelSuggestion ? (
          <LevelSuggestionPrompt
            type="systems"
            suggestion={levelSuggestion}
            onChoose={chooseLevel}
            onClose={() => setLevelSuggestion(null)}
          />
        ) : null}
        {exercise.archetype ? (
          <SystemsPatternCard
            archetype={exercise.archetype}
            lifeExample={lifeExample}
            onLifeExampleChange={setLifeExample}
            finished={step === doneStep}
          />
        ) : null}
        <PracticeFinishCard
          takeaway={takeaway}
          onTakeawayChange={setTakeaway}
          usePlan={usePlan}
          onUsePlanChange={setUsePlan}
          onFinish={finishExercise}
          saving={finishing}
          finished={step === doneStep}
        />
      </div>
    </>
  );
}
