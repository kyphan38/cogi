"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { geoPath } from "d3-geo";
import { cn } from "@/lib/utils";
import { countryName } from "@/lib/geo/countries";
import { fitProjection, MAP_WIDTH } from "@/lib/geo/geometry";
import type { Bbox } from "@/lib/geo/regions";
import type { LonLat } from "@/lib/geo/types";
import { countryFeatures } from "@/lib/geo/world";

/**
 * How a country is drawn. Monochrome: states differ by lightness and outline, and
 * every map that uses them also has a legend and a table (dataviz skill).
 */
export type CountryState = "candidate" | "picked" | "found" | "missed" | "extra";

const COUNTRY_STYLE: Record<CountryState | "base", { fill: string; stroke: string; strokeWidth: number }> = {
  base: { fill: "#e4e4e7", stroke: "#ffffff", strokeWidth: 0.6 },
  candidate: { fill: "#d4d4d8", stroke: "#52525b", strokeWidth: 0.9 },
  picked: { fill: "#3f3f46", stroke: "#18181b", strokeWidth: 1 },
  found: { fill: "#18181b", stroke: "#18181b", strokeWidth: 1 },
  missed: { fill: "#71717a", stroke: "#3f3f46", strokeWidth: 1 },
  extra: { fill: "#e4e4e7", stroke: "#18181b", strokeWidth: 2 },
};

export interface MapMarker {
  id: string;
  coords: LonLat;
  label: string;
  /** Extra line in the tooltip. */
  detail?: string;
  /** "point": a place. "tap": where the user tapped. "ring": a chokepoint to pick. */
  shape?: "point" | "tap" | "ring";
  /** Draw the label on the map (keep this for the one or two marks that matter). */
  showLabel?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export interface MapLine {
  id: string;
  coords: LonLat[];
  dashed?: boolean;
  /** Thin and light, e.g. the gap between a tap and the answer. */
  faint?: boolean;
}

/** Hit area radius in SVG units: about 24px across on a 390px phone. */
const HIT_R = 20;
/** Arrow-key step for the keyboard crosshair, in SVG units. */
const KEY_STEP = 8;

/**
 * World map in SVG: Natural Earth 1:110m countries on an Equal Earth projection,
 * zoomed to `bbox`. Countries are light grey with thin white borders; marks and
 * routes are drawn in ink. Supports a free tap (map quiz, with a keyboard crosshair
 * as the alternative), country picks, and markers with tooltips on hover, tap and
 * focus. Only the countries the app names get a tooltip; other shapes stay unnamed.
 */
export function GeoMap({
  title,
  bbox,
  countryStates,
  onCountryToggle,
  markers = [],
  lines = [],
  onTap,
  children,
  testId = "geo-map",
}: {
  title: string;
  bbox: Bbox;
  countryStates?: Record<string, CountryState>;
  onCountryToggle?: (id: string) => void;
  markers?: MapMarker[];
  lines?: MapLine[];
  onTap?: (p: LonLat) => void;
  children?: ReactNode;
  testId?: string;
}) {
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; title: string; detail?: string } | null>(null);
  const [cross, setCross] = useState<[number, number] | null>(null);

  const bboxKey = bbox.join(",");
  const { projection, height, countryPaths } = useMemo(() => {
    const fit = fitProjection(bbox, MAP_WIDTH);
    const path = geoPath(fit.projection);
    const countryPaths = countryFeatures()
      .map((f) => ({ id: String(f.id ?? ""), d: path(f) ?? "" }))
      .filter((c) => c.d);
    return { ...fit, countryPaths };
    // bbox is compared by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bboxKey]);
  const path = useMemo(() => geoPath(projection), [projection]);

  const project = (p: LonLat) => projection(p) ?? null;

  const svgPoint = (clientX: number, clientY: number): [number, number] | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return [((clientX - rect.left) / rect.width) * MAP_WIDTH, ((clientY - rect.top) / rect.height) * height];
  };

  const submitAt = (xy: [number, number]) => {
    const p = projection.invert?.(xy);
    if (p && onTap) onTap([p[0], p[1]]);
  };

  const showTip = (xy: [number, number] | null, title: string, detail?: string) => {
    if (xy) setTip({ x: xy[0], y: xy[1], title, detail });
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!onTap) return;
    const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const cur = cross ?? [MAP_WIDTH / 2, height / 2];
    const move: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = move[e.key];
    if (d) {
      e.preventDefault();
      setCross([Math.min(MAP_WIDTH, Math.max(0, cur[0] + d[0])), Math.min(height, Math.max(0, cur[1] + d[1]))]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      submitAt(cur);
    }
  };

  const tipLeft = tip ? `${(tip.x / MAP_WIDTH) * 100}%` : undefined;
  const tipTop = tip ? `${(tip.y / height) * 100}%` : undefined;

  return (
    <figure className="space-y-2" data-testid={testId}>
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_WIDTH} ${height}`}
          className={cn("block w-full touch-manipulation select-none outline-none", onTap && "cursor-crosshair focus-visible:ring-2 focus-visible:ring-zinc-400")}
          role={onTap ? "application" : "img"}
          aria-label={onTap ? `${title}. Tap the map to answer. With a keyboard, move with the arrow keys and press Enter.` : title}
          aria-describedby={`${id}-desc`}
          tabIndex={onTap ? 0 : undefined}
          onKeyDown={onKeyDown}
          onBlur={() => setCross(null)}
          onClick={(e) => {
            setTip(null);
            if (!onTap) return;
            const xy = svgPoint(e.clientX, e.clientY);
            if (xy) submitAt(xy);
          }}
          onPointerLeave={() => setTip(null)}
          data-height={height}
        >
          <g>
            {countryPaths.map((c) => {
              const state = countryStates?.[c.id];
              const style = COUNTRY_STYLE[state ?? "base"];
              const name = state ? countryName(c.id) : undefined;
              const toggle = onCountryToggle && state && name ? () => onCountryToggle(c.id) : undefined;
              return (
                <path
                  key={c.id || c.d.slice(0, 24)}
                  d={c.d}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeLinejoin="round"
                  data-country={state ? c.id : undefined}
                  data-state={state}
                  className={cn(toggle && "cursor-pointer hover:opacity-80")}
                  onPointerMove={name ? (e) => showTip(svgPoint(e.clientX, e.clientY), name) : undefined}
                  onClick={
                    toggle
                      ? (e) => {
                          e.stopPropagation();
                          toggle();
                        }
                      : undefined
                  }
                />
              );
            })}
          </g>
          <g fill="none" stroke="#18181b" strokeLinecap="round" strokeLinejoin="round">
            {lines.map((l) => (
              <path
                key={l.id}
                d={path({ type: "LineString", coordinates: l.coords }) ?? ""}
                strokeWidth={l.faint ? 1.25 : 2}
                strokeOpacity={l.faint ? 0.55 : 1}
                strokeDasharray={l.dashed ? "6 4" : undefined}
                data-line={l.id}
              />
            ))}
          </g>
          <g>
            {markers.map((m) => {
              const xy = project(m.coords);
              if (!xy) return null;
              const [x, y] = xy;
              const shape = m.shape ?? "point";
              const tipText = m.detail;
              return (
                <g
                  key={m.id}
                  transform={`translate(${x},${y})`}
                  data-marker={m.id}
                  role={m.onSelect ? "button" : undefined}
                  aria-label={m.onSelect ? `${m.label}${m.selected ? " (selected)" : ""}` : undefined}
                  aria-pressed={m.onSelect ? !!m.selected : undefined}
                  tabIndex={m.onSelect ? 0 : undefined}
                  className={cn(m.onSelect && "cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-zinc-400")}
                  onPointerMove={() => showTip(xy, m.label, tipText)}
                  onFocus={() => showTip(xy, m.label, tipText)}
                  onBlur={() => setTip(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    showTip(xy, m.label, tipText);
                    m.onSelect?.();
                  }}
                  onKeyDown={(e) => {
                    if (m.onSelect && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      m.onSelect();
                    }
                  }}
                >
                  <circle r={HIT_R} fill="transparent" stroke="transparent" strokeWidth={2} />
                  {shape === "tap" ? (
                    <path d="M-5,-5L5,5M5,-5L-5,5" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" />
                  ) : null}
                  {shape === "tap" ? (
                    <path d="M-5,-5L5,5M5,-5L-5,5" stroke="#18181b" strokeWidth={2} strokeLinecap="round" />
                  ) : shape === "ring" ? (
                    <circle
                      r={m.selected ? 8 : 6}
                      fill={m.selected ? "#18181b" : "#ffffff"}
                      stroke="#18181b"
                      strokeWidth={2}
                    />
                  ) : (
                    <circle r={5} fill="#18181b" stroke="#ffffff" strokeWidth={2} />
                  )}
                  {m.showLabel ? (
                    <text
                      x={x > MAP_WIDTH - 140 ? -10 : 10}
                      y={-9}
                      textAnchor={x > MAP_WIDTH - 140 ? "end" : "start"}
                      fontSize={13}
                      fontWeight={600}
                      fill="#18181b"
                      stroke="#ffffff"
                      strokeWidth={3}
                      paintOrder="stroke"
                      style={{ pointerEvents: "none" }}
                    >
                      {m.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
          {cross ? (
            <g transform={`translate(${cross[0]},${cross[1]})`} stroke="#18181b" strokeWidth={1.5} aria-hidden>
              <line x1={-10} x2={10} y1={0} y2={0} />
              <line x1={0} x2={0} y1={-10} y2={10} />
            </g>
          ) : null}
        </svg>
        {tip ? (
          <div
            role="status"
            className="pointer-events-none absolute z-10 max-w-[14rem] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs shadow-sm"
            style={{ left: tipLeft, top: tipTop }}
            data-testid="map-tooltip"
          >
            <p className="font-medium text-zinc-900">{tip.title}</p>
            {tip.detail ? <p className="text-zinc-600">{tip.detail}</p> : null}
          </div>
        ) : null}
      </div>
      <figcaption id={`${id}-desc`} className="text-xs text-zinc-600">
        {children}
      </figcaption>
    </figure>
  );
}

/** A legend key for country states, drawn as a small filled box like the map. */
export function CountryKey({ state, label }: { state: CountryState; label: string }) {
  const s = COUNTRY_STYLE[state];
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="14" height="10" aria-hidden>
        <rect x="1" y="1" width="12" height="8" rx="2" fill={s.fill} stroke={s.stroke} strokeWidth={Math.min(s.strokeWidth, 1.5)} />
      </svg>
      {label}
    </span>
  );
}

/** A legend key for a route line. */
export function LineKey({ dashed, label }: { dashed?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="22" height="6" aria-hidden>
        <line x1="1" y1="3" x2="21" y2="3" stroke="#18181b" strokeWidth="2" strokeDasharray={dashed ? "5 3" : undefined} />
      </svg>
      {label}
    </span>
  );
}
