"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/types/math-scenario";
import { Button } from "@/components/ui/button";

interface StepRevealProps {
  scenario: Scenario;
  isCorrect: boolean;
  onProceedToTeachBack: (userBoundaryGuess: string) => void;
}

export function StepReveal({ scenario, isCorrect, onProceedToTeachBack }: StepRevealProps) {
  const [boundaryGuess, setBoundaryGuess] = useState<string>("");
  const [showBoundaries, setShowBoundaries] = useState<boolean>(false);

  const handleRevealBoundaries = () => {
    setShowBoundaries(true);
  };

  return (
    <div className="space-y-6">
      {/* Ground Truth Reveal & Named Mental Model */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-purple-400 uppercase">
            Step 4 — Reveal & Name the Tool
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isCorrect
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
            }`}
          >
            {isCorrect ? "Prediction Aligned ✓" : "Intuition Trap Identified"}
          </span>
        </div>

        {/* Canonical Answer & Named Tool */}
        <div className="mb-6 rounded-lg bg-purple-950/40 border border-purple-800/40 p-4">
          <div className="text-xs font-medium text-purple-300 mb-1">NAMED MENTAL MODEL</div>
          <div className="text-xl font-extrabold text-slate-100 mb-2">{scenario.toolName}</div>
          <div className="text-sm font-semibold text-purple-200 mb-2">{scenario.canonicalAnswer}</div>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {scenario.explanation}
          </p>
        </div>

        {/* Cross-Domain Transfers */}
        <div className="mb-6 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Cross-Domain Transfers (Same Structure, Different Domain)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scenario.transfers.map((t, idx) => (
              <div key={idx} className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">
                <div className="text-xs font-semibold text-emerald-400 mb-1">{t.domain}</div>
                <div className="text-xs text-slate-300 leading-normal">{t.mapping}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Field Note Real-Life Takeaway */}
        <div className="mb-6 rounded-lg bg-emerald-950/30 border border-emerald-800/40 p-3 text-xs text-emerald-200">
          <span className="font-bold">Real-Life Takeaway:</span> {scenario.fieldNote}
        </div>

        {/* Active Boundary Beat: Predict Where It Breaks */}
        <div className="space-y-4 border-t border-slate-800/80 pt-5">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <span>Boundary Breaking Question</span>
          </div>
          <p className="text-xs font-semibold text-slate-200">
            Where does this analogy break? What assumption or condition would make this model fail?
          </p>

          {!showBoundaries ? (
            <div className="space-y-3">
              <textarea
                value={boundaryGuess}
                onChange={(e) => setBoundaryGuess(e.target.value)}
                rows={2}
                placeholder="Predict when this model fails before seeing authored boundaries..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleRevealBoundaries}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-4 py-2"
                >
                  Reveal Failure Boundaries →
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg bg-amber-950/20 border border-amber-800/40 p-4">
              <div className="text-xs font-bold text-amber-300">AUTHORED FAILURE BOUNDARIES</div>
              {scenario.boundaries.map((b, idx) => (
                <div key={idx} className="text-xs space-y-1">
                  <div className="font-semibold text-slate-200">• Condition: {b.condition}</div>
                  <div className="text-slate-400 pl-3">Why it breaks: {b.whyItBreaks}</div>
                </div>
              ))}

              {boundaryGuess.trim() && (
                <div className="mt-3 pt-3 border-t border-amber-900/40 text-xs text-slate-300">
                  <span className="font-semibold text-amber-400">Your Boundary Prediction:</span> "{boundaryGuess}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={!showBoundaries}
          onClick={() => onProceedToTeachBack(boundaryGuess)}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-slate-100 font-semibold px-6 py-2.5 rounded-lg shadow-lg"
        >
          Proceed to Teach-Back (Feynman Step) →
        </Button>
      </div>
    </div>
  );
}
