"use client";

import {
  ExerciseStepCard,
  EXERCISE_STEP_META_BADGE,
} from "@/components/shared/ExerciseStepCard";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { LearnFirst } from "@/components/exercises/LearnFirst";
import { RankList } from "@/components/exercises/RankList";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LENS_INFO } from "@/lib/exercise/judgment-levels";
import { LEVEL_LABELS } from "@/lib/exercise/levels";
import { ChoiceButtons } from "@/components/exercises/judgment/shared";
import type { JudgmentFlowState } from "@/components/exercises/judgment/useJudgmentFlow";

export function WorkStep({
  s,
  exercise,
}: {
  s: JudgmentFlowState;
  exercise: NonNullable<JudgmentFlowState["exercise"]>;
}) {
  const {
    lensIndex,
    setLensIndex,
    loading,
    confidence,
    setConfidence,
    cfg,
    save,
    getFeedback,
    lensOrders,
    part,
    lensAnswers,
    lensText,
    lensesDone,
    scenarioBlock,
  } = s;

  return (
    <>
      <ExerciseStepCard
        data-testid="judgment-exercise-card"
        title={exercise.title}
        description={
          <>
            {exercise.domain}
            <span className={EXERCISE_STEP_META_BADGE}>
              {LEVEL_LABELS[exercise.level]}
            </span>
          </>
        }
        bodyClassName="space-y-5"
      >
        {part === "learn" ? (
          <LearnFirst
            concepts={exercise.concepts}
            checks={exercise.conceptChecks}
            answers={exercise.conceptAnswers ?? []}
            seed={exercise.id}
            onAnswer={(ci, oi) => {
              const answers = [...(exercise.conceptAnswers ?? [])];
              answers[ci] = oi;
              save({ conceptAnswers: answers });
            }}
            onDone={() => save({ part: "lenses" })}
          />
        ) : null}

        {part === "lenses" ? (
          <>
            {scenarioBlock}
            <p className="text-body font-medium text-foreground">
              Look at it through three lenses.
            </p>
            {cfg.lensMode === "one-by-one" ? (
              (() => {
                const q =
                  exercise.lensQuestions[
                    Math.min(lensIndex, exercise.lensQuestions.length - 1)
                  ]!;
                const picked = lensAnswers[q.lens];
                return (
                  <div className="space-y-3" data-testid="lens-question">
                    <p className="text-muted-foreground text-meta">
                      Lens {Math.min(lensIndex, 2) + 1} of 3 ·{" "}
                      {LENS_INFO[q.lens].name}
                    </p>
                    <p className="text-body font-medium text-foreground">
                      {q.question}
                    </p>
                    <ChoiceButtons
                      options={q.options}
                      order={lensOrders[q.lens] ?? [0, 1, 2]}
                      picked={picked}
                      answer={q.answerIndex}
                      reveal
                      label={q.question}
                      onPick={(oi) =>
                        save({ lensAnswers: { ...lensAnswers, [q.lens]: oi } })
                      }
                    />
                    {picked != null ? (
                      <>
                        <p className="text-body">{q.explanation}</p>
                        <Button
                          type="button"
                          onClick={() => {
                            if (lensIndex < exercise.lensQuestions.length - 1)
                              setLensIndex(lensIndex + 1);
                            else save({ part: "respond" });
                          }}
                        >
                          {lensIndex < exercise.lensQuestions.length - 1
                            ? "Next lens"
                            : "Choose a response"}
                        </Button>
                      </>
                    ) : null}
                  </div>
                );
              })()
            ) : (
              <div className="space-y-5">
                {exercise.lensQuestions.map((q) => (
                  <div
                    key={q.lens}
                    className="space-y-2"
                    data-testid="lens-question"
                  >
                    <p className="text-muted-foreground text-meta">
                      {LENS_INFO[q.lens].name}
                    </p>
                    <p className="text-body font-medium text-foreground">
                      {q.question}
                    </p>
                    {cfg.lensMode === "free" ? (
                      <Textarea
                        aria-label={`${LENS_INFO[q.lens].name}: ${q.question}`}
                        rows={2}
                        value={lensText[q.lens] ?? ""}
                        onChange={(e) =>
                          save({
                            lensText: { ...lensText, [q.lens]: e.target.value },
                          })
                        }
                      />
                    ) : (
                      <ChoiceButtons
                        options={q.options}
                        order={lensOrders[q.lens] ?? [0, 1, 2]}
                        picked={lensAnswers[q.lens]}
                        answer={q.answerIndex}
                        reveal={false}
                        label={q.question}
                        onPick={(oi) =>
                          save({
                            lensAnswers: { ...lensAnswers, [q.lens]: oi },
                          })
                        }
                      />
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  disabled={!lensesDone}
                  onClick={() => save({ part: "respond" })}
                >
                  Choose a response
                </Button>
              </div>
            )}
          </>
        ) : null}

        {part === "respond" ? (
          <>
            {scenarioBlock}
            <div className="space-y-2">
              <p className="text-body font-medium text-foreground">
                Put the ways to respond in order: best at the top.
              </p>
              <RankList
                items={exercise.responses}
                order={
                  exercise.userOrder ?? exercise.responses.map((r) => r.id)
                }
                onChange={(order) => save({ userOrder: order })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="judgment-why">
                Why is your first choice the best? (one or two sentences)
              </Label>
              <Textarea
                id="judgment-why"
                rows={2}
                value={exercise.userWhy ?? ""}
                onChange={(e) => save({ userWhy: e.target.value })}
                placeholder={
                  cfg.lensMode === "one-by-one"
                    ? "Optional at this level."
                    : undefined
                }
              />
            </div>
            {cfg.ownResponse ? (
              <div className="grid gap-2">
                <Label htmlFor="judgment-own">
                  What would you actually do or say? (optional)
                </Label>
                <Textarea
                  id="judgment-own"
                  rows={3}
                  value={exercise.ownResponse ?? ""}
                  onChange={(e) => save({ ownResponse: e.target.value })}
                />
              </div>
            ) : null}
            <ConfidenceSlider
              value={confidence}
              onChange={setConfidence}
              label="How sure are you about your order?"
            />
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => save({ part: "lenses" })}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => void getFeedback()}
              >
                {loading ? "Loading…" : "Get AI feedback"}
              </Button>
            </div>
          </>
        ) : null}
      </ExerciseStepCard>
    </>
  );
}
