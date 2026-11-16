"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EvaluativeUncertaintyRow } from "@/lib/types/exercise";
import { putExercise } from "@/lib/db/exercises";
import type { EvaluativeFlowState } from "@/components/exercises/evaluative/useEvaluativeFlow";

export function UncertaintyStartStep({
  s,
  exercise,
}: {
  s: EvaluativeFlowState;
  exercise: Extract<
    NonNullable<EvaluativeFlowState["exercise"]>,
    { variant: "uncertainty" }
  >;
}) {
  const {
    outcomeIntuitionText,
    setOutcomeIntuitionText,
    setStep,
    setExercise,
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
          <div className="space-y-2">
            <h3 className="text-body font-medium">Options</h3>
            <ul className="space-y-2 text-body">
              {exercise.options.map((o) => (
                <li key={o.id} className="border-t pt-2">
                  <p className="font-medium">{o.title}</p>
                  <p className="text-muted-foreground text-meta">
                    {o.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-2">
            <Label>
              Before estimating probabilities, what&apos;s your gut read on
              which option is best, and why?
            </Label>
            <Textarea
              value={outcomeIntuitionText}
              onChange={(e) => setOutcomeIntuitionText(e.target.value)}
              rows={4}
              placeholder="Your intuition before running the numbers…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(0)}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => {
                const next: EvaluativeUncertaintyRow = {
                  ...exercise,
                  outcomeIntuitionText,
                  currentStep: 2,
                };
                void putExercise(next);
                setExercise(next);
                setStep(2);
              }}
            >
              Continue to estimate
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
