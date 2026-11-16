"use client";

import { Stat } from "@/components/shared/AnswerKeyParts";
import { brierScore, brierWord, forecastBuckets, resolvedForecasts, type Forecast, type ForecastBucket } from "@/lib/forecasts/logic";

const W = 320;
const H = 240;
const PAD = { left: 40, right: 12, top: 12, bottom: 36 };
const x = (pct: number) => PAD.left + (pct / 100) * (W - PAD.left - PAD.right);
const y = (pct: number) => PAD.top + (1 - pct / 100) * (H - PAD.top - PAD.bottom);
const TICKS = [0, 25, 50, 75, 100];

/** The chance you gave (x) against how often it happened (y). On the dashed line: well calibrated. */
function ForecastCurve({ buckets }: { buckets: ForecastBucket[] }) {
  const points = buckets.map((b) => ({ ...b, pct: Math.round((b.happened / b.count) * 100) }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm" role="img" aria-label="The chance you gave against how often it happened" data-testid="forecast-curve">
      {TICKS.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--muted-foreground)">
            {t}%
          </text>
          <text x={x(t)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
            {t}%
          </text>
        </g>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
        The chance you gave
      </text>
      <line x1={x(0)} y1={y(0)} x2={x(100)} y2={y(100)} stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 4" />
      {points.length > 1 ? (
        <polyline points={points.map((p) => `${x(p.said)},${y(p.pct)}`).join(" ")} fill="none" stroke="var(--foreground)" strokeWidth={2} strokeLinejoin="round" />
      ) : null}
      {points.map((p) => (
        <circle key={p.from} cx={x(p.said)} cy={y(p.pct)} r={5} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2} />
      ))}
    </svg>
  );
}

/** Score and calibration of the resolved forecasts. The table holds every number in the chart. */
export function ForecastRecord({ forecasts }: { forecasts: Forecast[] }) {
  const brier = brierScore(forecasts);
  if (brier === null) return null;
  const buckets = forecastBuckets(forecasts);
  const count = resolvedForecasts(forecasts).length;
  return (
    <div className="space-y-4 text-body" data-testid="forecast-record">
      <div className="grid grid-cols-2 gap-2">
        <Stat label={`Brier score: ${brierWord(brier)} (0 is perfect)`} value={brier.toFixed(2)} />
        <Stat label={count === 1 ? "forecast resolved" : "forecasts resolved"} value={String(count)} />
      </div>
      <ForecastCurve buckets={buckets} />
      <table className="w-full max-w-sm text-left tabular-nums">
        <thead className="text-meta text-muted-foreground">
          <tr>
            <th className="py-1 font-normal">You said</th>
            <th className="py-1 font-normal">Forecasts</th>
            <th className="py-1 font-normal">Happened</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.from} className="border-t border-border">
              <td className="py-1">
                {b.from}-{b.to}%
              </td>
              <td className="py-1">{b.count}</td>
              <td className="py-1">
                {Math.round((b.happened / b.count) * 100)}% ({b.happened} of {b.count})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
