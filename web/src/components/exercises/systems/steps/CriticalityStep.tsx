"use client";

import { SystemsFlowCanvas } from "@/components/exercises/SystemsFlowCanvas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SystemsExerciseRow } from "@/lib/types/exercise";
import { putExercise } from "@/lib/db/exercises";
import type { SystemsFlowState } from "@/components/exercises/systems/useSystemsFlow";

export function CriticalityStep({
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
    setUserCriticalityRanking,
    setStep,
    setExercise,
    setError,
    shockStep,
  } = s;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Criticality ranking</CardTitle>
          <CardDescription>
            Before either shock hits, rank each node by how critical it is to
            the system (1 = most critical single point of failure, 6 = least
            critical).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SystemsFlowCanvas
            nodes={exercise.nodes}
            userEdges={userEdges}
            onUserEdgesChange={setUserEdges}
            mode="readonly"
            nodeImpact={nodeImpact}
          />
          <div className="grid gap-2">
            {exercise.nodes.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between gap-3 border-t pt-2"
              >
                <div>
                  <p className="text-body font-medium">{n.label}</p>
                  <p className="text-muted-foreground text-meta">
                    {n.description}
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  className="w-16"
                  value={userCriticalityRanking[n.id] ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setUserCriticalityRanking((prev) => {
                      const next = { ...prev };
                      if (raw === "") {
                        delete next[n.id];
                        return next;
                      }
                      const v = Number(raw);
                      if (!Number.isFinite(v)) return prev;
                      next[n.id] = v;
                      return next;
                    });
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void putExercise({
                  ...exercise,
                  userEdges,
                  nodeImpact,
                  currentStep: 2,
                });
                setStep(2);
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => {
                setError(null);
                const ranks = exercise.nodes.map(
                  (n) => userCriticalityRanking[n.id],
                );
                const valid =
                  ranks.every(
                    (r) =>
                      typeof r === "number" &&
                      Number.isInteger(r) &&
                      r >= 1 &&
                      r <= 6,
                  ) && new Set(ranks).size === 6;
                if (!valid) {
                  setError(
                    "Rank all 6 nodes 1-6, using each rank exactly once.",
                  );
                  return;
                }
                const nextRow: SystemsExerciseRow = {
                  ...exercise,
                  userEdges,
                  nodeImpact,
                  userCriticalityRanking,
                  currentStep: shockStep,
                };
                void putExercise(nextRow);
                setExercise(nextRow);
                setStep(shockStep);
              }}
            >
              Continue to shock
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
