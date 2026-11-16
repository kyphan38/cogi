"use client";

import { Check, X } from "lucide-react";
import {
  ExerciseStepCard,
  EXERCISE_STEP_META_BADGE,
} from "@/components/shared/ExerciseStepCard";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { LearnFirst } from "@/components/exercises/LearnFirst";
import { RankList } from "@/components/exercises/RankList";
import {
  OutcomeStories,
  PayoffMatrix,
} from "@/components/exercises/PayoffMatrix";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { cellKey } from "@/lib/exercise/game";
import { LEVEL_LABELS } from "@/lib/exercise/levels";
import { toggle } from "@/components/exercises/strategy/shared";
import type { StrategyFlowState } from "@/components/exercises/strategy/useStrategyFlow";

export function WorkStep({
  s,
  exercise,
  facts,
  A,
  B,
  answers,
}: {
  s: StrategyFlowState;
  exercise: NonNullable<StrategyFlowState["exercise"]>;
  facts: NonNullable<StrategyFlowState["facts"]>;
  A: NonNullable<StrategyFlowState["A"]>;
  B: NonNullable<StrategyFlowState["B"]>;
  answers: NonNullable<StrategyFlowState["answers"]>;
}) {
  const {
    questionIndex,
    setQuestionIndex,
    rankPlayer,
    setRankPlayer,
    loading,
    confidence,
    setConfidence,
    cfg,
    save,
    saveAnswers,
    getFeedback,
    questions,
    part,
    numbers,
    storyBlock,
  } = s;

  return (
    <>
      <ExerciseStepCard
        data-testid="strategy-exercise-card"
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
              const next = [...(exercise.conceptAnswers ?? [])];
              next[ci] = oi;
              save({ conceptAnswers: next });
            }}
            onDone={() => save({ part: "analyze" })}
          />
        ) : null}

        {part === "analyze" ? (
          <>
            {storyBlock}
            {cfg.showPayoffs ? (
              (() => {
                const q =
                  questions[Math.min(questionIndex, questions.length - 1)]!;
                const isA = q.player === "A";
                const me = isA ? A : B;
                const choices = isA ? exercise.optionsA : exercise.optionsB;
                const given = answers.bestReplies?.[q.key];
                const best = isA ? facts.bestA[q.opp]! : facts.bestB[q.opp]!;
                const oppLabel = isA
                  ? `${B.name} picks "${exercise.optionsB.find((o) => o.id === q.opp)?.label}"`
                  : `${A.name} picks "${exercise.optionsA.find((o) => o.id === q.opp)?.label}"`;
                const payoff = (choice: string) => {
                  const c = exercise.cells.find((x) =>
                    isA
                      ? x.a === choice && x.b === q.opp
                      : x.a === q.opp && x.b === choice,
                  )!;
                  return isA ? c.payoffA : c.payoffB;
                };
                return (
                  <div className="space-y-3" data-testid="best-reply-question">
                    <PayoffMatrix game={exercise} showPayoffs />
                    <p className="text-muted-foreground text-meta">
                      Question {questionIndex + 1} of {questions.length} · best
                      reply
                    </p>
                    <p className="text-body font-medium text-foreground">
                      If {oppLabel}, what is the best reply for {me.name}?
                    </p>
                    <div
                      className="grid gap-2"
                      role="radiogroup"
                      aria-label="Best reply"
                    >
                      {choices.map((c) => {
                        const picked = given === c.id;
                        const showRight = given != null && c.id === best;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="radio"
                            aria-checked={picked}
                            disabled={given != null}
                            onClick={() =>
                              saveAnswers({
                                bestReplies: {
                                  ...answers.bestReplies,
                                  [q.key]: c.id,
                                },
                              })
                            }
                            className={cn(
                              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-body disabled:cursor-default",
                              showRight
                                ? "border-foreground bg-muted"
                                : picked
                                  ? "border-foreground/40"
                                  : "border-border hover:bg-muted",
                            )}
                          >
                            {showRight ? (
                              <Check className="size-4 shrink-0" aria-hidden />
                            ) : null}
                            {picked && !showRight ? (
                              <X className="size-4 shrink-0" aria-hidden />
                            ) : null}
                            <span>{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {given != null ? (
                      <>
                        <p
                          className="text-body"
                          data-testid="best-reply-feedback"
                        >
                          <span className="font-medium">
                            {given === best ? "Right. " : "Not quite. "}
                          </span>
                          {`${me.name} gets ${choices.map((c) => `${payoff(c.id)} with "${c.label}"`).join(" and ")}, so the best reply is "${choices.find((c) => c.id === best)?.label}".`}
                        </p>
                        <Button
                          type="button"
                          onClick={() => {
                            if (questionIndex < questions.length - 1)
                              setQuestionIndex(questionIndex + 1);
                            else save({ part: "predict" });
                          }}
                        >
                          {questionIndex < questions.length - 1
                            ? "Next question"
                            : "Predict the outcome"}
                        </Button>
                      </>
                    ) : null}
                  </div>
                );
              })()
            ) : (
              <div className="space-y-3" data-testid="rank-outcomes">
                <OutcomeStories game={exercise} />
                <p className="text-body font-medium text-foreground">
                  {rankPlayer === "A" ? "1 of 2" : "2 of 2"} · How good is each
                  outcome for {rankPlayer === "A" ? A.name : B.name}? Best at
                  the top.
                </p>
                <RankList
                  items={exercise.cells.map((c) => {
                    const key = cellKey(c.a, c.b);
                    return {
                      id: key,
                      text: `Outcome ${numbers.get(key)}: ${c.story}`,
                    };
                  })}
                  order={answers.ranks?.[rankPlayer] ?? []}
                  onChange={(order) =>
                    saveAnswers({
                      ranks: { ...answers.ranks!, [rankPlayer]: order },
                    })
                  }
                />
                <div className="flex gap-2">
                  {rankPlayer === "B" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setRankPlayer("A")}
                    >
                      Back
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => {
                      if (rankPlayer === "A") setRankPlayer("B");
                      else save({ part: "predict" });
                    }}
                  >
                    {rankPlayer === "A"
                      ? `Next: ${B.name}`
                      : "Predict the outcome"}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : null}

        {part === "predict" ? (
          <>
            {storyBlock}
            <div className="space-y-2">
              <p className="text-body font-medium text-foreground">
                Where do they end up? Pick the outcome where neither side wants
                to change (pick two if you see two).
              </p>
              <PayoffMatrix
                game={exercise}
                showPayoffs={cfg.showPayoffs}
                selected={answers.prediction}
                onToggle={(key) =>
                  saveAnswers({ prediction: toggle(answers.prediction, key) })
                }
                testId="prediction-matrix"
              />
              {!cfg.showPayoffs ? <OutcomeStories game={exercise} /> : null}
            </div>

            {cfg.extraQuestions && answers.dominant ? (
              <div className="space-y-4">
                {(["A", "B"] as const).map((p) => {
                  const who = p === "A" ? A : B;
                  const opts =
                    p === "A" ? exercise.optionsA : exercise.optionsB;
                  return (
                    <div
                      key={p}
                      className="space-y-2"
                      data-testid="dominant-question"
                    >
                      <p className="text-body font-medium text-foreground">
                        Does {who.name} have a choice that is best whatever the
                        other side does?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          ...opts.map((o) => ({ id: o.id, label: o.label })),
                          { id: "none", label: "No such choice" },
                        ].map((o) => (
                          <Button
                            key={o.id}
                            type="button"
                            size="sm"
                            variant={
                              answers.dominant![p] === o.id
                                ? "default"
                                : "outline"
                            }
                            aria-pressed={answers.dominant![p] === o.id}
                            onClick={() =>
                              saveAnswers({
                                dominant: { ...answers.dominant!, [p]: o.id },
                              })
                            }
                          >
                            {o.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="space-y-2" data-testid="better-question">
                  <p className="text-body font-medium text-foreground">
                    Is there an outcome that would be better for BOTH than where
                    they end up? Pick it, or leave none picked.
                  </p>
                  <PayoffMatrix
                    game={exercise}
                    showPayoffs={false}
                    selected={answers.betterForBoth}
                    onToggle={(key) =>
                      saveAnswers({
                        betterForBoth: toggle(answers.betterForBoth ?? [], key),
                      })
                    }
                    testId="better-matrix"
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="strategy-why">
                Why do they end up there? (one or two sentences)
              </Label>
              <Textarea
                id="strategy-why"
                rows={2}
                value={exercise.userWhy ?? ""}
                onChange={(e) => save({ userWhy: e.target.value })}
              />
            </div>
            <ConfidenceSlider
              value={confidence}
              onChange={setConfidence}
              label="How sure are you about the outcome?"
            />
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => save({ part: "analyze" })}
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
