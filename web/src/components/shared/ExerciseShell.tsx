import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Step lists of the original flows. Saved exercises store `currentStep` as an index into
 * these, so old steps (Confidence, Journal, Action, Done) stay listed; the flows show
 * only the work parts between Setup and the AI step.
 */
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

export type ExerciseShellStepLabels = readonly string[];

/**
 * The 3-step practice loop (PLAN-simplify.md): setup, the type's own work, AI feedback.
 * Multi-part work (e.g. systems: decompose, connect, shock) shows its part under the
 * bar via `partLabel` instead of adding more steps.
 */
export function practiceStepLabels(workLabel: string): ExerciseShellStepLabels {
  return ["Setup", workLabel, "AI feedback"];
}

/** Practice-loop phase for a flow's internal step: 0 setup, 1 work, 2 feedback and done. */
export function practicePhase(step: number, feedbackStep: number): 0 | 1 | 2 {
  if (step <= 0) return 0;
  return step < feedbackStep ? 1 : 2;
}

export interface ExerciseShellProps {
  stepIndex: number;
  children: ReactNode;
  stepLabels: ExerciseShellStepLabels;
  /** Shown under the bar, e.g. "Part 2 of 3 · Connect". */
  partLabel?: string;
}

export function ExerciseShell({
  stepIndex,
  children,
  stepLabels,
  partLabel,
}: ExerciseShellProps) {
  return (
    <div className="mx-auto flex min-h-full w-full min-w-0 max-w-3xl flex-col gap-8 px-4 pt-8 pb-24 sm:px-6">
      {/* Steps as words (DESIGN.md "Words as navigation"): done steps muted,
          the current one ink, later ones faint. */}
      <nav
        aria-label="Exercise progress"
        className="flex flex-wrap items-baseline font-mono text-[11px] tracking-[0.04em]"
      >
        {stepLabels.map((label, i) => (
          <Fragment key={`${i}-${label}`}>
            {i > 0 ? (
              <span className="px-1.5 text-zinc-400" aria-hidden>
                ·
              </span>
            ) : null}
            <span
              aria-current={i === stepIndex ? "step" : undefined}
              className={cn(
                i === stepIndex
                  ? "font-medium text-zinc-900"
                  : i < stepIndex
                    ? "text-zinc-600"
                    : "text-zinc-400",
              )}
            >
              {i + 1}. {label}
            </span>
          </Fragment>
        ))}
      </nav>
      {partLabel ? <p className="-mt-6 text-xs text-muted-foreground">{partLabel}</p> : null}
      <div className="flex-1">{children}</div>
    </div>
  );
}
