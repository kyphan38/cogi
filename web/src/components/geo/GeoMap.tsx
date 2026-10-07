"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { geoPath } from "d3-geo";
import { Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { countryName } from "@/lib/geo/countries";
import { fitProjection, MAP_WIDTH } from "@/lib/geo/geometry";
import type { Bbox } from "@/lib/geo/regions";
import type { LonLat } from "@/lib/geo/types";
import { countryFeatures } from "@/lib/geo/world";
import { clampView, IDENTITY_VIEW, MAX_ZOOM, toMap, toView, ZOOM_STEP, zoomAt, type MapView } from "@/lib/geo/zoom";

/**
 * How a country is drawn. Monochrome: states differ by lightness and outline, and
 * every map that uses them also has a legend and a table (dataviz skill).
 */
export type CountryState = "candidate" | "picked" | "found" | "missed" | "extra";

const COUNTRY_STYLE: Record<CountryState | "base", { fill: string; stroke: string; strokeWidth: number }> = {
  base: { fill: "var(--map-land)", stroke: "var(--map-sea)", strokeWidth: 0.6 },
  candidate: { fill: "var(--z-300)", stroke: "var(--z-600)", strokeWidth: 0.9 },
  picked: { fill: "var(--z-700)", stroke: "var(--z-900)", strokeWidth: 1 },
  found: { fill: "var(--z-900)", stroke: "var(--z-900)", strokeWidth: 1 },
  missed: { fill: "var(--z-500)", stroke: "var(--z-700)", strokeWidth: 1 },
  extra: { fill: "var(--map-land)", stroke: "var(--z-900)", strokeWidth: 2 },
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
/** A press that moves more than this many CSS pixels is a drag, not a tap. */
const DRAG_PX = 6;

/**
 * World map in SVG: Natural Earth 1:110m countries on an Equal Earth projection,
 * zoomed to `bbox`. Countries are light grey with thin white borders; marks and
 * routes are drawn in ink. Supports a free tap (map quiz, with a keyboard crosshair
 * as the alternative), country picks, and markers with tooltips on hover, tap and
 * focus. Only the countries the app names get a tooltip; other shapes stay unnamed.
 * Zoom with a pinch, the +/- buttons, ctrl + wheel or the +/- keys; drag to pan.
 * Marks keep their screen size, so taps stay easy when zoomed in.
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
  // Kept with the bbox it belongs to, so a new view starts zoomed out.
  const [viewState, setViewState] = useState<MapView & { key: string }>({ ...IDENTITY_VIEW, key: "" });
  /** Active pointers in client pixels, for pan and pinch. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startX: 0, startY: 0, moved: false });
  const suppressClick = useRef(false);

  const bboxKey = bbox.join(",");
  const { projection, height, countryPaths, spherePath } = useMemo(() => {
    const fit = fitProjection(bbox, MAP_WIDTH);
    const path = geoPath(fit.projection);
    const countryPaths = countryFeatures()
      .map((f) => ({ id: String(f.id ?? ""), d: path(f) ?? "" }))
      .filter((c) => c.d);
    return { ...fit, countryPaths, spherePath: path({ type: "Sphere" }) ?? "" };
    // bbox is compared by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bboxKey]);
  const path = useMemo(() => geoPath(projection), [projection]);

  const view: MapView = viewState.key === bboxKey ? viewState : IDENTITY_VIEW;
  const zoomed = view.k > 1;
  const setView = (next: (v: MapView) => MapView) =>
    setViewState((prev) => ({ ...clampView(next(prev.key === bboxKey ? prev : IDENTITY_VIEW), MAP_WIDTH, height), key: bboxKey }));
  const zoomBy = (factor: number, at: [number, number] = [MAP_WIDTH / 2, height / 2]) =>
    setView((v) => zoomAt(v, factor, at, MAP_WIDTH, height));

  /** Where a map point is drawn in the current view. */
  const project = (p: LonLat) => {
    const xy = projection(p);
    return xy ? toView(view, [xy[0], xy[1]]) : null;
  };

  /** Client pixels to view units (the SVG viewBox). */
  const svgPoint = (clientX: number, clientY: number): [number, number] | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return [((clientX - rect.left) / rect.width) * MAP_WIDTH, ((clientY - rect.top) / rect.height) * height];
  };

  const submitAt = (xy: [number, number]) => {
    const p = projection.invert?.(toMap(view, xy));
    if (p && onTap) onTap([p[0], p[1]]);
  };

  // Ctrl + wheel (also a trackpad pinch) zooms; a plain wheel still scrolls the page.
  // React wheel handlers are passive, so preventDefault needs a native listener.
  const wheelZoom = useRef<(e: WheelEvent) => void>(() => {});
  useEffect(() => {
    wheelZoom.current = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const at = svgPoint(e.clientX, e.clientY);
      if (at) zoomBy(Math.exp(-e.deltaY / 100), at);
    };
  });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => wheelZoom.current(e);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current = { startX: e.clientX, startY: e.clientY, moved: false };
      suppressClick.current = false;
    } else {
      // A second finger: this is a pinch, never a tap.
      gesture.current.moved = true;
    }
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const g = gesture.current;
    // Any drag cancels the tap. Zoomed out, the pan is clamped to no movement.
    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > DRAG_PX) g.moved = true;
    if (!g.moved) return;
    suppressClick.current = true;
    setTip(null);
    // Capture only once a drag starts, so a plain tap still reaches the country or mark under it.
    const svg = svgRef.current;
    if (svg && !svg.hasPointerCapture(e.pointerId)) svg.setPointerCapture(e.pointerId);

    const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)?.[1];
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const a = svgPoint(prev.x, prev.y);
    const b = svgPoint(e.clientX, e.clientY);
    if (!a || !b) return;
    if (!other) {
      setView((v) => ({ ...v, x: v.x + b[0] - a[0], y: v.y + b[1] - a[1] }));
      return;
    }
    // Pinch: scale by the change in finger distance, and pan with the midpoint.
    const o = svgPoint(other.x, other.y);
    if (!o) return;
    const d0 = Math.hypot(a[0] - o[0], a[1] - o[1]);
    const d1 = Math.hypot(b[0] - o[0], b[1] - o[1]);
    if (d0 < 1) return;
    const mid0: [number, number] = [(a[0] + o[0]) / 2, (a[1] + o[1]) / 2];
    const mid1: [number, number] = [(b[0] + o[0]) / 2, (b[1] + o[1]) / 2];
    setView((v) => {
      const z = zoomAt(v, d1 / d0, mid0, MAP_WIDTH, height);
      return { ...z, x: z.x + mid1[0] - mid0[0], y: z.y + mid1[1] - mid0[1] };
    });
  };

  const onPointerEnd = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
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
    if (e.key === "+" || e.key === "=" || e.key === "-") {
      e.preventDefault();
      zoomBy(e.key === "-" ? 1 / ZOOM_STEP : ZOOM_STEP, cur);
    } else if (d) {
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
          className={cn(
            "block w-full select-none outline-none",
            // Zoomed in, every touch moves the map. Zoomed out, one finger still scrolls the page.
            zoomed ? "touch-none" : "touch-pan-y",
            onTap && "cursor-crosshair focus-visible:ring-2 focus-visible:ring-zinc-400",
          )}
          role={onTap ? "application" : "img"}
          aria-label={
            onTap ? `${title}. Tap the map to answer. With a keyboard, move with the arrow keys, zoom with + and -, and press Enter.` : title
          }
          aria-describedby={`${id}-desc`}
          tabIndex={onTap ? 0 : undefined}
          onKeyDown={onKeyDown}
          onBlur={() => setCross(null)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClickCapture={(e) => {
            // The click after a drag or pinch is not a tap.
            if (!suppressClick.current) return;
            suppressClick.current = false;
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            setTip(null);
            if (!onTap) return;
            const xy = svgPoint(e.clientX, e.clientY);
            if (xy) submitAt(xy);
          }}
          onPointerLeave={(e) => {
            setTip(null);
            if (!svgRef.current?.hasPointerCapture(e.pointerId)) pointers.current.delete(e.pointerId);
          }}
          data-height={height}
          data-zoom={view.k}
        >
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`} data-map-view>
            <path d={spherePath} fill="var(--map-sea)" aria-hidden />
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
                    strokeWidth={style.strokeWidth / view.k}
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
            <g fill="none" stroke="var(--z-900)" strokeLinecap="round" strokeLinejoin="round">
              {lines.map((l) => (
                <path
                  key={l.id}
                  d={path({ type: "LineString", coordinates: l.coords }) ?? ""}
                  strokeWidth={(l.faint ? 1.25 : 2) / view.k}
                  strokeOpacity={l.faint ? 0.55 : 1}
                  strokeDasharray={l.dashed ? `${6 / view.k} ${4 / view.k}` : undefined}
                  data-line={l.id}
                />
              ))}
            </g>
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
                    <path d="M-5,-5L5,5M5,-5L-5,5" stroke="var(--z-white)" strokeWidth={5} strokeLinecap="round" />
                  ) : null}
                  {shape === "tap" ? (
                    <path d="M-5,-5L5,5M5,-5L-5,5" stroke="var(--z-900)" strokeWidth={2} strokeLinecap="round" />
                  ) : shape === "ring" ? (
                    <circle
                      r={m.selected ? 8 : 6}
                      fill={m.selected ? "var(--z-900)" : "var(--z-white)"}
                      stroke="var(--z-900)"
                      strokeWidth={2}
                    />
                  ) : (
                    <circle r={5} fill="var(--z-900)" stroke="var(--z-white)" strokeWidth={2} />
                  )}
                  {m.showLabel ? (
                    <text
                      x={x > MAP_WIDTH - 140 ? -10 : 10}
                      y={-9}
                      textAnchor={x > MAP_WIDTH - 140 ? "end" : "start"}
                      fontSize={15}
                      fontWeight={600}
                      fill="var(--z-900)"
                      stroke="var(--z-white)"
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
            <g transform={`translate(${cross[0]},${cross[1]})`} stroke="var(--z-900)" strokeWidth={1.5} aria-hidden>
              <line x1={-10} x2={10} y1={0} y2={0} />
              <line x1={0} x2={0} y1={-10} y2={10} />
            </g>
          ) : null}
        </svg>
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <ZoomButton label="Zoom in" onClick={() => zoomBy(ZOOM_STEP)} disabled={view.k >= MAX_ZOOM} testId="map-zoom-in">
            <Plus className="size-4" aria-hidden />
          </ZoomButton>
          <ZoomButton label="Zoom out" onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={!zoomed} testId="map-zoom-out">
            <Minus className="size-4" aria-hidden />
          </ZoomButton>
          {zoomed ? (
            <ZoomButton label="Show the whole map" onClick={() => setView(() => IDENTITY_VIEW)} testId="map-zoom-reset">
              <Maximize2 className="size-4" aria-hidden />
            </ZoomButton>
          ) : null}
        </div>
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

function ZoomButton({
  label,
  onClick,
  disabled,
  testId,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="flex size-9 items-center justify-center rounded-md border border-zinc-200 bg-white/90 text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-40"
    >
      {children}
    </button>
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
        <line x1="1" y1="3" x2="21" y2="3" stroke="var(--z-900)" strokeWidth="2" strokeDasharray={dashed ? "5 3" : undefined} />
      </svg>
      {label}
    </span>
  );
}
