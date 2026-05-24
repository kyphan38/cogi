import { AnalyticalExerciseFlow } from "@/components/exercises/AnalyticalExerciseFlow";
import { EvaluativeExerciseFlow } from "@/components/exercises/EvaluativeExerciseFlow";
import { GenerativeExerciseFlow } from "@/components/exercises/GenerativeExerciseFlow";
import { SequentialExerciseFlow } from "@/components/exercises/SequentialExerciseFlow";
import { SystemsExerciseFlow } from "@/components/exercises/SystemsExerciseFlow";
import { notFound } from "next/navigation";

type FlowComponent = React.ComponentType<{
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
}>;

const FLOW_BY_TYPE: Record<string, FlowComponent> = {
  analytical: AnalyticalExerciseFlow,
  sequential: SequentialExerciseFlow,
  systems: SystemsExerciseFlow,
  evaluative: EvaluativeExerciseFlow,
  generative: GenerativeExerciseFlow,
};

const VALID_SOURCES = new Set(["generated", "real_data", "custom_scenario"]);

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
  const initialDomain =
    typeof sp.domain === "string" ? decodeURIComponent(sp.domain).trim() : undefined;
  const rawSource = typeof sp.source === "string" ? sp.source : undefined;
  const initialSource = rawSource && VALID_SOURCES.has(rawSource)
    ? (rawSource as "generated" | "real_data" | "custom_scenario")
    : undefined;
  const autoGenerate = sp.autoGenerate === "1";
  const Flow = FLOW_BY_TYPE[type];
  if (!Flow) notFound();
  return (
    <main>
      <Flow
        resumeId={resumeId}
        initialDomain={resumeId ? undefined : initialDomain || undefined}
        initialSource={resumeId ? undefined : initialSource}
        autoGenerate={!resumeId && autoGenerate && !!initialDomain}
      />
    </main>
  );
}
