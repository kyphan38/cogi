"use client";

import type { Scenario } from "@/lib/types/math-scenario";
import { Button } from "@/components/ui/button";

interface StepDropProps {
  scenario: Scenario;
  onProceed: () => void;
}

export function StepDrop({ scenario, onProceed }: StepDropProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-4 flex items-center space-x-2 text-xs font-semibold tracking-wider text-emerald-400 uppercase">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Step 1 — Real-World Dilemma</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-4">{scenario.title}</h2>
        <p className="text-base text-slate-300 leading-relaxed whitespace-pre-line">
          {scenario.situation}
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onProceed}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-2.5 rounded-lg shadow-lg transition-all"
        >
          Commit My Prediction →
        </Button>
      </div>
    </div>
  );
}
