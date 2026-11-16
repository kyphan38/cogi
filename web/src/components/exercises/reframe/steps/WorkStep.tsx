"use client";

import {
  ExerciseStepCard,
  EXERCISE_STEP_META_BADGE,
} from "@/components/shared/ExerciseStepCard";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { LearnFirst } from "@/components/exercises/LearnFirst";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LEVEL_LABELS } from "@/lib/exercise/levels";
import { FeelingSlider } from "@/components/exercises/reframe/shared";
import type { ReframeFlowState } from "@/components/exercises/reframe/useReframeFlow";

export function WorkStep({
  s,
  exercise,
}: {
  s: ReframeFlowState;
  exercise: NonNullable<ReframeFlowState["exercise"]>;
}) {
  const {
    loading,
    confidence,
    setConfidence,
    cfg,
    save,
    getFeedback,
    rewriteOrder,
    part,
    thoughtsDone,
    target,
    countHint,
    scenarioBlock,
    feelingBlock,
    oneByOne,
    listLayout,
    monologue,
  } = s;

  return (
    <>
      <ExerciseStepCard
        data-testid="reframe-exercise-card"
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
            onDone={() => save({ part: "spot" })}
          />
        ) : null}

        {part === "spot" ? (
          <>
            {scenarioBlock}
            {feelingBlock}
            <div className="space-y-1">
              <p className="text-body font-medium text-foreground">
                Now look at the thoughts that came next.
              </p>
              <p
                className="text-muted-foreground text-meta"
                data-testid="count-hint"
              >
                {countHint}
              </p>
            </div>
            {cfg.layout === "one-by-one"
              ? oneByOne(exercise)
              : cfg.layout === "list"
                ? listLayout(exercise)
                : monologue(exercise)}
            {exercise.spotLocked && cfg.layout !== "one-by-one" ? (
              <p
                className="text-muted-foreground text-meta"
                data-testid="spot-locked"
              >
                Answers are locked once you see the thought to rewrite.
              </p>
            ) : null}
            {cfg.layout !== "one-by-one" ? (
              <Button
                type="button"
                disabled={!thoughtsDone || !exercise.feeling}
                onClick={() => save({ part: "reframe", spotLocked: true })}
              >
                Reframe a thought
              </Button>
            ) : null}
            {!exercise.feeling ? (
              <p className="text-muted-foreground text-meta">
                Name the feeling first to go on.
              </p>
            ) : null}
          </>
        ) : null}

        {part === "reframe" && target ? (
          <>
            <div className="space-y-2">
              <p className="text-body font-medium text-foreground">
                Rewrite this thought in a fair, balanced way.
              </p>
              <blockquote
                className="border-l-2 border-foreground pl-3 text-body italic text-foreground"
                data-testid="rewrite-target"
              >
                {target.text}
              </blockquote>
              <p className="text-muted-foreground text-meta">
                Balanced, not positive. Stay true to the facts.
              </p>
            </div>
            {cfg.rewrite === "choose" ? (
              <div
                className="grid gap-2"
                role="radiogroup"
                aria-label={exercise.rewrite.question}
              >
                <p className="text-body font-medium text-foreground">
                  {exercise.rewrite.question}
                </p>
                {rewriteOrder.map((oi) => (
                  <button
                    key={oi}
                    type="button"
                    role="radio"
                    aria-checked={exercise.rewriteChoice === oi}
                    onClick={() => save({ rewriteChoice: oi })}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left text-body",
                      exercise.rewriteChoice === oi
                        ? "border-foreground bg-muted"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {exercise.rewrite.options[oi]}
                  </button>
                ))}
              </div>
            ) : (
              <>
                {cfg.rewrite === "evidence" ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="reframe-for">
                        What facts support this thought?
                      </Label>
                      <Textarea
                        id="reframe-for"
                        rows={2}
                        value={exercise.evidenceFor ?? ""}
                        onChange={(e) => save({ evidenceFor: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reframe-against">
                        What facts do not fit it?
                      </Label>
                      <Textarea
                        id="reframe-against"
                        rows={2}
                        value={exercise.evidenceAgainst ?? ""}
                        onChange={(e) =>
                          save({ evidenceAgainst: e.target.value })
                        }
                      />
                    </div>
                  </>
                ) : null}
                <div className="grid gap-2">
                  <Label htmlFor="reframe-balanced">
                    Your balanced thought
                  </Label>
                  <Textarea
                    id="reframe-balanced"
                    rows={3}
                    value={exercise.balancedThought ?? ""}
                    onChange={(e) => save({ balancedThought: e.target.value })}
                    placeholder="What is a fairer way to say it to yourself?"
                  />
                </div>
              </>
            )}
            <FeelingSlider
              id="intensity-after"
              label={`How strong is the feeling${exercise.feeling ? ` (${exercise.feeling.toLowerCase()})` : ""} now?`}
              value={exercise.intensityAfter ?? exercise.intensityBefore ?? 50}
              onChange={(v) => save({ intensityAfter: v })}
            />
            <ConfidenceSlider
              value={confidence}
              onChange={setConfidence}
              label="How sure are you about the traps you found?"
            />
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => save({ part: "spot" })}
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
