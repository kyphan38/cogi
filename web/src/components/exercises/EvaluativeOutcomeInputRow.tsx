"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { EvaluativeUncertaintyOutcome } from "@/lib/types/exercise";

export function EvaluativeOutcomeInputRow({
  outcome,
  userProbability,
  userPayoff,
  onProbabilityChange,
  onPayoffChange,
}: {
  outcome: EvaluativeUncertaintyOutcome;
  userProbability: number | undefined;
  userPayoff: number | undefined;
  onProbabilityChange: (probability: number) => void;
  onPayoffChange: (payoff: number) => void;
}) {
  const probabilityPct = Math.round((userProbability ?? 0) * 100);
  return (
    <div className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
      <div>
        <p className="text-sm font-medium">{outcome.label}</p>
        <p className="text-muted-foreground text-xs">{outcome.explanation}</p>
      </div>
      <p className="text-muted-foreground text-xs">
        AI: {Math.round(outcome.probability * 100)}% / ${outcome.payoff}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs">Your probability ({probabilityPct}%)</div>
          <Slider
            min={0}
            max={100}
            value={[probabilityPct]}
            onValueChange={(v) => {
              const n = Array.isArray(v) ? (v[0] ?? 0) : v;
              onProbabilityChange(n / 100);
            }}
            className="mt-2 w-full"
          />
        </div>
        <div>
          <div className="text-xs">Your payoff</div>
          <Input
            type="number"
            value={userPayoff ?? 0}
            onChange={(e) => onPayoffChange(Number(e.target.value))}
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
}
