"use client";

import { useState } from "react";
import type { TimelineEvent } from "@/lib/geo/timelines";

const W = 600;
const H = 64;
const PAD = 24;

/**
 * A horizontal time axis (PLAN-geopolitics.md G4): one ink dot per event seen so far,
 * placed by date, with the date and text in a tooltip on hover and focus. Dots not yet
 * reached are not drawn, so the axis never gives away what comes next. Hidden on
 * phones, where the event list below is the timeline; that list is also the table view.
 */
export function TimelineAxis({ events, shown, currentId }: { events: TimelineEvent[]; shown: number; currentId?: string }) {
  const [tip, setTip] = useState<TimelineEvent | null>(null);
  const t = (e: TimelineEvent) => Date.parse(e.date);
  const t0 = t(events[0]!);
  const t1 = t(events[events.length - 1]!);
  const x = (e: TimelineEvent) => PAD + ((t(e) - t0) / (t1 - t0 || 1)) * (W - PAD * 2);
  const year = (e: TimelineEvent) => e.date.slice(0, 4);

  return (
    <figure className="relative hidden sm:block" aria-label="Timeline of the events so far" data-testid="timeline-axis">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-zinc-900" role="group">
        <line x1={PAD} x2={W - PAD} y1={28} y2={28} stroke="currentColor" strokeOpacity="0.2" strokeWidth={2} strokeLinecap="round" />
        <text x={PAD} y={56} fontSize="11" fill="currentColor" fillOpacity="0.6">
          {events[0]!.dateLabel.replace(/^\d+ /, "")}
        </text>
        <text x={W - PAD} y={56} fontSize="11" textAnchor="end" fill="currentColor" fillOpacity="0.6">
          {year(events[events.length - 1]!)}
        </text>
        {events.slice(0, shown).map((e) => {
          const cx = x(e);
          const current = e.id === currentId;
          return (
            <g
              key={e.id}
              tabIndex={0}
              role="img"
              aria-label={`${e.dateLabel}: ${e.text}`}
              className="cursor-default outline-none [&:focus-visible>circle:last-child]:stroke-zinc-400"
              onPointerEnter={() => setTip(e)}
              onPointerLeave={() => setTip(null)}
              onFocus={() => setTip(e)}
              onBlur={() => setTip(null)}
              data-axis-event={e.id}
            >
              <circle cx={cx} cy={28} r={12} fill="transparent" />
              <circle cx={cx} cy={28} r={current ? 7 : 5} fill="currentColor" stroke="#ffffff" strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      {tip ? (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 max-w-[16rem] -translate-x-1/2 -translate-y-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs shadow-sm"
          style={{ left: `${(x(tip) / W) * 100}%` }}
          data-testid="timeline-tooltip"
        >
          <p className="font-medium text-zinc-900">{tip.dateLabel}</p>
          <p className="text-zinc-600">{tip.text}</p>
        </div>
      ) : null}
    </figure>
  );
}
