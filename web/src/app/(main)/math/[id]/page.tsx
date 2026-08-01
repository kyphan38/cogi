"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getScenarioById } from "@/lib/scenarios";
import type { LoopState } from "@/lib/types/math-scenario";
import type { ConfidenceRecord } from "@/lib/types/exercise";
import { putConfidenceRecord } from "@/lib/db/confidence";
import { StepDrop } from "@/components/math/StepDrop";
import { StepCommit } from "@/components/math/StepCommit";
import { StepStruggle } from "@/components/math/StepStruggle";
import { StepReveal } from "@/components/math/StepReveal";
import { StepTeachBack } from "@/components/math/StepTeachBack";
import { Button } from "@/components/ui/button";

export default function MathScenarioRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const scenario = getScenarioById(id);

  const [loopState, setLoopState] = useState<LoopState>("drop");
  const [committedData, setCommittedData] = useState<{
    committedValue: string | number;
    predictionText?: string;
    confidence: number; // 0.00 to 1.00
    correct: boolean;
  } | null>(null);

  if (!scenario) {
    return (
      <div className="space-y-4 text-center py-12">
        <h1 className="text-xl font-bold text-slate-100">Scenario Not Found</h1>
        <p className="text-xs text-slate-400">The scenario ID "{id}" does not exist in the catalog.</p>
        <Link href="/math">
          <Button variant="outline" className="text-xs">
            ← Return to Scenarios
          </Button>
        </Link>
      </div>
    );
  }

  const stepsList: Array<{ key: LoopState; label: string }> = [
    { key: "drop", label: "1. Drop" },
    { key: "commit", label: "2. Commit" },
    { key: "struggle", label: "3. Struggle" },
    { key: "reveal_answer", label: "4. Reveal" },
    { key: "teach_back", label: "5. Teach-Back" },
  ];

  const currentStepIndex =
    loopState === "drop"
      ? 0
      : loopState === "commit"
      ? 1
      : loopState === "struggle"
      ? 2
      : loopState.startsWith("reveal")
      ? 3
      : loopState === "teach_back"
      ? 4
      : 5;

  const handleCommitSubmit = (data: {
    committedValue: string | number;
    predictionText?: string;
    confidence: number;
    correct: boolean;
  }) => {
    setCommittedData(data);
    setLoopState("reveal_answer");
  };

  const handleCompleteScenario = async () => {
    if (committedData) {
      const confPct = Math.round(committedData.confidence * 100);
      const accPct = committedData.correct ? 100 : 0;
      const record: ConfidenceRecord = {
        id: crypto.randomUUID(),
        exerciseId: scenario.id,
        confidenceBefore: confPct,
        actualAccuracy: accPct,
        gap: confPct - accPct,
        createdAt: new Date().toISOString(),
      };
      try {
        await putConfidenceRecord(record);
      } catch {
        // Safe local fallback
      }
    }
    setLoopState("complete");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Step Indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/math"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center space-x-1"
          >
            <span>← Back to Catalog</span>
          </Link>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            {scenario.topic.replace("_", " ")}
          </span>
        </div>

        {/* Stepper Bar */}
        <div className="grid grid-cols-5 gap-2">
          {stepsList.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <div
                key={step.key}
                className={`rounded-lg py-2 text-center text-xs font-semibold border transition-all ${
                  isActive
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-md"
                    : isCompleted
                    ? "border-slate-800 bg-slate-900 text-slate-300"
                    : "border-slate-900 bg-slate-950/50 text-slate-600"
                }`}
              >
                {step.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Renderers */}
      {loopState === "drop" && (
        <StepDrop
          scenario={scenario}
          onProceed={() => setLoopState("commit")}
        />
      )}

      {loopState === "commit" && (
        <StepCommit
          scenario={scenario}
          onCommit={handleCommitSubmit}
          onStruggle={() => setLoopState("struggle")}
        />
      )}

      {loopState === "struggle" && (
        <StepStruggle
          scenario={scenario}
          onProceedToCommit={() => setLoopState("commit")}
        />
      )}

      {loopState.startsWith("reveal") && (
        <StepReveal
          scenario={scenario}
          isCorrect={committedData?.correct ?? false}
          onProceedToTeachBack={() => setLoopState("teach_back")}
        />
      )}

      {loopState === "teach_back" && (
        <StepTeachBack
          scenario={scenario}
          onComplete={handleCompleteScenario}
        />
      )}

      {loopState === "complete" && (
        <div className="rounded-xl border border-emerald-500/30 bg-slate-900/90 p-8 text-center space-y-5 shadow-2xl backdrop-blur-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-2xl font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Scenario Complete!</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Your prediction & confidence score have been logged into your calibration history.
          </p>

          <div className="pt-4 flex justify-center space-x-3">
            <Button
              onClick={() => router.push("/math")}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-2"
            >
              Return to Catalog
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
