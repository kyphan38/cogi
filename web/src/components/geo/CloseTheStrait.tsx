"use client";

import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { CountryKey, GeoMap, LineKey, type CountryState, type MapMarker } from "@/components/geo/GeoMap";
import { cn } from "@/lib/utils";
import {
  ALT_ROUTES,
  CHOKEPOINTS,
  chokepointById,
  nauticalMilesToKm,
  type Chokepoint,
  type ChokepointId,
  type RouteId,
} from "@/lib/geo/chokepoints";
import { countryName } from "@/lib/geo/countries";
import { REGIONS } from "@/lib/geo/regions";
import { scoreStrait, straitChoices, type StraitResult } from "@/lib/geo/strait";
import type { GeoSource } from "@/lib/geo/types";
import type { GeoStraitExplanation } from "@/lib/types/exercise";

type Step = "pick" | "countries" | "route" | "reveal";

const PLAYABLE = CHOKEPOINTS.filter((c) => c.game);
const WORLD = REGIONS.world.bbox;

const names = (ids: string[]) => ids.map((id) => countryName(id) ?? id).join(", ");

function range([a, b]: [number, number], fmt: (n: number) => string): string {
  return a === b ? fmt(a) : `${fmt(a)}-${fmt(b)}`;
}

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

function SourceLinks({ sources }: { sources: GeoSource[] }) {
  const unique = sources.filter((s, i) => sources.findIndex((x) => x.url === s.url) === i);
  return (
    <span className="text-muted-foreground text-xs">
      Source:{" "}
      {unique.map((s, i) => (
        <span key={s.url}>
          {i > 0 ? "; " : null}
          <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {s.label}
          </a>
        </span>
      ))}
    </span>
  );
}

/** A big number with a small label (no tabular figures at this size). */
function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 px-3 py-2">
      <p className="text-lg font-semibold text-zinc-900">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

/** Choice chips for countries, the accessible twin of tapping the map. */
function CountryChips({ ids, picked, onToggle }: { ids: string[]; picked: Set<string>; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Countries">
      {ids.map((id) => {
        const on = picked.has(id);
        return (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={on ? "default" : "outline"}
            aria-pressed={on}
            onClick={() => onToggle(id)}
            data-testid={`country-chip-${id}`}
          >
            {countryName(id)}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * "Close the strait" (PLAN-geopolitics.md G2): pick a chokepoint, imagine it closed,
 * guess who is hit hardest and the way around, then see the sourced answer on the
 * map. Scored in code; the AI only adds a short note from the same fixed facts.
 */
export function CloseTheStrait({
  onFinish,
  requestExplanation,
}: {
  /** Called once when the answer is shown; returns nothing the component waits on. */
  onFinish: (input: { chokepointId: ChokepointId; picked: string[]; route: RouteId | null; result: StraitResult }) => void;
  /** Fetches the AI note; the caller also saves it. */
  requestExplanation: (input: { chokepointId: ChokepointId; picked: string[]; route: RouteId | null }) => Promise<GeoStraitExplanation>;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [cpId, setCpId] = useState<ChokepointId | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [route, setRoute] = useState<RouteId | null>(null);
  const [note, setNote] = useState<{ state: "idle" | "loading" | "done" | "error"; data?: GeoStraitExplanation; error?: string }>({ state: "idle" });
  const finished = useRef(false);

  const cp: Chokepoint | undefined = cpId ? chokepointById(cpId) : undefined;
  const game = cp?.game;
  const result = cp && step === "reveal" ? scoreStrait(cp, [...picked], route) : null;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const loadNote = async (input: { chokepointId: ChokepointId; picked: string[]; route: RouteId | null }) => {
    setNote({ state: "loading" });
    try {
      setNote({ state: "done", data: await requestExplanation(input) });
    } catch (e) {
      setNote({ state: "error", error: e instanceof Error ? e.message : "Could not load the note." });
    }
  };

  /** Show the answer: score, save once, and ask for the AI note. */
  const reveal = () => {
    if (!cp) return;
    setStep("reveal");
    if (finished.current) return;
    finished.current = true;
    const input = { chokepointId: cp.id, picked: [...picked], route };
    onFinish({ ...input, result: scoreStrait(cp, input.picked, route) });
    void loadNote(input);
  };

  const restart = () => {
    finished.current = false;
    setStep("pick");
    setCpId(null);
    setPicked(new Set());
    setRoute(null);
    setNote({ state: "idle" });
  };

  const countryStates: Record<string, CountryState> = {};
  if (game && (step === "countries" || step === "route")) {
    for (const id of straitChoices(cp!)) countryStates[id] = picked.has(id) ? "picked" : "candidate";
  }
  if (game && result) {
    for (const id of result.found) countryStates[id] = "found";
    for (const id of result.missed) countryStates[id] = "missed";
    for (const id of result.extra) countryStates[id] = "extra";
  }

  const markers: MapMarker[] =
    step === "pick"
      ? PLAYABLE.map((c) => ({
          id: c.id,
          coords: c.coords,
          label: c.name,
          detail: `Connects ${c.connects}.`,
          shape: "ring" as const,
          selected: c.id === cpId,
          onSelect: () => setCpId(c.id),
        }))
      : cp
        ? [{ id: cp.id, coords: cp.coords, label: `${cp.name} (closed)`, shape: "ring" as const, selected: true, showLabel: true }]
        : [];

  const lines = step === "reveal" && game ? ALT_ROUTES[game.route].paths.map((coords, i) => ({ id: `route-${i}`, coords, dashed: true })) : [];

  return (
    <div className="space-y-4" data-testid="close-the-strait">
      <GeoMap
        title={step === "pick" ? "World map of strategic chokepoints" : `World map: ${cp?.name ?? ""}`}
        bbox={step === "reveal" && game ? game.view : WORLD}
        markers={markers}
        lines={lines}
        countryStates={countryStates}
        onCountryToggle={step === "countries" ? toggle : undefined}
        testId="strait-map"
      >
        {step === "reveal" ? (
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <CountryKey state="found" label="On the list, you picked it" />
            <CountryKey state="missed" label="On the list, you missed it" />
            <CountryKey state="extra" label="You picked it, not on the list" />
            <LineKey dashed label="The way around (rough sketch)" />
            <span>The map zooms to the answer; every country is also listed under &quot;Show the data&quot;.</span>
          </span>
        ) : step === "pick" ? (
          "Each ring is a chokepoint. Tap one, or pick from the list below."
        ) : step === "countries" ? (
          "Outlined countries are the choices. Tap them on the map or below."
        ) : null}
      </GeoMap>

      {step === "pick" ? (
        <div className="space-y-3">
          <p className="text-sm">
            A <span className="font-medium">chokepoint</span> is a narrow sea passage that many ships must use. Pick one and
            imagine it is closed for a month.
          </p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Chokepoints">
            {PLAYABLE.map((c) => (
              <Button
                key={c.id}
                type="button"
                size="sm"
                role="radio"
                aria-checked={c.id === cpId}
                variant={c.id === cpId ? "default" : "outline"}
                onClick={() => setCpId(c.id)}
                data-testid={`strait-option-${c.id}`}
              >
                {c.name}
              </Button>
            ))}
          </div>
          {cp ? (
            <div className="space-y-2 rounded-xl border border-zinc-200 p-3 text-sm" data-testid="strait-intro">
              <p className="font-medium text-zinc-900">{cp.name}</p>
              <p>Connects {cp.connects}.</p>
              <p>{cp.why}</p>
              <SourceLinks sources={[cp.facts[0]!.source]} />
              <div>
                <Button type="button" onClick={() => setStep("countries")} data-testid="strait-close">
                  Close it
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === "countries" && cp && game ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-900">
            Guess first: the {cp.name} is closed. Which countries would be hit hardest? Pick every country you think depends
            most on it.
          </p>
          <CountryChips ids={straitChoices(cp)} picked={picked} onToggle={toggle} />
          <Button type="button" disabled={picked.size === 0} onClick={() => setStep("route")} data-testid="strait-next">
            Next
          </Button>
        </div>
      ) : null}

      {step === "route" && cp && game ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-900">How would ships or oil get around it?</p>
          <div className="grid gap-2" role="radiogroup" aria-label="The way around">
            {game.routeOptions.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={route === r}
                onClick={() => setRoute(r)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  route === r ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50",
                )}
                data-testid={`route-option-${r}`}
              >
                {ALT_ROUTES[r].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("countries")}>
              Back
            </Button>
            <Button type="button" disabled={!route} onClick={reveal} data-testid="strait-reveal">
              Show the answer
            </Button>
          </div>
        </div>
      ) : null}

      {step === "reveal" && cp && game && result ? (
        <div className="space-y-4" data-testid="strait-answer">
          <div className="space-y-1 text-sm">
            <p className="text-base font-medium text-zinc-900" data-testid="strait-score">
              You found {result.found.length} of {game.dependents.length}.
              {result.extra.length > 0 ? ` ${result.extra.length} of your picks ${result.extra.length === 1 ? "was" : "were"} not on the list.` : ""}
            </p>
            <p className="flex items-start gap-1.5">
              {result.routeCorrect ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : <X className="mt-0.5 size-4 shrink-0" aria-hidden />}
              <span>
                The way around: {ALT_ROUTES[game.route].label}.{result.routeCorrect ? " You got it." : ""}
              </span>
            </p>
          </div>

          <div className="space-y-1 text-sm">
            <p className="font-medium text-zinc-900">Who depends on it most: {names(game.dependents)}</p>
            <p>{game.dependentsWhy}</p>
            <SourceLinks sources={game.dependentsSources} />
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium text-zinc-900">The way around</p>
            {game.detour.nauticalMiles || game.detour.days ? (
              <div className="grid grid-cols-2 gap-2">
                {game.detour.nauticalMiles ? (
                  <StatTile
                    value={`+${range(game.detour.nauticalMiles, fmtInt)} nm`}
                    label={`nautical miles (about ${range(game.detour.nauticalMiles.map(nauticalMilesToKm) as [number, number], (n) => fmtInt(Math.round(n / 10) * 10))} km)`}
                  />
                ) : null}
                {game.detour.days ? <StatTile value={`+${range(game.detour.days, fmtInt)} days`} label="extra time at sea" /> : null}
              </div>
            ) : null}
            <p>{game.detour.text}</p>
            <SourceLinks sources={[game.detour.source]} />
          </div>

          <div className="space-y-2 rounded-xl border border-zinc-200 p-3 text-sm" data-testid="strait-note">
            <p className="font-medium text-zinc-900">Coach&apos;s note</p>
            {note.state === "loading" ? (
              <p className="text-muted-foreground inline-flex items-center gap-2">
                <InlineSpinner /> Writing a short note...
              </p>
            ) : note.state === "error" ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">{note.error}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void loadNote({ chokepointId: cp.id, picked: [...picked], route })}
                >
                  Try again
                </Button>
              </div>
            ) : note.data ? (
              <>
                <p>{note.data.summary}</p>
                <ul className="list-disc space-y-1 pl-5">
                  {note.data.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">Written by AI from the checked facts above.</p>
              </>
            ) : null}
          </div>

          <details className="text-xs text-zinc-600" data-testid="strait-data">
            <summary className="cursor-pointer">Show the data</summary>
            <table className="mt-2 w-full text-left">
              <tbody>
                {cp.facts.map((f) => (
                  <tr key={f.label} className="border-t border-zinc-100 align-top">
                    <td className="py-1 pr-2 font-medium">{f.label}</td>
                    <td className="py-1 pr-2">{f.value}</td>
                    <td className="py-1">
                      <a href={f.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                        Source
                      </a>
                    </td>
                  </tr>
                ))}
                {straitChoices(cp).map((id) => (
                  <tr key={id} className="border-t border-zinc-100">
                    <td className="py-1 pr-2 font-medium">{countryName(id)}</td>
                    <td className="py-1 pr-2">
                      {(game.dependents as string[]).includes(id) ? "Depends most" : "Not a top user"}
                      {picked.has(id) ? " · you picked it" : ""}
                    </td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </details>

          <Button type="button" onClick={restart} data-testid="strait-again">
            Try another strait
          </Button>
        </div>
      ) : null}
    </div>
  );
}
