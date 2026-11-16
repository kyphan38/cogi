"use client";

import { SystemsFlowCanvas } from "@/components/exercises/SystemsFlowCanvas";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { putExercise } from "@/lib/db/exercises";
import { cycleImpact } from "@/components/exercises/systems/shared";
import type { SystemsFlowState } from "@/components/exercises/systems/useSystemsFlow";

export function CascadeStep({
  s,
  exercise,
}: {
  s: SystemsFlowState;
  exercise: NonNullable<SystemsFlowState["exercise"]>;
}) {
  const {
    userEdges,
    setUserEdges,
    nodeImpact,
    userCriticalityRanking,
    secondNodeImpact,
    setSecondNodeImpact,
    setStep,
    loading,
    shockStep,
    finishCascadeStep,
  } = s;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Cascade</CardTitle>
          <CardDescription>
            A second shock cascades from the first. Mark impact, then compare
            your criticality ranking to the model&apos;s.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-body font-medium">
            {exercise.secondShockEvent!.description}
          </p>
          <SystemsFlowCanvas
            nodes={exercise.nodes}
            userEdges={userEdges}
            onUserEdgesChange={setUserEdges}
            mode="shock"
            nodeImpact={secondNodeImpact}
            onToggleNodeImpact={(id) => {
              setSecondNodeImpact((prev) => ({
                ...prev,
                [id]: cycleImpact(prev[id] ?? "none"),
              }));
            }}
          />
          <div className="space-y-2">
            <p className="text-body font-medium">
              Criticality ranking: you vs. the model
            </p>
            <ul className="space-y-1.5">
              {(exercise.criticalityGroundTruth ?? [])
                .slice()
                .sort((a, b) => a.criticalityRank - b.criticalityRank)
                .map((hint) => {
                  const node = exercise.nodes.find((n) => n.id === hint.nodeId);
                  const userRank = userCriticalityRanking[hint.nodeId];
                  const match = userRank === hint.criticalityRank;
                  return (
                    <li
                      key={hint.nodeId}
                      className={cn(
                        "border-l-2 pl-3 text-body",
                        match ? "border-foreground" : "border-input",
                      )}
                    >
                      <span className="font-medium">
                        {node?.label ?? hint.nodeId}
                      </span>
                      {" - "}your rank: {userRank ?? "-"}, model rank:{" "}
                      {hint.criticalityRank}
                      {match ? (
                        <span className="font-medium">{" · match"}</span>
                      ) : null}
                      <p className="text-muted-foreground mt-0.5 text-meta">
                        {hint.rationale}
                      </p>
                    </li>
                  );
                })}
            </ul>
          </div>
          {loading ? <PerspectiveLoadingCard /> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => {
                void putExercise({
                  ...exercise,
                  userEdges,
                  nodeImpact,
                  secondNodeImpact,
                  currentStep: shockStep,
                });
                setStep(shockStep);
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void finishCascadeStep()}
            >
              {loading ? (
                <>
                  <InlineSpinner /> Loading…
                </>
              ) : (
                "Submit impact and get AI reflection"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
