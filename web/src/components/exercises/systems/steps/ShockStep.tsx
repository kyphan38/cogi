"use client";

import { SystemsFlowCanvas } from "@/components/exercises/SystemsFlowCanvas";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { SystemsLookAheadForm } from "@/components/exercises/SystemsLookAheadForm";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
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

export function ShockStep({
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
    setNodeImpact,
    impactVia,
    setImpactVia,
    lookAhead,
    setLookAhead,
    setStep,
    loading,
    confidence,
    setConfidence,
    criticalityStep,
    nodeLabel,
    finishShockStep,
    isGeoExercise,
    isResilienceExercise,
    skipSwap,
    exLevel,
  } = s;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Shock scenario</CardTitle>
          <CardDescription>
            Click nodes to cycle: unaffected → directly affected (solid border)
            → indirectly affected (dashed border). The node also says
            &quot;direct&quot; or &quot;indirect&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-body font-medium">
            {exercise.shockEvent.description}
          </p>
          {exLevel.impactCountHint ? (
            <p
              className="text-body text-foreground"
              data-testid="impact-count-hint"
            >
              In the model, {exercise.shockEvent.directlyAffected.length} node
              {exercise.shockEvent.directlyAffected.length === 1
                ? " is"
                : "s are"}{" "}
              directly and {exercise.shockEvent.indirectlyAffected.length}{" "}
              indirectly affected.
            </p>
          ) : null}
          <SystemsFlowCanvas
            nodes={exercise.nodes}
            userEdges={userEdges}
            onUserEdgesChange={setUserEdges}
            mode="shock"
            nodeImpact={nodeImpact}
            onToggleNodeImpact={(id) => {
              setNodeImpact((prev) => ({
                ...prev,
                [id]: cycleImpact(prev[id] ?? "none"),
              }));
            }}
          />
          {(() => {
            const indirect = exercise.nodes.filter(
              (n) => nodeImpact[n.id] === "indirect",
            );
            if (indirect.length === 0) return null;
            return (
              <div
                className="space-y-3 border-t border-border pt-4"
                data-testid="spread-questions"
              >
                <div>
                  <p className="text-body font-medium text-foreground">
                    How does the shock reach each indirect node?
                  </p>
                  <p className="text-muted-foreground text-meta">
                    Pick the node it passes through.
                  </p>
                </div>
                {indirect.map((n) => {
                  const choices = exercise.nodes.filter(
                    (m) =>
                      m.id !== n.id && (nodeImpact[m.id] ?? "none") !== "none",
                  );
                  return (
                    <div
                      key={n.id}
                      className="space-y-1.5"
                      data-testid="spread-question"
                    >
                      <p className="text-body">
                        <span className="font-medium">{n.label}</span> is hit
                        through:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {choices.length === 0 ? (
                          <span className="text-muted-foreground text-meta">
                            Mark another node as affected first.
                          </span>
                        ) : (
                          choices.map((m) => (
                            <Button
                              key={m.id}
                              type="button"
                              size="sm"
                              variant={
                                impactVia[n.id] === m.id ? "default" : "outline"
                              }
                              aria-pressed={impactVia[n.id] === m.id}
                              onClick={() =>
                                setImpactVia((prev) => ({
                                  ...prev,
                                  [n.id]: m.id,
                                }))
                              }
                            >
                              {m.label}
                            </Button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <SystemsLookAheadForm
            userEdges={userEdges}
            label={nodeLabel}
            value={lookAhead}
            onChange={setLookAhead}
          />
          <ConfidenceSlider
            value={confidence}
            onChange={setConfidence}
            label="How confident are you in your dependency map?"
          />
          {loading ? <PerspectiveLoadingCard /> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => {
                const backStep = isResilienceExercise ? criticalityStep : 2;
                void putExercise({
                  ...exercise,
                  userEdges,
                  nodeImpact,
                  currentStep: backStep,
                });
                setStep(backStep);
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void finishShockStep()}
            >
              {loading ? (
                <>
                  <InlineSpinner /> Loading…
                </>
              ) : isResilienceExercise ? (
                "Continue to cascade"
              ) : isGeoExercise && !skipSwap ? (
                "Continue to perspective comparison"
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
