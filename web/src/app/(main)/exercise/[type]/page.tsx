import { AnalyticalExerciseFlow } from "@/components/exercises/AnalyticalExerciseFlow";
import { EvaluativeExerciseFlow } from "@/components/exercises/EvaluativeExerciseFlow";
import { GenerativeExerciseFlow } from "@/components/exercises/GenerativeExerciseFlow";
import { SequentialExerciseFlow } from "@/components/exercises/SequentialExerciseFlow";
import { SystemsExerciseFlow } from "@/components/exercises/SystemsExerciseFlow";
import { notFound } from "next/navigation";

const FLOW_BY_TYPE: Record<string, React.ComponentType> = {
  analytical: AnalyticalExerciseFlow,
  sequential: SequentialExerciseFlow,
  systems: SystemsExerciseFlow,
  evaluative: EvaluativeExerciseFlow,
  generative: GenerativeExerciseFlow,
};

export default async function ExerciseTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const Flow = FLOW_BY_TYPE[type];
  if (!Flow) notFound();
  return (
    <main>
      <Flow />
    </main>
  );
}
