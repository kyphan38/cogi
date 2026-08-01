"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/types/math-scenario";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

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
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
            Step 2 — Commit Prediction (Hard Gate)
          </span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
            No peeking allowed
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-4">{commitSpec.promptText}</h3>

        {/* Commitment Options */}
        {isMultipleChoice ? (
          <div className="space-y-3 mb-6">
            {commitSpec.options?.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all text-sm font-medium ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-md"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-500 text-slate-950 font-bold"
                          : "border-slate-700 bg-slate-900"
                      }`}
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
          <div className="mb-6 space-y-2">
            <label className="text-xs text-slate-400">Numeric Estimate {commitSpec.unit ? `(${commitSpec.unit})` : ""}</label>
            <input
              type="number"
              value={numericInput}
              onChange={(e) => setNumericInput(e.target.value)}
              placeholder="e.g. 22000"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}

        {/* Optional Reasoning / Notes */}
        <div className="mb-6 space-y-2">
          <label className="text-xs text-slate-400">Brief Reasoning (Optional)</label>
          <textarea
            value={predictionText}
            onChange={(e) => setPredictionText(e.target.value)}
            rows={2}
            placeholder="Why do you predict this? What trade-off are you weighing?"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Confidence Level Slider */}
        <div className="space-y-3 rounded-lg border border-slate-800/80 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Stated Confidence Level</span>
            <span className="text-sm font-bold text-emerald-400">{confidence}% Certain</span>
          </div>
          <Slider
            value={[confidence]}
            onValueChange={(vals) => setConfidence(vals[0])}
            min={0}
            max={100}
            step={5}
            className="py-2"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0% (Pure Guess)</span>
            <span>50% (Uncertain)</span>
            <span>100% (Absolute Certainty)</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onStruggle}
          className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs"
        >
          Need Socratic Hint? (Ask AI Tutor)
        </Button>

        <Button
          disabled={!isFormValid}
          onClick={handleCommit}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold px-6 py-2.5 rounded-lg shadow-lg transition-all"
        >
          Lock In Commitment →
        </Button>
      </div>
    </div>
  );
}
