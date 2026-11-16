"use client";

import { EvaluativeMatrixBoard } from "@/components/exercises/EvaluativeMatrixBoard";
import { EvaluativeOutcomeInputRow } from "@/components/exercises/EvaluativeOutcomeInputRow";
import { EvaluativeDealbreakerAlerts } from "@/components/exercises/EvaluativeDealbreakerAlerts";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import type { EvaluativeExerciseRow } from "@/lib/types/exercise";
import { computeOptionEv } from "@/lib/analytics/calibration-evaluative";
import { computeDisqualifiedOptions } from "@/lib/analytics/evaluative-dealbreaker";
import { putExercise } from "@/lib/db/exercises";
import type { EvaluativeFlowState } from "@/components/exercises/evaluative/useEvaluativeFlow";

export function EvaluateStep({
  s,
  exercise,
}: {
  s: EvaluativeFlowState;
  exercise: NonNullable<EvaluativeFlowState["exercise"]>;
}) {
  const {
    placements,
    setPlacements,
    criterionWeights,
    setCriterionWeights,
    scores,
    setScores,
    userProbabilities,
    setUserProbabilities,
    userPayoffs,
    setUserPayoffs,
    setStep,
    setExercise,
    loading,
    confidence,
    setConfidence,
    regenerate,
    matrixReady,
    uncertaintyReady,
    submitPerspective,
    weightedRowTotal,
  } = s;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{exercise.title}</CardTitle>
          <CardDescription className="leading-relaxed">
            {exercise.scenario}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {exercise.variant === "matrix" ? (
            <EvaluativeMatrixBoard
              axisX={exercise.axisX}
              axisY={exercise.axisY}
              options={exercise.options}
              placements={placements}
              onPlacementsChange={setPlacements}
            />
          ) : exercise.variant === "uncertainty" ? (
            <div className="space-y-6">
              {exercise.options.map((o) => {
                const ev = computeOptionEv(
                  o.outcomes.map((out) => ({
                    probability: userProbabilities[o.id]?.[out.id] ?? 0,
                    payoff: userPayoffs[o.id]?.[out.id] ?? 0,
                  })),
                );
                return (
                  <div key={o.id} className="space-y-3 border-t pt-3">
                    <div>
                      <p className="font-medium">{o.title}</p>
                      <p className="text-muted-foreground text-meta">
                        {o.description}
                      </p>
                    </div>
                    {o.outcomes.map((out) => (
                      <EvaluativeOutcomeInputRow
                        key={out.id}
                        outcome={out}
                        userProbability={userProbabilities[o.id]?.[out.id]}
                        userPayoff={userPayoffs[o.id]?.[out.id]}
                        onProbabilityChange={(p) =>
                          setUserProbabilities((prev) => ({
                            ...prev,
                            [o.id]: { ...prev[o.id], [out.id]: p },
                          }))
                        }
                        onPayoffChange={(payoff) =>
                          setUserPayoffs((prev) => ({
                            ...prev,
                            [o.id]: { ...prev[o.id], [out.id]: payoff },
                          }))
                        }
                      />
                    ))}
                    <p className="text-body font-medium">
                      Your expected value:{" "}
                      {ev === null ? "-" : `$${ev.toFixed(2)}`}
                    </p>
                  </div>
                );
              })}
              {!uncertaintyReady() ? (
                <p className="text-destructive text-meta">
                  For each option, your outcome probabilities must sum to 100%
                  and every outcome needs a payoff.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {exercise.criteria.some((c) => c.isDealbreaker) ? (
                <EvaluativeDealbreakerAlerts
                  disqualified={computeDisqualifiedOptions(exercise, scores)}
                />
              ) : null}
              <div className="max-h-[min(60vh,640px)] overflow-auto">
                <table className="w-full min-w-[480px] border-collapse text-body">
                  <thead>
                    <tr>
                      <th className="border p-2 text-left sticky top-0 z-10 bg-card">
                        Option
                      </th>
                      {exercise.criteria.map((c) => (
                        <th
                          key={c.id}
                          className="border p-2 text-left align-bottom sticky top-0 z-10 bg-card"
                        >
                          <div className="font-medium">{c.label}</div>
                          <p className="text-muted-foreground mt-1 text-meta font-normal">
                            {c.description}
                          </p>
                          <div className="mt-2 text-meta">Weight (1-5)</div>
                          <Slider
                            min={1}
                            max={5}
                            value={[criterionWeights[c.id] ?? 3]}
                            onValueChange={(v) => {
                              const n = Array.isArray(v) ? (v[0] ?? 3) : v;
                              setCriterionWeights((prev) => ({
                                ...prev,
                                [c.id]: n,
                              }));
                            }}
                            className="mt-2 w-full"
                          />
                        </th>
                      ))}
                      <th className="border p-2 text-right sticky top-0 z-10 bg-card">
                        Weighted avg
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercise.options.map((o) => (
                      <tr key={o.id}>
                        <td className="border p-2 align-top">
                          <p className="font-medium">{o.title}</p>
                          <p className="text-muted-foreground text-meta">
                            {o.description}
                          </p>
                        </td>
                        {exercise.criteria.map((c) => (
                          <td key={c.id} className="border p-2 align-top">
                            <div className="text-meta">Score (1-5)</div>
                            <Slider
                              min={1}
                              max={5}
                              value={[scores[o.id]?.[c.id] ?? 3]}
                              onValueChange={(v) => {
                                const n = Array.isArray(v) ? (v[0] ?? 3) : v;
                                setScores((prev) => ({
                                  ...prev,
                                  [o.id]: { ...prev[o.id], [c.id]: n },
                                }));
                              }}
                              className="mt-2 w-full"
                            />
                          </td>
                        ))}
                        <td className="border p-2 text-right font-medium">
                          {weightedRowTotal(o.id).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <ConfidenceSlider
            value={confidence}
            onChange={setConfidence}
            label="How confident are you in your evaluation?"
          />
          {loading ? <PerspectiveLoadingCard /> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const updated =
                  exercise.variant === "matrix"
                    ? { ...exercise, placements, currentStep: 1 as const }
                    : exercise.variant === "uncertainty"
                      ? {
                          ...exercise,
                          userProbabilities,
                          userPayoffs,
                          currentStep: 1 as const,
                        }
                      : { ...exercise, currentStep: 1 as const };
                setExercise(updated);
                void putExercise(updated);
                setStep(0);
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={regenerate}
              disabled={loading}
            >
              Regenerate
            </Button>
            <Button
              type="button"
              onClick={() => {
                const updated: EvaluativeExerciseRow =
                  exercise.variant === "matrix"
                    ? { ...exercise, placements }
                    : exercise.variant === "uncertainty"
                      ? { ...exercise, userProbabilities, userPayoffs }
                      : { ...exercise, criterionWeights, scores };
                setExercise(updated);
                void submitPerspective();
              }}
              disabled={
                loading ||
                (exercise.variant === "matrix" && !matrixReady()) ||
                (exercise.variant === "uncertainty" && !uncertaintyReady())
              }
            >
              {loading ? (
                <>
                  <InlineSpinner /> Loading…
                </>
              ) : (
                "Get AI feedback"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
