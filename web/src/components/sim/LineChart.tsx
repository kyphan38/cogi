"use client";

import { useId, useMemo, useState } from "react";

export interface LineSeries {
  name: string;
  points: { x: number; y: number }[];
  /** Second series is told apart by a dashed stroke (no color: the app is monochrome). */
  dashed?: boolean;
}

/**
 * A small line chart: one or two series in ink, a recessive grid, a marker at the
 * current value, a crosshair tooltip on hover, and a table view for screen readers and
 * exact values. Two series get a legend and direct end labels (dashed vs solid).
 */
export function LineChart({
  series,
  xLabel,
  formatX,
  formatY,
  markerX,
  height = 180,
  title,
}: {
  series: LineSeries[];
  xLabel: string;
  formatX: (x: number) => string;
  formatY: (y: number) => string;
  /** x of the current setting, marked on every series. */
  markerX?: number;
  height?: number;
  title: string;
}) {
  const id = useId();
  const width = 320;
  const pad = { top: 12, right: 12, bottom: 28, left: 12 };
  const all = series.flatMap((s) => s.points);
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(0, ...ys), Math.max(...ys) * 1.08 || 1];
  const sx = (x: number) => pad.left + ((x - x0) / (x1 - x0 || 1)) * (width - pad.left - pad.right);
  const sy = (y: number) => pad.top + (1 - (y - y0) / (y1 - y0 || 1)) * (height - pad.top - pad.bottom);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const xValues = useMemo(() => [...new Set(series[0]?.points.map((p) => p.x) ?? [])], [series]);
  const shownX = hoverX ?? markerX ?? null;
  const nearest = (x: number) => xValues.reduce((b, v) => (Math.abs(v - x) < Math.abs(b - x) ? v : b), xValues[0]!);

  return (
    <figure className="space-y-2" aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="text-sm font-medium text-zinc-900">
        {title}
      </figcaption>
      {series.length > 1 ? (
        <div className="flex flex-wrap gap-4 text-xs text-zinc-600" aria-hidden>
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <svg width="20" height="6">
                <line x1="0" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
              </svg>
              {s.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full text-zinc-900"
          role="img"
          aria-label={`${title}. ${xLabel} from ${formatX(x0)} to ${formatX(x1)}.`}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * width;
            const x = x0 + ((px - pad.left) / (width - pad.left - pad.right)) * (x1 - x0);
            setHoverX(nearest(Math.min(x1, Math.max(x0, x))));
          }}
          onPointerLeave={() => setHoverX(null)}
        >
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={pad.left}
              x2={width - pad.right}
              y1={sy(y0 + t * (y1 - y0))}
              y2={sy(y0 + t * (y1 - y0))}
              stroke="currentColor"
              strokeOpacity="0.08"
            />
          ))}
          <line x1={pad.left} x2={width - pad.right} y1={sy(y0)} y2={sy(y0)} stroke="currentColor" strokeOpacity="0.3" />
          <text x={pad.left} y={height - 8} fontSize="10" fill="currentColor" fillOpacity="0.6">
            {formatX(x0)}
          </text>
          <text x={width - pad.right} y={height - 8} fontSize="10" textAnchor="end" fill="currentColor" fillOpacity="0.6">
            {formatX(x1)}
          </text>
          <text x={width / 2} y={height - 8} fontSize="10" textAnchor="middle" fill="currentColor" fillOpacity="0.6">
            {xLabel}
          </text>
          {series.map((s) => (
            <polyline
              key={s.name}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? "5 4" : undefined}
              points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")}
            />
          ))}
          {shownX != null ? (
            <>
              <line x1={sx(shownX)} x2={sx(shownX)} y1={pad.top} y2={sy(y0)} stroke="currentColor" strokeOpacity="0.25" />
              {series.map((s) => {
                const p = s.points.find((q) => q.x === shownX) ?? s.points.reduce((b, q) => (Math.abs(q.x - shownX) < Math.abs(b.x - shownX) ? q : b));
                return <circle key={s.name} cx={sx(p.x)} cy={sy(p.y)} r="4.5" fill="currentColor" stroke="white" strokeWidth="2" />;
              })}
            </>
          ) : null}
        </svg>
        {shownX != null ? (
          <div className="pointer-events-none mt-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700" data-testid="chart-readout">
            {formatX(shownX)}:{" "}
            {series
              .map((s) => {
                const p = s.points.reduce((b, q) => (Math.abs(q.x - shownX) < Math.abs(b.x - shownX) ? q : b));
                return `${series.length > 1 ? `${s.name} ` : ""}${formatY(p.y)}`;
              })
              .join(" · ")}
          </div>
        ) : null}
      </div>
      <details className="text-xs text-zinc-600">
        <summary className="cursor-pointer">Show the numbers</summary>
        <table className="mt-1 w-full text-left tabular-nums">
          <thead>
            <tr>
              <th className="font-medium">{xLabel}</th>
              {series.map((s) => (
                <th key={s.name} className="font-medium">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {xValues.map((x) => (
              <tr key={x}>
                <td>{formatX(x)}</td>
                {series.map((s) => (
                  <td key={s.name}>{formatY(s.points.find((p) => p.x === x)?.y ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
