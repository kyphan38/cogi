import { weakSpotInfo } from "@/lib/exercise/weak-spots";
import type { GenStep } from "@/lib/tracks/adaptive";

/** The small line for a step's kind, e.g. "fix · Missing a connection". */
export function stepKindLine(step: GenStep): string {
  if (step.kind === "fix") return `fix · ${weakSpotInfo(step.focus ?? "")?.label ?? "a weak spot"}`;
  if (step.kind === "redo") return "redo";
  if (step.kind === "own") return "your own";
  return "new";
}

/** A step's main line. */
export function stepTitle(step: GenStep): string {
  if (step.kind === "own") return "A situation from your own life";
  if (step.kind === "redo") return `Again: ${step.domain}`;
  return step.domain || "Pick a topic";
}
