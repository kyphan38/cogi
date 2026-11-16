"use client";

import { GeoMap, type MapMarker } from "@/components/geo/GeoMap";
import { PLACES, placeMidpoint } from "@/lib/geo/places";
import type { PlaceProgress } from "@/lib/geo/quiz";
import { REGIONS } from "@/lib/geo/regions";

const LABELS: Record<PlaceProgress, string> = {
  known: "You know it",
  review: "To review",
  new: "Not asked yet",
};

const SHAPES: Record<PlaceProgress, MapMarker["shape"]> = { known: "point", review: "ring", new: "faint" };

/**
 * Every quiz place on a world map, by how well the user knows it. Monochrome: a filled
 * dot, an open ring and a faint dot, with a legend and a table of the same data.
 */
export function PlaceProgressMap({ progress }: { progress: Map<string, PlaceProgress> }) {
  const status = (id: string): PlaceProgress => progress.get(id) ?? "new";
  const groups = (["known", "review", "new"] as const).map((s) => ({ s, places: PLACES.filter((p) => status(p.id) === s) }));
  const markers: MapMarker[] = PLACES.map((p) => ({
    id: `progress-${p.id}`,
    coords: placeMidpoint(p),
    label: p.name,
    detail: LABELS[status(p.id)],
    shape: SHAPES[status(p.id)],
  }));
  // Unseen first, so the places the user knows are drawn on top.
  markers.sort((a, b) => (a.shape === "faint" ? 0 : 1) - (b.shape === "faint" ? 0 : 1));
  const known = groups[0]!.places.length;

  return (
    <div className="space-y-3" data-testid="geo-progress">
      <p className="text-body" data-testid="geo-progress-count">
        You know {known} of {PLACES.length} places.
      </p>
      <GeoMap title="Map of the places you know" bbox={REGIONS.world.bbox} markers={markers} testId="geo-progress-map">
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" aria-hidden>
              <circle cx="6" cy="6" r="4" fill="var(--z-900)" stroke="var(--z-white)" strokeWidth="1.5" />
            </svg>
            {LABELS.known}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" aria-hidden>
              <circle cx="6" cy="6" r="4" fill="var(--z-white)" stroke="var(--z-900)" strokeWidth="1.5" />
            </svg>
            {LABELS.review}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" aria-hidden>
              <circle cx="6" cy="6" r="3" fill="var(--z-500)" />
            </svg>
            {LABELS.new}
          </span>
        </span>
      </GeoMap>
      <details className="text-body">
        <summary className="cursor-pointer text-muted-foreground">Show the data</summary>
        <table className="mt-2 w-full text-left">
          <tbody>
            {groups.map(({ s, places }) => (
              <tr key={s} className="border-t border-border/60 align-top">
                <th className="py-1.5 pr-3 font-medium whitespace-nowrap">
                  {LABELS[s]} ({places.length})
                </th>
                <td className="py-1.5 text-muted-foreground">{places.map((p) => p.name).join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
