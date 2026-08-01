import type { CalibrationBin } from "@/lib/types/math-scenario";
import type { ConfidenceRecord } from "@/lib/types/exercise";

export const CALIBRATION_BINS_MVP: Array<{
  label: string;
  min: number;
  max: number;
}> = [
  { label: "Low (0-40%)", min: 0, max: 40 },
  { label: "Medium (40-70%)", min: 40, max: 70 },
  { label: "High (70-100%)", min: 70, max: 100 },
];

export function computeCalibrationBins(records: ConfidenceRecord[]): CalibrationBin[] {
  return CALIBRATION_BINS_MVP.map((bin) => {
    const matchingRecords = records.filter(
      (r) => r.confidenceBefore >= bin.min && r.confidenceBefore <= bin.max,
    );

    const count = matchingRecords.length;
    const accuracySum = matchingRecords.reduce((acc, r) => acc + r.actualAccuracy, 0);
    const avgAccuracy = count > 0 ? Math.round((accuracySum / (count * 100)) * 100) / 100 : 0;

    return {
      binLabel: bin.label,
      minConfidence: bin.min / 100,
      maxConfidence: bin.max / 100,
      attemptCount: count,
      actualAccuracy: avgAccuracy,
    };
  });
}
