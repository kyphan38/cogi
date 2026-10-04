import { analyzeGame, type GameCell } from "@/lib/exercise/game";
import type { GeoGameType } from "@/lib/geo/game-cases";

function cellOf(cells: GameCell[], key: string): GameCell {
  const [a, b] = key.split("|");
  return cells.find((c) => c.a === a && c.b === b)!;
}

/**
 * Check in code that a generated 2x2 game has the shape of its real case
 * (PLAN-geopolitics.md G3), so the lesson at the end fits the game the user played.
 * Returns errors written for the retry prompt; empty when the shape is right.
 */
export function geoGameShapeErrors(type: GeoGameType, aIds: string[], bIds: string[], cells: GameCell[]): string[] {
  const f = analyzeGame(aIds, bIds, cells);
  const twoApart = () => {
    if (f.nash.length !== 2) return false;
    const [x, y] = f.nash.map((k) => k.split("|"));
    return x![0] !== y![0] && x![1] !== y![1];
  };
  /** >0 when both players prefer the same equilibrium, <0 when they disagree. */
  const agreement = () => {
    const [x, y] = f.nash.map((k) => cellOf(cells, k));
    return (x!.payoffA - y!.payoffA) * (x!.payoffB - y!.payoffB);
  };
  const noDominant = f.dominantA == null && f.dominantB == null;

  switch (type) {
    case "chicken":
      return twoApart() && agreement() < 0 && noDominant
        ? []
        : [
            "Make it a game of chicken: two equilibria where one side stands firm and the other backs down, each side prefers the one where it stands firm, both standing firm is the worst outcome for both, and no side has a dominant choice.",
          ];
    case "stag_hunt":
      return twoApart() && agreement() > 0 && noDominant
        ? []
        : [
            "Make it a stag hunt: two equilibria (both cooperate, or both play safe), both sides prefer 'both cooperate', cooperating alone is the worst outcome for the one who does it, and no side has a dominant choice.",
          ];
    case "prisoners_dilemma":
      return f.dominantA && f.dominantB && f.nash.length === 1 && f.betterForBoth.length > 0
        ? []
        : [
            "Make it a prisoner's dilemma: each side has a dominant choice (the selfish one), they end up in one equilibrium, and another outcome (both hold back) is better for BOTH.",
          ];
    case "free_rider":
      return f.nash.length === 1 && f.dominantB != null
        ? []
        : [
            "Make it a free-rider game: player B (the outsider) has a dominant choice (to free ride, e.g. keep buying), and there is exactly one equilibrium.",
          ];
    case "alliance":
      return f.nash.length >= 1 ? [] : ["The game needs at least one equilibrium."];
  }
}

/** Real names that appear in any of the texts (whole words, any case). */
export function realNamesUsed(texts: string[], names: string[]): string[] {
  const all = texts.join("\n");
  return names.filter((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(all));
}
