import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import countries110m from "world-atlas/countries-110m.json";
import type { LonLat } from "@/lib/geo/types";

/**
 * Country shapes from Natural Earth 1:110m (public domain) via `world-atlas`. Shapes
 * carry only an id; the app never shows the dataset's own names (see countries.ts).
 * Antarctica is left out: no question needs it and it takes a lot of space.
 */
export type CountryFeature = Feature<Geometry, { name?: string }> & { id?: string };

let cache: CountryFeature[] | null = null;

export function countryFeatures(): CountryFeature[] {
  if (cache) return cache;
  const topo = countries110m as unknown as Topology<{ countries: GeometryCollection<{ name?: string }> }>;
  const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name?: string }>;
  cache = (fc.features as CountryFeature[]).filter((f) => f.id !== "010");
  return cache;
}

/** True when the point falls inside any country shape (so not at sea). */
export function isOnLand(p: LonLat): boolean {
  return countryFeatures().some((f) => geoContains(f, p));
}
