"use client";

import { useCallback, useEffect, useState, type DependencyList } from "react";
import { completePracticeExercise } from "@/lib/db/complete-exercise";
import { getExercise, putExercise } from "@/lib/db/exercises";
import { getPracticeLevel, setPracticeLevel } from "@/lib/db/settings";
import { commonResumeState, DEFAULT_CONFIDENCE, DONE_STEP, resumableRow, scheduleSave } from "@/lib/exercise/flow";
import { levelSuggestionFor } from "@/lib/exercise/level-suggestion";
import {
  DEFAULT_PRACTICE_LEVEL,
  type LevelledExerciseType,
  type LevelSuggestion,
  type PracticeLevel,
} from "@/lib/exercise/levels";
import { useSaveOnLeave, type PendingSave } from "@/lib/hooks/useSaveOnLeave";
import type { Exercise } from "@/lib/types/exercise";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";

/**
 * State and steps every practice flow shares: level, resume, step changes, the
 * pending save and Finish. Each flow keeps its own answers and screens.
 */
export function useExerciseFlow<Row extends Exercise, Step extends number>(opts: {
  type: LevelledExerciseType;
  resumeId?: string;
  isRow: (ex: Exercise) => ex is Row;
  /** Restore the flow's own state from a resumed row. It must also set the step. */
  onResume: (row: Row) => void;
  /** False when the flow loads the saved level itself (e.g. after a scenario handoff). */
  loadLevel?: boolean;
}) {
  const { type, resumeId, isRow, loadLevel = true } = opts;
  const [step, setStep] = useState<Step>(0 as Step);
  const [level, setLevel] = useState<PracticeLevel>(DEFAULT_PRACTICE_LEVEL);
  const [exercise, setExercise] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE);
  const [perspectiveStructured, setPerspectiveStructured] = useState<AIPerspectiveStructured | null>(null);
  const [takeaway, setTakeaway] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [levelSuggestion, setLevelSuggestion] = useState<LevelSuggestion>(null);
  const pendingSave = useSaveOnLeave();

  useEffect(() => {
    if (loadLevel) void getPracticeLevel(type).then(setLevel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!resumeId) return;
    void (async () => {
      const row = resumableRow(await getExercise(resumeId), isRow);
      if (!row) return;
      const common = commonResumeState(row);
      setExercise(row);
      setConfidence(common.confidence);
      setTakeaway(common.takeaway);
      if (common.perspectiveStructured) setPerspectiveStructured(common.perspectiveStructured);
      opts.onResume(row);
    })();
    // Resume once per id; onResume only calls state setters.
  }, [resumeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseLevel = useCallback(
    (next: PracticeLevel) => {
      setLevel(next);
      void setPracticeLevel(type, next);
    },
    [type],
  );

  /** Go to `next` and save it as the step to resume at. `row`: one just updated, before state catches up. */
  const advance = useCallback(
    (next: Step, row?: Row) => {
      const r = row ?? exercise;
      if (r) void putExercise({ ...r, currentStep: next });
      setStep(next);
    },
    [exercise],
  );

  /** Save the finished row with the takeaway, show "Saved", then ask about the level. */
  const finish = async (row: Row, doneStep: Step = DONE_STEP as Step) => {
    if (finishing) return;
    pendingSave.clear();
    setFinishing(true);
    try {
      const saved = (await completePracticeExercise({ exercise: row, takeaway })) as Row;
      setExercise(saved);
      setStep(doneStep);
      const rowLevel = (row as { level?: PracticeLevel }).level;
      if (rowLevel) {
        void levelSuggestionFor(type, rowLevel)
          .then(setLevelSuggestion)
          .catch(() => setLevelSuggestion(null));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setFinishing(false);
    }
  };

  return {
    step,
    setStep,
    level,
    setLevel,
    chooseLevel,
    exercise,
    setExercise,
    error,
    setError,
    loading,
    setLoading,
    confidence,
    setConfidence,
    perspectiveStructured,
    setPerspectiveStructured,
    takeaway,
    setTakeaway,
    finishing,
    levelSuggestion,
    setLevelSuggestion,
    pendingSave,
    advance,
    finish,
  };
}

/**
 * Autosave: `save` runs `delayMs` after the last change in `deps`, or at once when the
 * page is left. Pass null when nothing should be saved (setup step, finished).
 */
export function useDebouncedSave(
  pending: PendingSave,
  save: (() => void) | null,
  delayMs: number,
  deps: DependencyList,
): void {
  useEffect(() => {
    if (!save) {
      pending.clear();
      return;
    }
    return scheduleSave(pending, save, delayMs);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
