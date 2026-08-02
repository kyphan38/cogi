"use client";

import { useMemo } from "react";
import {
  MinimalContainer,
  MinimalContainerAction,
  MinimalContainerFooter,
} from "@/components/shared/MinimalContainer";
import { ProgressionTrackBar } from "@/components/shared/ProgressionTrackBar";
import { computeGeopoliticsProgressionState } from "@/lib/exercise/geopolitics-progression";
import type { Exercise } from "@/lib/types/exercise";

export function GeopoliticsProgressionCard({
  completed,
  epochAfter,
}: {
  completed: Exercise[];
  epochAfter?: string;
}) {
  const state = useMemo(
    () => computeGeopoliticsProgressionState(completed, { epochAfter }),
    [completed, epochAfter],
  );

  if (!state) return null;

  const href = `/exercise/${state.recommendedExerciseType}?domain=${encodeURIComponent(state.recommendedSubdomain)}`;

  return (
    <MinimalContainer
      data-testid="geopolitics-progression-card"
      title={state.activePhase.description}
      description={
        <>
          {state.totalGeopoliticsCompleted} geopolitics exercise
          {state.totalGeopoliticsCompleted === 1 ? "" : "s"} completed overall
        </>
      }
      headerAside={
        <span className="font-tracker tabular-nums">
          {state.phaseCompletionsCount}/{state.targetExercises}
        </span>
      }
      footer={
        <MinimalContainerFooter>
          <MinimalContainerAction
            label="Start suggested exercise"
            href={href}
            variant="primary"
            className="w-full sm:w-auto"
          />
        </MinimalContainerFooter>
      }
    >
      <p className="section-label mb-4">
        Phase {state.activePhaseIndex + 1}: {state.activePhase.phase}
      </p>
      <ProgressionTrackBar percent={state.progressPercent} className="mb-6" />
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-medium text-zinc-500">Recommended next target</p>
        <p className="mt-1 text-sm font-semibold text-zinc-900">
          {state.recommendedSubdomain}
        </p>
        <p className="mt-1 text-xs font-medium capitalize text-zinc-600">
          Focus: {state.recommendedExerciseType} exercise
        </p>
      </div>
    </MinimalContainer>
  );
}
