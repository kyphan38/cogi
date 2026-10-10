import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ExerciseFlowHost } from "@/components/exercises/ExerciseFlowHost";
import { PRACTICE_EXERCISE_TYPES } from "@/lib/exercise/exercise-mode-cards";

const TYPES = new Set<string>(PRACTICE_EXERCISE_TYPES);

export default async function ExerciseTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!TYPES.has(type)) notFound();
  return (
    <main>
      <Suspense>
        <ExerciseFlowHost type={type} />
      </Suspense>
    </main>
  );
}
