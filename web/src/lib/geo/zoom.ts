/**
 * Zoom and pan for the map, in SVG units. A view point is `map * k + [x, y]`.
 * Pure math, so it can be tested without a browser.
 */
export interface MapView {
  k: number;
  x: number;
  y: number;
}

export const IDENTITY_VIEW: MapView = { k: 1, x: 0, y: 0 };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
/** One button press or key press zooms by this factor. */
export const ZOOM_STEP = 2;

/** Keep the zoom in range and the map covering the whole frame. */
export function clampView(v: MapView, width: number, height: number): MapView {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k));
  return {
    k,
    x: Math.min(0, Math.max(width - width * k, v.x)),
    y: Math.min(0, Math.max(height - height * k, v.y)),
  };
}

/** Zoom by `factor` keeping the view point `at` fixed on screen. */
export function zoomAt(
  v: MapView,
  factor: number,
  at: [number, number],
  width: number,
  height: number,
): MapView {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
  const mx = (at[0] - v.x) / v.k;
  const my = (at[1] - v.y) / v.k;
  return clampView({ k, x: at[0] - mx * k, y: at[1] - my * k }, width, height);
}

/** View point to map point. */
export function toMap(v: MapView, p: [number, number]): [number, number] {
  return [(p[0] - v.x) / v.k, (p[1] - v.y) / v.k];
}

/** Map point to view point. */
export function toView(v: MapView, p: [number, number]): [number, number] {
  return [p[0] * v.k + v.x, p[1] * v.k + v.y];
}
