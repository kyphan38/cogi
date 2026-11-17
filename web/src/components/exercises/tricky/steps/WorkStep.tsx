"use client";

import { ExerciseStepCard, EXERCISE_STEP_META_BADGE } from "@/components/shared/ExerciseStepCard";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { LearnFirst } from "@/components/exercises/LearnFirst";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEVEL_LABELS } from "@/lib/exercise/levels";
import { ChoiceButtons } from "@/components/exercises/judgment/shared";
import { Line, StepsGuide } from "@/components/exercises/tricky/shared";
import type { TrickyFlowState } from "@/components/exercises/tricky/useTrickyFlow";

export function WorkStep({ s, exercise }: { s: TrickyFlowState; exercise: NonNullable<TrickyFlowState["exercise"]> }) {
  const { loading, confidence, setConfidence, cfg, save, part, roundsDone, allAnswered, currentAnswer, pick, writeAnswer, nextRound, getFeedback, optionOrders } = s;
  const choose = cfg.answerMode === "choose";
  const shown = exercise.rounds.slice(0, Math.min(roundsDone + 1, exercise.rounds.length));

  return (
    <ExerciseStepCard
      data-testid="tricky-exercise-card"
      title={exercise.title}
      description={
        <>
          {exercise.domain}
          <span className={EXERCISE_STEP_META_BADGE}>{LEVEL_LABELS[exercise.level]}</span>
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
          onDone={() => save({ part: "rounds" })}
        />
      ) : (
        <>
          <p className="whitespace-pre-wrap text-body leading-[1.75] text-foreground">{exercise.setting}</p>
          {cfg.showSteps ? <StepsGuide /> : null}
          <div className="space-y-4" data-testid="tricky-rounds">
            {shown.map((r, i) => {
              const done = i < roundsDone;
              const picked = exercise.picks?.[i] ?? undefined;
              return (
                <div key={i} className="space-y-3" data-testid="tricky-round">
                  <p className="text-meta text-muted-foreground">
                    Question {i + 1} of {exercise.rounds.length}
                  </p>
                  <Line who={exercise.asker} text={r.question} />
                  {choose ? (
                    <>
                      <ChoiceButtons
                        options={r.options.map((o) => o.text)}
                        order={optionOrders[i] ?? [0, 1, 2]}
                        picked={picked}
                        answer={r.options.findIndex((o) => o.quality === "best")}
                        reveal
                        label={r.question}
                        onPick={(oi) => pick(oi)}
                      />
                      {picked != null ? <p className="text-body">{r.options[picked]?.why}</p> : null}
                      {picked != null && !done ? (
                        <Button type="button" onClick={nextRound}>
                          {i < exercise.rounds.length - 1 ? "Next question" : "Done"}
                        </Button>
                      ) : null}
                    </>
                  ) : done ? (
                    <Line who="You" text={exercise.answers?.[i] ?? ""} mine />
                  ) : (
                    <div className="grid gap-2">
                      <Label htmlFor={`tricky-answer-${i}`}>What do you say?</Label>
                      <Textarea id={`tricky-answer-${i}`} rows={3} value={currentAnswer} onChange={(e) => writeAnswer(e.target.value)} />
                      <div>
                        <Button type="button" onClick={nextRound}>
                          Answer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {allAnswered ? (
            <>
              <ConfidenceSlider value={confidence} onChange={setConfidence} label="How well did you handle it?" />
              {loading && !choose ? <PerspectiveLoadingCard /> : null}
              <Button type="button" disabled={loading} onClick={() => void getFeedback()}>
                {loading ? "Loading…" : choose ? "See results" : "Get AI feedback"}
              </Button>
            </>
          ) : null}
        </>
      )}
    </ExerciseStepCard>
  );
}
