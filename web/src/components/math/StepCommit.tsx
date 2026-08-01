"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/types/math-scenario";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StepCommitProps {
  scenario: Scenario;
  onCommit: (data: {
    committedValue: string | number;
    predictionText?: string;
    confidence: number; // 0.00 to 1.00
    correct: boolean;
  }) => void;
  onStruggle: () => void;
}

export function StepCommit({ scenario, onCommit, onStruggle }: StepCommitProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [numericInput, setNumericInput] = useState<string>("");
  const [predictionText, setPredictionText] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(70); // 0 - 100

  const commitSpec = scenario.commitSpec;
  const isMultipleChoice = commitSpec.kind === "multiple_choice";

  const isFormValid = isMultipleChoice ? !!selectedOptionId : numericInput.trim().length > 0;

  const handleCommit = () => {
    if (!isFormValid) return;

    let correct = false;
    let committedValue: string | number = "";

    if (isMultipleChoice) {
      committedValue = selectedOptionId!;
      correct = selectedOptionId === commitSpec.correctOptionId;
    } else {
      const numVal = parseFloat(numericInput);
      committedValue = numVal;
      if (commitSpec.targetValue !== undefined) {
        const tol = commitSpec.tolerance ?? 0;
        correct = Math.abs(numVal - commitSpec.targetValue) <= tol;
      } else if (commitSpec.acceptableRange) {
        correct = numVal >= commitSpec.acceptableRange[0] && numVal <= commitSpec.acceptableRange[1];
      }
    }

    onCommit({
      committedValue,
      predictionText: predictionText.trim() || undefined,
      confidence: confidence / 100,
      correct,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Step 2 - Commit prediction (hard gate)
            </span>
            <Badge variant="secondary">No peeking allowed</Badge>
          </div>
          <h3 className="text-base font-semibold">{commitSpec.promptText}</h3>

          {/* Commitment Options */}
          {isMultipleChoice ? (
            <div className="space-y-2.5">
              {commitSpec.options?.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={cn(
                      "w-full rounded-lg border p-3.5 text-left text-sm font-medium transition-colors",
                      isSelected
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-border bg-transparent hover:bg-muted/60",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs",
                          isSelected ? "border-white bg-white text-zinc-900" : "border-border",
                        )}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>
                Numeric estimate {commitSpec.unit ? `(${commitSpec.unit})` : ""}
              </Label>
              <Input
                type="number"
                value={numericInput}
                onChange={(e) => setNumericInput(e.target.value)}
                placeholder="e.g. 22000"
              />
            </div>
          )}

          {/* Optional Reasoning / Notes */}
          <div className="space-y-2">
            <Label>Brief reasoning (optional)</Label>
            <Textarea
              value={predictionText}
              onChange={(e) => setPredictionText(e.target.value)}
              rows={2}
              placeholder="Why do you predict this? What trade-off are you weighing?"
            />
          </div>

          {/* Confidence Level Slider */}
          <div className="border-border bg-muted/30 space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Stated confidence level</span>
              <span className="text-sm font-semibold tabular-nums">{confidence}% certain</span>
            </div>
            <Slider
              value={[confidence]}
              onValueChange={(vals) => setConfidence(vals[0])}
              min={0}
              max={100}
              step={5}
              className="py-2"
            />
            <div className="text-muted-foreground flex justify-between text-[10px]">
              <span>0% (pure guess)</span>
              <span>50% (uncertain)</span>
              <span>100% (absolute certainty)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onStruggle}>
          Need Socratic hint? (Ask AI tutor)
        </Button>

        <Button disabled={!isFormValid} onClick={handleCommit} size="lg">
          Lock in commitment →
        </Button>
      </div>
    </div>
  );
}
