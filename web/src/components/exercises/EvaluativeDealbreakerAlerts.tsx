"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DEALBREAKER_PASS_THRESHOLD } from "@/lib/analytics/evaluative-dealbreaker";
import type { DealbreakerDisqualification } from "@/lib/analytics/evaluative-dealbreaker";

export function EvaluativeDealbreakerAlerts({
  disqualified,
}: {
  disqualified: DealbreakerDisqualification[];
}) {
  if (disqualified.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Deal-breaker disqualifications</p>
      {disqualified.map((d) => (
        <Alert key={d.optionId} variant="destructive">
          <AlertTitle className="text-sm">{d.optionTitle} disqualified</AlertTitle>
          <AlertDescription className="text-sm">
            {d.reasons.map((r) => (
              <div key={r.criterionId}>
                Scored {r.userScore}/5 on deal-breaker criterion &quot;{r.criterionLabel}&quot;
                (needs ≥{DEALBREAKER_PASS_THRESHOLD})
              </div>
            ))}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
