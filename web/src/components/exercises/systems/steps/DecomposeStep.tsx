"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

export function DecomposeStep({
  s,
  exercise,
}: {
  s: SystemsFlowState;
  exercise: NonNullable<SystemsFlowState["exercise"]>;
}) {
  const {
    userEdges,
    nodeImpact,
    userProposedComponents,
    setUserProposedComponents,
    decomposePhase,
    setDecomposePhase,
    setStep,
    setExercise,
    setError,
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
          {decomposePhase === "input" ? (
            <div className="space-y-3">
              <p
                className="text-muted-foreground text-body"
                data-testid="decompose-hint"
              >
                Pick the 6 factors that matter most.
              </p>
              {exLevel.componentCandidates &&
              exercise.componentCandidates &&
              exercise.componentCandidates.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {exercise.componentCandidates.map((c) => {
                      const selected = userProposedComponents.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setUserProposedComponents((prev) => {
                              if (prev.includes(c))
                                return prev.filter((s) => s !== c);
                              if (prev.length >= 6) return prev;
                              return [...prev, c];
                            })
                          }
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-body transition-colors",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:bg-accent",
                          )}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-muted-foreground text-meta">
                    {userProposedComponents.length}/6 selected
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {Array.from(
                    { length: 6 },
                    (_, i) => userProposedComponents[i] ?? "",
                  ).map((v, i) => (
                    <Input
                      key={i}
                      value={v}
                      maxLength={30}
                      placeholder={`Component ${i + 1}`}
                      onChange={(e) =>
                        setUserProposedComponents((prev) => {
                          const next = [...prev];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                    />
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const updated = {
                      ...exercise,
                      userEdges,
                      nodeImpact,
                      currentStep: 1 as const,
                    };
                    setExercise(updated);
                    void putExercise(updated);
                    setStep(0);
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const cleaned = userProposedComponents
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (cleaned.length !== 6) {
                      setError("Choose 6 components.");
                      return;
                    }
                    setError(null);
                    setDecomposePhase("compare");
                  }}
                >
                  Compare and continue
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-2 text-meta font-medium uppercase">
                    Your components
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-body">
                    {userProposedComponents.map((s, i) => (
                      <li key={i}>{s.trim() || "-"}</li>
                    ))}
                  </ul>
                </div>
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-2 text-meta font-medium uppercase">
                    AI nodes
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-body">
                    {exercise.nodes.map((n) => (
                      <li key={n.id}>{n.label}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDecomposePhase("input")}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const cleaned = userProposedComponents
                      .map((s) => s.trim())
                      .filter(Boolean);
                    const nextRow: SystemsExerciseRow = {
                      ...exercise,
                      userProposedComponents:
                        cleaned.length === 6 ? cleaned : null,
                      currentStep: 2,
                    };
                    void putExercise(nextRow);
                    setExercise(nextRow);
                    setStep(2);
                  }}
                >
                  Continue to connect
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
