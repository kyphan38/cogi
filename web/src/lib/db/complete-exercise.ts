import { recordPracticedTopic } from "@/lib/db/practiced-topics";
import { putExercise } from "@/lib/db/exercises";
import type { PracticedTopicArea } from "@/lib/types/practiced-topic";
import type { Exercise } from "@/lib/types/exercise";

/**
 * Finish an exercise in the 3-step practice loop (PLAN-simplify.md P2.2): one write
 * to the exercise doc with `completedAt` and the optional takeaway. Confidence is
 * already on the exercise (`confidenceBefore`).
 */
export async function completePracticeExercise(input: {
  exercise: Exercise;
  takeaway: string;
}): Promise<Exercise> {
  const takeaway = input.takeaway.trim();
  const finished = {
    ...input.exercise,
    completedAt: input.exercise.completedAt ?? new Date().toISOString(),
    takeaway: takeaway || null,
  } as Exercise;
  // A single doc write; putExercise also covers the E2E in-memory store.
  await putExercise(finished);
  if (finished.domain?.trim()) {
    try {
      await recordPracticedTopic({
        area: finished.type as PracticedTopicArea,
        title: finished.domain,
        origin: "manual",
      });
    } catch (e) {
      console.error("[completePracticeExercise] practiced-topic recording failed (exercise saved ok):", e);
    }
  }
  return finished;
}

