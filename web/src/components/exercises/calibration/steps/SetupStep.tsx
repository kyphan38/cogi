"use client";

import { ExerciseStepCard } from "@/components/shared/ExerciseStepCard";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CALIBRATION_LEVELS } from "@/lib/exercise/calibration-levels";
import { TOPICS } from "@/components/exercises/calibration/shared";
import type { CalibrationFlowState } from "@/components/exercises/calibration/useCalibrationFlow";

export function SetupStep({ s }: { s: CalibrationFlowState }) {
  const { topic, setTopic, level, loading, setupLevel, chooseLevel, generate } =
    s;

  return (
    <>
      <ExerciseStepCard data-testid="calibration-setup">
        <LevelPicker
          value={level}
          onChange={chooseLevel}
          descriptions={{
            guided: CALIBRATION_LEVELS.guided.description,
            standard: CALIBRATION_LEVELS.standard.description,
            expert: CALIBRATION_LEVELS.expert.description,
          }}
          note={`Takes ${setupLevel.minutes}. Answers are checked, not AI.`}
        />
        <div className="grid gap-2">
          <Label>Topic</Label>
          <div
            className="flex flex-wrap gap-2"
            data-testid="calibration-topics"
          >
            {TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={topic === t}
                onClick={() => setTopic(t)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-body",
                  topic === t
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-meta">
            Base-rate problems are the same for every topic.
          </p>
        </div>
        <div>
          <Button
            type="button"
            disabled={loading}
            onClick={() => void generate()}
          >
            Start exercise
          </Button>
        </div>
      </ExerciseStepCard>
    </>
  );
}
