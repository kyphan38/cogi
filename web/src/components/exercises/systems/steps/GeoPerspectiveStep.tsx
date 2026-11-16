"use client";

import { SystemsPerspectiveCompare } from "@/components/exercises/SystemsPerspectiveCompare";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { putExercise } from "@/lib/db/exercises";
import type { SystemsFlowState } from "@/components/exercises/systems/useSystemsFlow";

export function GeoPerspectiveStep({
  s,
  exercise,
}: {
  s: SystemsFlowState;
  exercise: NonNullable<SystemsFlowState["exercise"]>;
}) {
  const {
    userEdges,
    nodeImpact,
    userPerspectiveBNotes,
    setUserPerspectiveBNotes,
    setStep,
    setExercise,
    loading,
    submitSwapAndPerspective,
  } = s;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Perspective comparison</CardTitle>
          <CardDescription>
            You mapped this system from {exercise.perspectiveAName ?? "Actor A"}
            &apos;s view. How would {exercise.perspectiveBName ?? "Actor B"} see
            it differently?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exercise.intendedConnectionsB &&
          exercise.shockEventB &&
          !exercise.revealedB ? (
            <div
              className="space-y-3 border-t border-border pt-4"
              data-testid="predict-b"
            >
              <p className="text-body font-medium">
                Predict first: from {exercise.perspectiveBName ?? "Actor B"}
                &apos;s view, which parts does the shock hit directly?
              </p>
              <div className="flex flex-wrap gap-2">
                {exercise.nodes.map((n) => {
                  const on = (exercise.predictedDirectB ?? []).includes(n.id);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        const prev = exercise.predictedDirectB ?? [];
                        const next = {
                          ...exercise,
                          predictedDirectB: on
                            ? prev.filter((x) => x !== n.id)
                            : [...prev, n.id],
                        };
                        setExercise(next);
                        void putExercise(next);
                      }}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-body",
                        on
                          ? "border-foreground bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {n.label}
                    </button>
                  );
                })}
              </div>
              <Button
                type="button"
                disabled={(exercise.predictedDirectB ?? []).length === 0}
                onClick={() => {
                  const next = { ...exercise, revealedB: true };
                  setExercise(next);
                  void putExercise(next);
                }}
              >
                Show {exercise.perspectiveBName ?? "Actor B"}&apos;s view
              </Button>
            </div>
          ) : null}
          {exercise.revealedB &&
          exercise.predictedDirectB?.length &&
          exercise.shockEventB
            ? (() => {
                const actual = new Set(exercise.shockEventB.directlyAffected);
                const hits = exercise.predictedDirectB.filter((id) =>
                  actual.has(id),
                ).length;
                return (
                  <p className="text-body" data-testid="predict-b-result">
                    Your prediction matched{" "}
                    <span className="font-medium">
                      {hits} of {actual.size}
                    </span>{" "}
                    directly hit parts
                    {exercise.predictedDirectB.length > hits
                      ? `, with ${exercise.predictedDirectB.length - hits} extra`
                      : ""}
                    .
                  </p>
                );
              })()
            : null}
          {exercise.intendedConnectionsB &&
          exercise.shockEventB &&
          exercise.revealedB ? (
            <SystemsPerspectiveCompare
              nodes={exercise.nodes}
              userEdges={userEdges}
              nodeImpact={nodeImpact}
              perspectiveAName={exercise.perspectiveAName ?? "Perspective A"}
              perspectiveBName={exercise.perspectiveBName ?? "Perspective B"}
              intendedConnectionsA={exercise.intendedConnections}
              intendedConnectionsB={exercise.intendedConnectionsB}
              shockEvent={exercise.shockEvent}
              shockEventB={exercise.shockEventB}
            />
          ) : null}
          {exercise.revealedB ? (
            <div className="grid gap-2">
              <Label htmlFor="perspective-b-notes">
                What structural differences matter most for{" "}
                {exercise.perspectiveBName ?? "the other actor"}?
              </Label>
              <Textarea
                id="perspective-b-notes"
                rows={4}
                value={userPerspectiveBNotes}
                onChange={(e) => setUserPerspectiveBNotes(e.target.value)}
                placeholder="e.g. Different central hubs, reversed dependencies, who bears shock risk…"
              />
            </div>
          ) : null}
          {loading ? <PerspectiveLoadingCard /> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => setStep(4)}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void submitSwapAndPerspective()}
            >
              {loading ? (
                <>
                  <InlineSpinner /> Loading reflection…
                </>
              ) : (
                "Submit and get AI reflection"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
