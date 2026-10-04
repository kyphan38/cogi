"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/shared/AnswerKeyParts";
import { isCalibrationExercise, type Exercise } from "@/lib/types/exercise";
import { aggregateCalibration, CALIBRATION_HISTORY_MIN, type CalibrationHistory } from "@/lib/exercise/calibration-score";

const W = 320;
const H = 240;
const PAD = { left: 40, right: 12, top: 12, bottom: 36 };
const X_MIN = 50;
const X_MAX = 100;

const x = (confidence: number) => PAD.left + ((confidence - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.left - PAD.right);
const y = (pct: number) => PAD.top + (1 - pct / 100) * (H - PAD.top - PAD.bottom);

/**
 * "How sure vs how right": each dot is one confidence step (x) and how often those
 * answers were right (y). Dots on the dashed line mean well calibrated; below it,
 * overconfident. One series, so no legend; a table holds every number.
 */
function CalibrationCurve({ h }: { h: CalibrationHistory }) {
  const [hover, setHover] = useState<number | null>(null);
  const points = h.buckets.map((bk) => ({ ...bk, pct: Math.round((bk.right / bk.count) * 100) }));
  const active = points.find((p) => p.confidence === hover);
  return (
    <div className="relative w-full max-w-sm" data-testid="calibration-curve">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="How sure you were against how often you were right">
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--muted-foreground)">
              {t}%
            </text>
          </g>
        ))}
        {[50, 60, 70, 80, 90, 100].map((c) => (
          <text key={c} x={x(c)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
            {c}%
          </text>
        ))}
        <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
          How sure you said you were
        </text>
        {/* Perfect calibration: right as often as you were sure. */}
        <line x1={x(50)} y1={y(50)} x2={x(100)} y2={y(100)} stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 4" />
        <text x={x(100) - 4} y={y(100) + 14} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">
          perfect
        </text>
        {points.length > 1 ? (
          <polyline
            points={points.map((p) => `${x(p.confidence)},${y(p.pct)}`).join(" ")}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ) : null}
        {points.map((p) => (
          <g key={p.confidence} onMouseEnter={() => setHover(p.confidence)} onMouseLeave={() => setHover(null)}>
            {/* Bigger invisible target than the mark. */}
            <circle cx={x(p.confidence)} cy={y(p.pct)} r={14} fill="transparent" />
            <circle
              cx={x(p.confidence)}
              cy={y(p.pct)}
              r={hover === p.confidence ? 6 : 5}
              fill="var(--foreground)"
              stroke="var(--card)"
              strokeWidth={2}
            />
          </g>
        ))}
      </svg>
      {active ? (
        <div
          className="bg-popover text-popover-foreground pointer-events-none absolute rounded-md border px-2 py-1 text-xs shadow-sm"
          style={{
            left: `${(x(active.confidence) / W) * 100}%`,
            top: `${(y(active.pct) / H) * 100}%`,
            // Keep it inside the chart at both ends.
            transform: `translate(${active.confidence <= 60 ? "-10%" : active.confidence >= 90 ? "-90%" : "-50%"}, -130%)`,
          }}
          role="status"
        >
          Said {active.confidence}%: right {active.pct}% ({active.right} of {active.count})
        </div>
      ) : null}
    </div>
  );
}

/** History card for Calibration, shown once there are enough answers to mean something. */
export function CalibrationHistoryCard({ rows }: { rows: Exercise[] }) {
  const h = useMemo(
    () => aggregateCalibration(rows.filter(isCalibrationExercise).flatMap((r) => (r.result ? [r.result] : []))),
    [rows],
  );
  if (h.answered < CALIBRATION_HISTORY_MIN) return null;
  return (
    <Card data-testid="calibration-history">
      <CardHeader>
        <CardTitle className="text-base">How sure vs how right</CardTitle>
        <p className="text-muted-foreground text-xs">
          From {h.answered} answers in {h.exercises} Calibration exercises. Dots below the dashed line mean you were more
          sure than right.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {h.buckets.length > 0 ? <CalibrationCurve h={h} /> : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {h.ranges.map((rg) => (
            <Stat
              key={rg.target}
              label={`${rg.target}% ranges that held the answer`}
              value={`${Math.round((rg.hits / rg.count) * 100)}%`}
            />
          ))}
          {h.baseRate.count > 0 ? (
            <Stat label="Base rates within 5 points" value={`${h.baseRate.right}/${h.baseRate.count}`} />
          ) : null}
        </div>
        {h.buckets.length > 0 ? (
          <details className="text-sm">
            <summary className="cursor-pointer underline underline-offset-4">Show the numbers</summary>
            <table className="mt-2 w-full max-w-sm text-left tabular-nums">
              <thead className="text-muted-foreground text-xs">
                <tr>
                  <th className="py-1 font-normal">How sure</th>
                  <th className="py-1 font-normal">Answers</th>
                  <th className="py-1 font-normal">Right</th>
                </tr>
              </thead>
              <tbody>
                {h.buckets.map((bk) => (
                  <tr key={bk.confidence} className="border-muted border-t">
                    <td className="py-1">{bk.confidence}%</td>
                    <td className="py-1">{bk.count}</td>
                    <td className="py-1">{Math.round((bk.right / bk.count) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
