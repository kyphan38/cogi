"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Hint } from "@/components/guide/Hint";
import { PageHeader } from "@/components/shared/PageHeader";
import { stepGoal } from "@/lib/guide/step-goals";
import { reducedMotion } from "@/lib/motion";
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
  /** The exercise type as the page title, e.g. "Evaluative". */
  title?: string;
  /** One line under the title, shown on the setup step only. */
  sub?: string;
}

/**
 * True when the AI feedback phase was just reached by finishing the work, in this
 * visit. Answer keys read it to rise in part by part. A saved exercise that opens
 * on its feedback is not fresh: it shows at once.
 */
const FreshFeedbackContext = createContext(false);

export function useFreshFeedback(): boolean {
  return useContext(FreshFeedbackContext);
}

export function ExerciseShell({
  stepIndex,
  children,
  stepLabels,
  partLabel,
  title,
  sub,
}: ExerciseShellProps) {
  const body = useRef<HTMLDivElement>(null);
  const lastStep = useRef(stepIndex);

  // One step forward or back fades the content in. A jump (a saved exercise
  // opening on its step) and the first render show at once. It animates the
  // element that is already there: a new `key` would rebuild the whole flow and
  // lose what was typed.
  useEffect(() => {
    const moved = Math.abs(stepIndex - lastStep.current) === 1;
    lastStep.current = stepIndex;
    const el = body.current;
    if (!moved || !el || reducedMotion() || typeof el.animate !== "function")
      return;
    el.animate(
      [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  }, [stepIndex]);

  // Fresh feedback: the last step, reached from the one before it. Derived during
  // render, so the first feedback render already knows.
  const [prevStep, setPrevStep] = useState(stepIndex);
  const [fresh, setFresh] = useState(false);
  if (stepIndex !== prevStep) {
    setPrevStep(stepIndex);
    setFresh(stepIndex === stepLabels.length - 1 && prevStep === stepIndex - 1);
  }

  const goal = stepGoal(stepLabels[stepIndex]);

  return (
    <div className="relative mx-auto flex min-h-full w-full min-w-0 max-w-3xl flex-col gap-8 px-4 pt-8 pb-24 sm:px-6">
      {/* Each step is a short bar and a word: done and current in ink, later
          ones faint. The current word is medium. */}
      <div className="space-y-3">
        <nav
          aria-label="Exercise progress"
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${stepLabels.length}, minmax(0, 1fr))`,
          }}
        >
          {stepLabels.map((label, i) => (
            <div key={`${i}-${label}`} className="min-w-0">
              <div
                aria-hidden
                className={cn(
                  "h-0.5 rounded-full transition-colors duration-150",
                  i <= stepIndex ? "bg-foreground" : "bg-input",
                )}
              />
              <span
                aria-current={i === stepIndex ? "step" : undefined}
                className={cn(
                  "mt-2 block truncate text-meta transition-colors duration-150",
                  i === stepIndex
                    ? "font-medium text-foreground"
                    : i < stepIndex
                      ? "text-muted-foreground"
                      : "text-muted-foreground/70",
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </nav>
        {goal ? (
          <Hint
            key={stepLabels[stepIndex]}
            id={`step:${stepLabels[stepIndex]}`}
            full={goal.full}
            short={goal.short}
          />
        ) : null}
      </div>
      {partLabel ? (
        <p className="-mt-6 text-meta text-muted-foreground">{partLabel}</p>
      ) : null}
      {title ? (
        <PageHeader title={title} sub={stepIndex === 0 ? sub : undefined} />
      ) : null}
      <FreshFeedbackContext.Provider value={fresh}>
        <div ref={body} className="flex-1">
          {children}
        </div>
      </FreshFeedbackContext.Provider>
    </div>
  );
}
