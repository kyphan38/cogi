import { AnalyticalExerciseFlow } from "@/components/exercises/AnalyticalExerciseFlow";
import { EvaluativeExerciseFlow } from "@/components/exercises/EvaluativeExerciseFlow";
import { GenerativeExerciseFlow } from "@/components/exercises/GenerativeExerciseFlow";
import { SequentialExerciseFlow } from "@/components/exercises/SequentialExerciseFlow";
import { SystemsExerciseFlow } from "@/components/exercises/SystemsExerciseFlow";
import { notFound } from "next/navigation";

type FlowComponent = React.ComponentType<{ resumeId?: string }>;

const FLOW_BY_TYPE: Record<string, FlowComponent> = {
  analytical: AnalyticalExerciseFlow,
  sequential: SequentialExerciseFlow,
  systems: SystemsExerciseFlow,
  evaluative: EvaluativeExerciseFlow,
  generative: GenerativeExerciseFlow,
};

export default async function ExerciseTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { type } = await params;
  const sp = await searchParams;
  const resumeId = typeof sp.resumeId === "string" ? sp.resumeId : undefined;
  const Flow = FLOW_BY_TYPE[type];
  if (!Flow) notFound();
  return (
    <main>
      <Flow resumeId={resumeId} />
    </main>
  );
}
