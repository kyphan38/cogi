"use client";

import { AIPerspective } from "@/components/shared/AIPerspective";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { AnalyticalAnswerKey } from "@/components/exercises/AnalyticalAnswerKey";
import {
  requestAnalyticalDeepDive,
  withDeepDive,
} from "@/lib/exercise/deep-dive";
import { LevelSuggestionPrompt } from "@/components/exercises/flow/LevelSuggestionPrompt";
import { GeoReveal } from "@/components/exercises/GeoGuessStep";
import { isAnalyticalCoachingStructured } from "@/lib/types/perspective";
import type { AnalyticalFlowState } from "@/components/exercises/analytical/useAnalyticalFlow";

export function FeedbackStep({
  s,
  perspectiveText,
  exercise,
}: {
  s: AnalyticalFlowState;
  perspectiveText: NonNullable<AnalyticalFlowState["perspectiveText"]>;
  exercise: NonNullable<AnalyticalFlowState["exercise"]>;
}) {
  const {
    highlights,
    step,
    setExercise,
    confidence,
    takeaway,
    setTakeaway,
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    chooseLevel,
    finishExercise,
    feedbackStructured,
    feedbackResult,
  } = s;

  return (
    <>
      <div className="space-y-4">
        {exercise.isGeopolitics && exercise.geoGuess ? (
          <Card>
            <CardHeader>
              <CardTitle>Viewpoint, missing actors and lenses</CardTitle>
              <CardDescription>
                What the passage hid, compared with your picks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeoReveal ex={exercise} guess={exercise.geoGuess} />
            </CardContent>
          </Card>
        ) : exercise.isGeopolitics && exercise.hiddenPerspective ? (
          <Card>
            <CardHeader>
              <CardTitle>Ground truth reveal</CardTitle>
              <CardDescription>
                Compare your guesses to what the passage embedded.
                {typeof exercise.metaGuessScore === "number"
                  ? ` Meta-guess score: ${exercise.metaGuessScore}/100.`
                  : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-body">
              <p>
                <span className="font-medium">Hidden perspective: </span>
                {exercise.hiddenPerspective}
              </p>
              <p>
                <span className="font-medium">Missing actors: </span>
                {(exercise.missingActors ?? []).join("; ")}
              </p>
              {exercise.userPerspectiveGuess ? (
                <p className="text-muted-foreground">
                  Your perspective guess: {exercise.userPerspectiveGuess}
                </p>
              ) : null}
              {(exercise.userMissingActorsGuess ?? []).length > 0 ? (
                <p className="text-muted-foreground">
                  Your missing-actor guesses:{" "}
                  {exercise.userMissingActorsGuess!.join("; ")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
        <AnalyticalAnswerKey
          exercise={{
            ...exercise,
            userHighlights: highlights,
            confidenceBefore: confidence,
          }}
          result={feedbackResult!}
          coaching={
            isAnalyticalCoachingStructured(feedbackStructured)
              ? feedbackStructured
              : null
          }
          deepDives={exercise.deepDives}
          onRequestDeepDive={async (ref) => {
            const d = await requestAnalyticalDeepDive(exercise, ref);
            setExercise((prev) => (prev ? withDeepDive(prev, ref, d) : prev));
          }}
        />
        {/* Feedback saved before the answer key (clarity v2 or plain text). */}
        {!isAnalyticalCoachingStructured(feedbackStructured) ? (
          <AIPerspective
            text={perspectiveText}
            structured={feedbackStructured}
            perspectiveKind="analytical"
          />
        ) : null}
        {step === 7 && levelSuggestion ? (
          <LevelSuggestionPrompt
            type="analytical"
            suggestion={levelSuggestion}
            onChoose={chooseLevel}
            onClose={() => setLevelSuggestion(null)}
          />
        ) : null}
        <PracticeFinishCard
          takeaway={takeaway}
          takeawayPlaceholder={
            feedbackResult &&
            (feedbackResult.found < feedbackResult.total ||
              feedbackResult.trapsHit > 0)
              ? "Why was one sentence you missed (or a trap) tricky? One sentence is enough."
              : undefined
          }
          onTakeawayChange={setTakeaway}
          onFinish={finishExercise}
          saving={finishing}
          finished={step === 7}
        />
      </div>
    </>
  );
}
