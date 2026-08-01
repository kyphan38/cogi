"use client";

import type { ConfidenceRecord } from "@/lib/types/exercise";
import { computeCalibrationBins } from "@/lib/calibration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CalibrationCurveProps {
  records: ConfidenceRecord[];
}

export function CalibrationCurve({ records }: CalibrationCurveProps) {
  const bins = computeCalibrationBins(records);
  const totalAttempts = records.length;
  const showNotice = totalAttempts < 15;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Calibration curve</CardTitle>
            <CardDescription>
              Stated confidence vs. empirical accuracy ({totalAttempts} attempt
              {totalAttempts === 1 ? "" : "s"})
            </CardDescription>
          </div>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-foreground inline-block h-2 w-2 rounded-full" />
              Actual accuracy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-muted-foreground/40 inline-block h-2 w-2 rounded-full" />
              Ideal (y = x)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showNotice && (
          <p className="border-border bg-muted/50 text-muted-foreground rounded-lg border p-3 text-xs">
            <span className="text-foreground font-medium">Illustrative curve:</span> minimum 5
            attempts per bin (15 total) recommended for statistical significance.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {bins.map((bin) => {
            const confidencePct = Math.round(((bin.minConfidence + bin.maxConfidence) / 2) * 100);
            const accuracyPct = Math.round(bin.actualAccuracy * 100);
            const isUnderCalibrated =
              bin.actualAccuracy > (bin.minConfidence + bin.maxConfidence) / 2;

            return (
              <div
                key={bin.binLabel}
                className="border-border bg-muted/30 flex flex-col justify-between rounded-lg border p-3"
              >
                <div className="text-muted-foreground text-xs font-medium">{bin.binLabel}</div>
                <div className="my-2 flex items-baseline justify-between">
                  <span className="text-xl font-semibold tabular-nums">{accuracyPct}%</span>
                  <span className="text-muted-foreground text-xs">Target ~{confidencePct}%</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <span>
                    {bin.attemptCount} attempt{bin.attemptCount === 1 ? "" : "s"}
                  </span>
                  {bin.attemptCount > 0 && (
                    <Badge variant={isUnderCalibrated ? "positive" : "attention"}>
                      {isUnderCalibrated ? "Underconfident" : "Overconfident"}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
