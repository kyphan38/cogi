"use client";

import { ActorCards } from "@/components/geo/ActorCards";
import { GEO_GAME_LABELS, type GeoGameCase } from "@/lib/geo/game-cases";
import type { GeoSource } from "@/lib/geo/types";

function Sources({ sources }: { sources: GeoSource[] }) {
  return (
    <p className="text-muted-foreground text-xs">
      Sources:{" "}
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 ? "; " : null}
          <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {s.label}
          </a>
        </span>
      ))}
    </p>
  );
}

/**
 * The real case behind a geopolitical game (PLAN-geopolitics.md G3), shown after the
 * user's answers. All of it comes from the fixed, sourced data set, not from the AI.
 */
export function GeoCasePanel({ gameCase }: { gameCase: GeoGameCase }) {
  const { A, B } = gameCase.players;
  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 text-sm" data-testid="geo-case-panel">
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs uppercase">What really happened</p>
        <h3 className="text-base font-medium text-zinc-900">
          {gameCase.title} <span className="text-muted-foreground font-normal">({gameCase.when})</span>
        </h3>
      </div>
      <p className="leading-relaxed">{gameCase.summary}</p>
      <table className="w-full text-left text-sm">
        <caption className="text-muted-foreground mb-1 text-left text-xs">The real sides and their choices</caption>
        <tbody>
          {[A, B].map((p) => (
            <tr key={p.name} className="border-t border-zinc-100 align-top">
              <th scope="row" className="py-1.5 pr-3 font-medium">
                {p.name}
              </th>
              <td className="py-1.5">{p.choices.join(" or ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-1" data-testid="geo-case-outcome">
        <p className="font-medium text-zinc-900">The outcome</p>
        <p className="leading-relaxed">{gameCase.whatHappened}</p>
      </div>
      <div className="space-y-1">
        <p className="font-medium text-zinc-900">The game: {GEO_GAME_LABELS[gameCase.gameType]}</p>
        <p className="leading-relaxed">{gameCase.lesson}</p>
        {gameCase.modelNote ? (
          <p className="text-muted-foreground leading-relaxed">
            {gameCase.modelNote.text}{" "}
            <a href={gameCase.modelNote.source.url} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">
              Source
            </a>
          </p>
        ) : null}
      </div>
      <Sources sources={gameCase.sources} />
      {gameCase.actorIds.length ? (
        <details className="space-y-2" data-testid="geo-case-cards">
          <summary className="cursor-pointer font-medium text-zinc-900">Use the cards: the players today</summary>
          <p className="text-muted-foreground mt-2 text-xs">
            Each side in its own words, plus neutral facts.
          </p>
          <div className="mt-2">
            <ActorCards ids={gameCase.actorIds} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
