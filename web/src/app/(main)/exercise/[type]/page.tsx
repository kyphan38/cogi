import { AnalyticalExerciseFlow } from "@/components/exercises/AnalyticalExerciseFlow";
import { EvaluativeExerciseFlow } from "@/components/exercises/EvaluativeExerciseFlow";
import { GenerativeExerciseFlow } from "@/components/exercises/GenerativeExerciseFlow";
import { SequentialExerciseFlow } from "@/components/exercises/SequentialExerciseFlow";
import { SystemsExerciseFlow } from "@/components/exercises/SystemsExerciseFlow";

export default async function ExerciseTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (type === "analytical") {
    return (
      <main>
        <AnalyticalExerciseFlow />
      </main>
    );
  }
  if (type === "sequential") {
    return (
      <main>
        <SequentialExerciseFlow />
      </main>
    );
  }
  if (type === "systems") {
    return (
      <main>
        <SystemsExerciseFlow />
      </main>
    );
  }
  if (type === "evaluative") {
    return (
      <main>
        <EvaluativeExerciseFlow />
      </main>
    );
  }
  if (type === "generative") {
    return (
      <main>
        <GenerativeExerciseFlow />
      </main>
    );
  }
  return (
    <main className="p-8">
      <p>This exercise type is not available yet.</p>
    </main>
  );
}
