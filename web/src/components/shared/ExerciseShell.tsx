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

export const ANALYTICAL_STEELMAN_STEP_LABELS = [
  "Setup",
  "Steelman",
  "Confidence",
  "AI perspective",
  "Journal",
  "Action",
  "Done",
] as const;

export const GEOPOLITICS_ANALYTICAL_STEP_LABELS = [
  "Setup",
  "Highlight & tag",
  "Perspective guess",
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

export const GEOPOLITICS_SEQUENTIAL_STEP_LABELS = [
  "Setup",
  "Order steps (Actor A)",
  "Order steps (Actor B)",
  "Confidence",
  "AI perspective",
  "Journal",
  "Action",
  "Done",
] as const;

export const SEQUENTIAL_TRIAGE_STEP_LABELS = [
  "Setup",
  "Order under time pressure",
  "Confidence",
  "AI perspective",
  "Journal",
  "Action",
  "Done",
] as const;

export const SYSTEMS_EXERCISE_STEP_LABELS = [
  "Setup",
  "Decompose",
  "Connect",
  "Confidence",
  "Shock",
  "AI reflection",
  "Journal",
  "Action",
  "Done",
] as const;

export const GEOPOLITICS_SYSTEMS_STEP_LABELS = [
  "Setup",
  "Decompose",
  "Connect",
  "Confidence",
  "Shock",
  "Perspective swap",
  "AI reflection",
  "Journal",
  "Action",
  "Done",
] as const;

export const SYSTEMS_RESILIENCE_STEP_LABELS = [
  "Setup",
  "Decompose",
  "Connect",
  "Criticality",
  "Confidence",
  "Shock",
  "Cascade",
  "AI reflection",
  "Journal",
  "Action",
  "Done",
] as const;

export const EVALUATIVE_EXERCISE_STEP_LABELS = [
  "Setup",
  "Propose criteria",
  "Evaluate",
  "Confidence",
  "AI perspective",
  "Journal",
  "Action",
  "Done",
] as const;

export const GEOPOLITICS_EVALUATIVE_STEP_LABELS = [
  "Setup",
  "Stakeholder mapping",
  "Evaluate",
  "Confidence",
  "AI perspective",
  "Journal",
  "Action",
  "Done",
] as const;

export const EVALUATIVE_UNCERTAINTY_STEP_LABELS = [
  "Setup",
  "Outcome intuition",
  "Estimate & compute EV",
  "Confidence",
  "AI perspective",
  "Journal",
  "Action",
  "Done",
] as const;

export const GENERATIVE_EXERCISE_STEP_LABELS = [
  "Setup",
  "Write",
  "Steelman",
  "Confidence",
  "Debate",
  "AI reflection",
  "Journal",
  "Action",
  "Done",
] as const;

export const GEOPOLITICS_GENERATIVE_STEP_LABELS = [
  "Setup",
  "Scenario planning",
  "Steelman",
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
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6">
      <nav aria-label="Exercise progress" className="flex flex-wrap gap-2 text-xs">
        {stepLabels.map((label, i) => (
          <span
            key={`${i}-${label}`}
            className={cn(
              "rounded-full border px-3 py-1 font-medium",
              i === stepIndex
                ? "border-zinc-900 bg-zinc-900 text-white"
                : i < stepIndex
                  ? "border-zinc-200 bg-zinc-50 text-zinc-600"
                  : "border-dashed border-zinc-200 text-zinc-500",
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
