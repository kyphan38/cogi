import { describe, expect, it } from "vitest";
import {
  clampView,
  IDENTITY_VIEW,
  MAX_ZOOM,
  toMap,
  toView,
  zoomAt,
} from "./zoom";

const W = 600;
const H = 400;

describe("map zoom", () => {
  it("keeps the point under the finger fixed when zooming", () => {
    const at: [number, number] = [150, 100];
    const before = toMap(IDENTITY_VIEW, at);
    const v = zoomAt(IDENTITY_VIEW, 2, at, W, H);
    expect(v.k).toBe(2);
    expect(toView(v, before)).toEqual(at);
  });

  it("round-trips between view and map points", () => {
    const v = { k: 3, x: -200, y: -150 };
    expect(toMap(v, toView(v, [123, 45]))).toEqual([123, 45]);
  });

  it("never zooms out past the whole map or in past the limit", () => {
    expect(zoomAt(IDENTITY_VIEW, 0.5, [300, 200], W, H)).toEqual(IDENTITY_VIEW);
    expect(zoomAt({ k: 6, x: 0, y: 0 }, 4, [0, 0], W, H).k).toBe(MAX_ZOOM);
  });

  it("does not pan the map off the frame", () => {
    expect(clampView({ k: 2, x: 50, y: 50 }, W, H)).toEqual({
      k: 2,
      x: 0,
      y: 0,
    });
    expect(clampView({ k: 2, x: -5000, y: -5000 }, W, H)).toEqual({
      k: 2,
      x: -600,
      y: -400,
    });
  });
});
