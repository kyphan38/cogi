"use client";

import { EvaluativeBlindSpotAlerts } from "@/components/exercises/EvaluativeBlindSpotAlerts";
import { EvaluativeWeightAlignment } from "@/components/exercises/EvaluativeWeightAlignment";
import { AIPerspective } from "@/components/shared/AIPerspective";
import { EvaluativeAnswerKey } from "@/components/exercises/EvaluativeAnswerKey";
import { evaluativeResultOf } from "@/lib/exercise/evaluative-score";
import { isCoachingStructured } from "@/lib/types/perspective";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EvaluativeFlowState } from "@/components/exercises/evaluative/useEvaluativeFlow";

export function FeedbackStep({
  s,
  perspectiveText,
  exercise,
}: {
  s: EvaluativeFlowState;
  perspectiveText: NonNullable<EvaluativeFlowState["perspectiveText"]>;
  exercise: NonNullable<EvaluativeFlowState["exercise"]>;
}) {
  const {
    criterionWeights,
    confidence,
    scoringBreakdown,
    perspectiveHighlightTerms,
    isGeoExercise,
    evaluativeFeedback,
  } = s;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>AI perspective</CardTitle>
          <CardDescription>
            Collaborative comparison - not a numeric grade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exercise.variant === "scoring" && isGeoExercise ? (
            <>
              <EvaluativeBlindSpotAlerts
                hiddenCriteria={exercise.hiddenCriteria}
              />
              <EvaluativeWeightAlignment
                criteria={exercise.criteria}
                userWeights={criterionWeights}
              />
            </>
          ) : exercise.variant === "scoring" ? (
            <EvaluativeBlindSpotAlerts
              hiddenCriteria={exercise.hiddenCriteria}
            />
          ) : null}
          <EvaluativeAnswerKey
            exercise={{ ...exercise, confidenceBefore: confidence }}
            result={evaluativeResultOf(exercise)}
            coaching={
              isCoachingStructured(evaluativeFeedback)
                ? evaluativeFeedback
                : null
            }
          />
          {/* Feedback saved before the comparison view (clarity v2 or plain text). */}
          {!isCoachingStructured(evaluativeFeedback) ? (
            <AIPerspective
              text={perspectiveText}
              structured={evaluativeFeedback}
              perspectiveKind={
                exercise.variant === "matrix"
                  ? "evaluative-matrix"
                  : exercise.variant === "uncertainty"
                    ? "evaluative-uncertainty"
                    : "evaluative-scoring"
              }
              evaluativeScoringBreakdown={
                exercise.variant === "scoring" ? scoringBreakdown : undefined
              }
              highlightTerms={perspectiveHighlightTerms}
            />
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
