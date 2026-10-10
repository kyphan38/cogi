"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getExercise } from "@/lib/db/exercises";
import { AnalyticalExerciseFlow } from "@/components/exercises/AnalyticalExerciseFlow";
import { EvaluativeExerciseFlow } from "@/components/exercises/EvaluativeExerciseFlow";
import { SystemsExerciseFlow } from "@/components/exercises/SystemsExerciseFlow";
import { JudgmentExerciseFlow } from "@/components/exercises/JudgmentExerciseFlow";
import { StrategyExerciseFlow } from "@/components/exercises/StrategyExerciseFlow";
import { ReframeExerciseFlow } from "@/components/exercises/ReframeExerciseFlow";
import { CalibrationExerciseFlow } from "@/components/exercises/CalibrationExerciseFlow";
import { UnfinishedTopicNotice } from "@/components/exercises/UnfinishedTopicNotice";

type Source = "generated" | "real_data" | "custom_scenario";

type FlowComponent = React.ComponentType<{
  resumeId?: string;
  initialDomain?: string;
  initialSource?: Source;
  autoGenerate?: boolean;
}>;

const FLOW_BY_TYPE: Record<string, FlowComponent> = {
  analytical: AnalyticalExerciseFlow,
  systems: SystemsExerciseFlow,
  evaluative: EvaluativeExerciseFlow,
  judgment: JudgmentExerciseFlow,
  strategy: StrategyExerciseFlow,
  reframe: ReframeExerciseFlow,
  calibration: CalibrationExerciseFlow,
};

const VALID_SOURCES = new Set<string>(["generated", "real_data", "custom_scenario"]);

/**
 * Reads the exercise params from the real URL, not the server props: Back and Forward
 * can restore a page rendered for an older URL, before `?resumeId=` was added.
 * Read once at mount, so adding the id mid-exercise does not reload the flow.
 */
export function ExerciseFlowHost({ type }: { type: string }) {
  const sp = useSearchParams();
  const [params] = useState(() => {
    const resumeId = sp.get("resumeId") || undefined;
    const domain = sp.get("domain")?.trim() || undefined;
    const rawSource = sp.get("source") ?? "";
    return {
      resumeId,
      initialDomain: resumeId ? undefined : domain,
      initialSource: !resumeId && VALID_SOURCES.has(rawSource) ? (rawSource as Source) : undefined,
      autoGenerate: !resumeId && sp.get("autoGenerate") === "1" && !!domain,
    };
  });
  const router = useRouter();

  // A finished exercise has nothing left to do here: show its review instead of an empty setup.
  useEffect(() => {
    if (!params.resumeId) return;
    const id = params.resumeId;
    void getExercise(id)
      .then((row) => {
        if (row?.completedAt) router.replace(`/exercise/history?openExercise=${encodeURIComponent(id)}`);
      })
      .catch(() => {});
  }, [params.resumeId, router]);

  const Flow = FLOW_BY_TYPE[type];
  if (!Flow) return null;
  return (
    <>
      {params.initialDomain ? <UnfinishedTopicNotice type={type} domain={params.initialDomain} /> : null}
      <Flow {...params} />
    </>
  );
}
