"use client";

import { ChevronDown } from "lucide-react";
import { ACTORS, type ActorCard, type ActorId, type CardLine } from "@/lib/geo/actors";

const SECTIONS: { key: keyof Pick<ActorCard, "says" | "redLines" | "strengths" | "weakSpots" | "partners">; title: string; note?: string }[] = [
  { key: "says", title: "Says it wants", note: "In its own words" },
  { key: "redLines", title: "Red lines and commitments", note: "As it states them" },
  { key: "strengths", title: "Strengths" },
  { key: "weakSpots", title: "Weak spots" },
  { key: "partners", title: "Groups and treaties" },
];

function Line({ line }: { line: CardLine }) {
  return (
    <li className="leading-relaxed">
      {line.text}{" "}
      <a
        href={line.source.url}
        target="_blank"
        rel="noreferrer"
        title={line.source.label}
        aria-label={`Source: ${line.source.label}`}
        className="text-muted-foreground text-xs underline underline-offset-2"
      >
        Source
      </a>
    </li>
  );
}

/** One country or group card; sections with no lines are left out. */
export function ActorCardView({ actor }: { actor: ActorCard }) {
  return (
    <div className="space-y-3 text-sm" data-testid={`actor-card-${actor.id}`}>
      {SECTIONS.map(({ key, title, note }) =>
        actor[key].length ? (
          <section key={key} className="space-y-1">
            <h4 className="font-medium text-zinc-900">
              {title}
              {note ? <span className="text-muted-foreground ml-2 text-xs font-normal">{note}</span> : null}
            </h4>
            <ul className="list-disc space-y-1 pl-5">
              {actor[key].map((line) => (
                <Line key={line.text} line={line} />
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}

/**
 * Country cards (PLAN-geopolitics.md G3): one row per actor that opens to its card.
 * Every line links to its source; "Says" and "Red lines" are the actor's own words.
 */
export function ActorCards({ ids, openFirst = false }: { ids?: ActorId[]; openFirst?: boolean }) {
  const actors = ids ? ACTORS.filter((a) => ids.includes(a.id)) : ACTORS;
  return (
    <div className="space-y-2" data-testid="actor-cards">
      {actors.map((a, i) => (
        <details
          key={a.id}
          open={openFirst && i === 0}
          className="group rounded-xl border border-zinc-200 bg-white px-3 py-2"
          data-testid={`actor-${a.id}`}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm font-medium text-zinc-900 [&::-webkit-details-marker]:hidden">
            <span>
              {a.name}
              <span className="text-muted-foreground ml-2 text-xs font-normal">{a.kind === "group" ? "Group" : "Country"}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="pt-2 pb-1">
            <ActorCardView actor={a} />
          </div>
        </details>
      ))}
    </div>
  );
}
