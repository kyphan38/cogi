"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { EvaluativeHiddenCriterion } from "@/lib/types/exercise";

export function EvaluativeBlindSpotAlerts({
  hiddenCriteria,
}: {
  hiddenCriteria: EvaluativeHiddenCriterion[];
}) {
  if (hiddenCriteria.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Blind spots to reconsider</p>
      {hiddenCriteria.map((h, i) => (
        <Alert key={`${h.label}-${i}`} variant="default" className="border-amber-500/40 bg-amber-500/5">
          <AlertTitle className="text-sm">{h.label}</AlertTitle>
          <AlertDescription className="text-sm">{h.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
