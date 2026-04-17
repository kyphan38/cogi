import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ANALYTICAL_EXERCISE_STEP_LABELS = [
  "Setup",
  "Highlight & tag",
  "Confidence",
  "AI perspective",
  "Journal",
  "Action",
  "Done",
] as const;

export const SEQUENTIAL_EXERCISE_STEP_LABELS = [
  "Setup",
  "Order steps",
  "Confidence",
  "AI perspective",
  "Journal",
  "Action",
  "Done",
] as const;

export const SYSTEMS_EXERCISE_STEP_LABELS = [
  "Setup",
  "Connect",
  "Confidence",
  "Shock",
  "AI reflection",
  "Journal",
  "Action",
  "Done",
] as const;

export const EVALUATIVE_EXERCISE_STEP_LABELS = [
  "Setup",
  "Evaluate",
  "Confidence",
  "AI perspective",
  "Journal",
  "Action",
  "Done",
] as const;

export const GENERATIVE_EXERCISE_STEP_LABELS = [
  "Setup",
  "Write",
  "Confidence",
  "Debate",
  "AI reflection",
  "Journal",
  "Action",
  "Done",
] as const;

export type ExerciseShellStepLabels = readonly string[];

export interface ExerciseShellProps {
  stepIndex: number;
  children: ReactNode;
  /** Defaults to analytical labels (highlight & tag). */
  stepLabels?: ExerciseShellStepLabels;
}

export function ExerciseShell({
  stepIndex,
  children,
  stepLabels = ANALYTICAL_EXERCISE_STEP_LABELS,
}: ExerciseShellProps) {
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 p-6">
      <nav aria-label="Exercise progress" className="flex flex-wrap gap-2 text-xs">
        {stepLabels.map((label, i) => (
          <span
            key={`${i}-${label}`}
            className={cn(
              "rounded-full px-3 py-1",
              i === stepIndex
                ? "bg-primary text-primary-foreground"
                : i < stepIndex
                  ? "bg-muted text-muted-foreground"
                  : "border border-dashed text-muted-foreground",
            )}
          >
            {i + 1}. {label}
          </span>
        ))}
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
