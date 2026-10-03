"use client";

import { cn } from "@/lib/utils";
import { cellKey, type GameFacts } from "@/lib/exercise/game";
import type { StrategyExerciseRow } from "@/lib/types/exercise";

type Game = Pick<StrategyExerciseRow, "players" | "optionsA" | "optionsB" | "cells">;

/** Outcome numbers in reading order (row by row), shared by the matrix and story lists. */
export function outcomeNumbers(game: Game): Map<string, number> {
  const keys = game.optionsA.flatMap((a) => game.optionsB.map((b) => cellKey(a.id, b.id)));
  return new Map(keys.map((k, i) => [k, i + 1]));
}

/**
 * The payoff matrix: A's choices are rows, B's choices are columns. It can show the
 * numbers, let the user pick cells, and (with `facts`) show the textbook underline
 * method: each player's best reply is underlined, and a cell with both underlined is
 * an equilibrium.
 */
export function PayoffMatrix({
  game,
  showPayoffs,
  selected,
  onToggle,
  facts,
  testId = "payoff-matrix",
}: {
  game: Game;
  showPayoffs: boolean;
  selected?: string[];
  onToggle?: (key: string) => void;
  facts?: GameFacts;
  testId?: string;
}) {
  const A = game.players.find((p) => p.id === "A")!;
  const B = game.players.find((p) => p.id === "B")!;
  const numbers = outcomeNumbers(game);
  return (
    <div className="space-y-1" data-testid={testId}>
      <p className="text-muted-foreground text-xs">
        Rows: {A.name}. Columns: {B.name}.{showPayoffs ? ` Numbers: ${A.name}, then ${B.name} (10 = best).` : ""}
      </p>
      <table className="w-full table-fixed border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="w-[28%]" />
            {game.optionsB.map((b) => (
              <th key={b.id} className="break-words px-1 pb-1 text-left text-xs font-medium text-zinc-700">
                {B.name}: {b.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {game.optionsA.map((a) => (
            <tr key={a.id}>
              <th className="break-words pr-1 text-left align-middle text-xs font-medium text-zinc-700">
                {A.name}: {a.label}
              </th>
              {game.optionsB.map((b) => {
                const key = cellKey(a.id, b.id);
                const cell = game.cells.find((c) => c.a === a.id && c.b === b.id)!;
                const isSelected = selected?.includes(key) ?? false;
                const bestForA = facts?.bestA[b.id] === a.id;
                const bestForB = facts?.bestB[a.id] === b.id;
                const isNash = facts?.nash.includes(key) ?? false;
                const content = (
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="text-muted-foreground text-[11px]">Outcome {numbers.get(key)}</span>
                    {showPayoffs ? (
                      <span className="tabular-nums">
                        <span className={cn(bestForA && "font-semibold underline decoration-2 underline-offset-2")}>{cell.payoffA}</span>
                        <span className="text-muted-foreground">, </span>
                        <span className={cn(bestForB && "font-semibold underline decoration-2 underline-offset-2")}>{cell.payoffB}</span>
                      </span>
                    ) : null}
                    {isNash ? <span className="text-[11px] font-medium">Equilibrium</span> : null}
                  </span>
                );
                const cls = cn(
                  "w-full rounded-lg border px-1 py-2 text-center",
                  isNash ? "border-zinc-900 border-2" : isSelected ? "border-zinc-900 bg-zinc-900/10" : "border-zinc-200",
                );
                return (
                  <td key={b.id} className="align-middle">
                    {onToggle ? (
                      <button
                        type="button"
                        className={cn(cls, "hover:bg-zinc-50")}
                        aria-pressed={isSelected}
                        aria-label={`Outcome ${numbers.get(key)}: ${A.name} ${a.label}, ${B.name} ${b.label}`}
                        data-testid="matrix-cell"
                        onClick={() => onToggle(key)}
                      >
                        {content}
                      </button>
                    ) : (
                      <div className={cls} data-testid="matrix-cell">
                        {content}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The one-sentence story of each outcome, numbered like the matrix. */
export function OutcomeStories({ game }: { game: Game }) {
  const numbers = outcomeNumbers(game);
  return (
    <ol className="space-y-1.5 text-sm" data-testid="outcome-stories">
      {game.cells
        .map((c) => ({ c, n: numbers.get(cellKey(c.a, c.b))! }))
        .sort((x, y) => x.n - y.n)
        .map(({ c, n }) => (
          <li key={n}>
            <span className="font-medium">Outcome {n}:</span> {c.story}
          </li>
        ))}
    </ol>
  );
}
