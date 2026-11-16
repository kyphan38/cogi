"use client";

import { SystemsFlowCanvas } from "@/components/exercises/SystemsFlowCanvas";
import { LinkTypeGuide } from "@/components/exercises/LinkTypeGuide";
import { SystemsLoopList } from "@/components/exercises/SystemsLoopList";
import { CONNECTION_TYPE_INFO } from "@/lib/exercise/systems-labels";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { putExercise } from "@/lib/db/exercises";
import type { SystemsFlowState } from "@/components/exercises/systems/useSystemsFlow";

export function ConnectStep({
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
    setStep,
    setExercise,
    setError,
    criticalityStep,
    shockStep,
    regenerate,
    linkTypes,
    nodeLabel,
    setEdgeType,
    isResilienceExercise,
    exLevel,
  } = s;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{exercise.title}</CardTitle>
          <CardDescription>Domain: {exercise.domain}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-body leading-relaxed">{exercise.scenario}</p>
          {exLevel.linkCountHint ? (
            <p
              className="text-body text-foreground"
              data-testid="link-count-hint"
            >
              The model draws{" "}
              <span className="font-medium">
                {exercise.intendedConnections.length} links
              </span>{" "}
              between these nodes. Try to find them.
            </p>
          ) : null}
          {exLevel.linkTypeGuide !== "hidden" ? (
            <LinkTypeGuide mode={exLevel.linkTypeGuide} types={linkTypes} />
          ) : null}
          <p
            className="text-muted-foreground text-meta"
            data-testid="connect-hint"
          >
            Tap a part, then tap the part it affects.
          </p>
          <SystemsFlowCanvas
            nodes={exercise.nodes}
            userEdges={userEdges}
            onUserEdgesChange={setUserEdges}
            mode="connect"
            nodeImpact={nodeImpact}
            linkTypes={linkTypes}
          />
          {userEdges.length > 0 ? (
            <ul
              className="space-y-2 border-t pt-2 text-body"
              data-testid="link-list"
            >
              {userEdges.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{nodeLabel(e.source)}</span>
                    {` ${CONNECTION_TYPE_INFO[e.type].label} `}
                    <span className="font-medium">{nodeLabel(e.target)}</span>
                  </span>
                  {linkTypes.length === 2 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setEdgeType(
                          e.id,
                          linkTypes.find((t) => t !== e.type) ?? e.type,
                        )
                      }
                    >
                      Flip sign
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setUserEdges((prev) => prev.filter((x) => x.id !== e.id))
                    }
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <SystemsLoopList
            links={userEdges.map((e) => ({
              from: e.source,
              to: e.target,
              type: e.type,
            }))}
            label={nodeLabel}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void putExercise({
                  ...exercise,
                  userEdges,
                  nodeImpact,
                  currentStep: 1,
                });
                setStep(1);
              }}
            >
              Back
            </Button>
            <Button type="button" variant="secondary" onClick={regenerate}>
              Regenerate
            </Button>
            <Button
              type="button"
              onClick={() => {
                setError(null);
                if (userEdges.length < 1) {
                  setError("Add at least one connection before continuing.");
                  return;
                }
                // Confidence is part of the shock step now, so base/geo go straight there.
                const next = isResilienceExercise ? criticalityStep : shockStep;
                void putExercise({ ...exercise, userEdges, currentStep: next });
                setExercise({ ...exercise, userEdges, currentStep: next });
                setStep(next);
              }}
            >
              Done connecting
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
