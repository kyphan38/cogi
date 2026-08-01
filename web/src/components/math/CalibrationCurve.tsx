"use client";

import type { ConfidenceRecord } from "@/lib/types/exercise";
import { computeCalibrationBins } from "@/lib/calibration";

interface CalibrationCurveProps {
  records: ConfidenceRecord[];
}

export function CalibrationCurve({ records }: CalibrationCurveProps) {
  const bins = computeCalibrationBins(records);
  const totalAttempts = records.length;
  const showNotice = totalAttempts < 15;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Calibration Curve</h3>
          <p className="text-xs text-slate-400">
            Stated Confidence vs. Empirical Accuracy ({totalAttempts} attempt{totalAttempts === 1 ? "" : "s"})
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <span className="flex items-center text-emerald-400">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Actual Accuracy
          </span>
          <span className="flex items-center text-slate-500">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-slate-500" />
            Ideal (y = x)
          </span>
        </div>
      </div>

      {showNotice && (
        <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
          <span className="font-medium">Illustrative Curve:</span> Minimum 5 attempts per bin (15 total) recommended for statistical significance.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {bins.map((bin) => {
          const confidencePct = Math.round(((bin.minConfidence + bin.maxConfidence) / 2) * 100);
          const accuracyPct = Math.round(bin.actualAccuracy * 100);
          const isUnderCalibrated = bin.actualAccuracy > (bin.minConfidence + bin.maxConfidence) / 2;

          return (
            <div
              key={bin.binLabel}
              className="flex flex-col justify-between rounded-lg bg-slate-950/50 p-3 border border-slate-800/80"
            >
              <div className="text-xs font-medium text-slate-400">{bin.binLabel}</div>
              <div className="my-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-100">{accuracyPct}%</span>
                <span className="text-xs text-slate-500">Target ~{confidencePct}%</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {bin.attemptCount} attempt{bin.attemptCount === 1 ? "" : "s"}
                {bin.attemptCount > 0 && (
                  <span className={isUnderCalibrated ? "ml-1 text-emerald-400" : "ml-1 text-sky-400"}>
                    ({isUnderCalibrated ? "Underconfident" : "Overconfident"})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
