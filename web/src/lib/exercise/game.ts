/**
 * Two-player games in normal form (a payoff matrix), PLAN-learning.md L2. Player A
 * picks a row, player B a column. Pure functions, used both to check what the model
 * generated and to score the user.
 */

export interface GameCell {
  a: string;
  b: string;
  payoffA: number;
  payoffB: number;
}

/** Stable key for a cell: "<a option id>|<b option id>". */
export function cellKey(a: string, b: string): string {
  return `${a}|${b}`;
}

export interface GameFacts {
  /** A's best reply to each B option: b id -> a id. */
  bestA: Record<string, string>;
  /** B's best reply to each A option: a id -> b id. */
  bestB: Record<string, string>;
  /** Cells where both play a best reply (pure Nash equilibria). */
  nash: string[];
  /** A's choice that is best whatever B does, if any. */
  dominantA: string | null;
  dominantB: string | null;
  /** Cells better for BOTH players than every equilibrium (the "trap" in a dilemma). */
  betterForBoth: string[];
}

function payoffOf(cells: GameCell[], a: string, b: string): GameCell {
  const c = cells.find((x) => x.a === a && x.b === b);
  if (!c) throw new Error(`missing cell ${a}|${b}`);
  return c;
}

/** Best replies, equilibria, dominant choices and outcomes better for both. Assumes no ties. */
export function analyzeGame(aOptions: string[], bOptions: string[], cells: GameCell[]): GameFacts {
  const bestA: Record<string, string> = {};
  for (const b of bOptions) {
    bestA[b] = aOptions.reduce((best, a) => (payoffOf(cells, a, b).payoffA > payoffOf(cells, best, b).payoffA ? a : best));
  }
  const bestB: Record<string, string> = {};
  for (const a of aOptions) {
    bestB[a] = bOptions.reduce((best, b) => (payoffOf(cells, a, b).payoffB > payoffOf(cells, a, best).payoffB ? b : best));
  }
  const nash = aOptions.flatMap((a) => bOptions.filter((b) => bestA[b] === a && bestB[a] === b).map((b) => cellKey(a, b)));
  const allSame = (values: string[]) => (values.every((v) => v === values[0]) ? values[0]! : null);
  const eqCells = nash.map((k) => {
    const [a, b] = k.split("|");
    return payoffOf(cells, a!, b!);
  });
  const betterForBoth =
    eqCells.length === 0
      ? []
      : cells
          .filter((c) => eqCells.every((e) => c.payoffA > e.payoffA && c.payoffB > e.payoffB))
          .map((c) => cellKey(c.a, c.b));
  return {
    bestA,
    bestB,
    nash,
    dominantA: allSame(bOptions.map((b) => bestA[b]!)),
    dominantB: allSame(aOptions.map((a) => bestB[a]!)),
    betterForBoth,
  };
}

/**
 * Turn a player's ranking of outcomes (cell keys, best first) into payoffs, so the
 * same analysis can show what the user's own preferences imply.
 */
export function cellsFromRanks(
  aOptions: string[],
  bOptions: string[],
  rankA: string[],
  rankB: string[],
): GameCell[] {
  const n = aOptions.length * bOptions.length;
  const score = (rank: string[], key: string) => {
    const i = rank.indexOf(key);
    return i < 0 ? 0 : n - i;
  };
  return aOptions.flatMap((a) =>
    bOptions.map((b) => ({ a, b, payoffA: score(rankA, cellKey(a, b)), payoffB: score(rankB, cellKey(a, b)) })),
  );
}

/** Cell keys ordered by a player's payoff, best first. */
export function rankCells(cells: GameCell[], player: "A" | "B"): string[] {
  return [...cells]
    .sort((x, y) => (player === "A" ? y.payoffA - x.payoffA : y.payoffB - x.payoffB))
    .map((c) => cellKey(c.a, c.b));
}
