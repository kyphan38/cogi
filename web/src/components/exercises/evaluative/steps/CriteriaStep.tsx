"use client";

import { EvaluativeStakeholderMappingCard } from "@/components/exercises/EvaluativeStakeholderMappingCard";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  EvaluativeExerciseRow,
  EvaluativeScoringRow,
} from "@/lib/types/exercise";
import { putExercise } from "@/lib/db/exercises";
import type { EvaluativeFlowState } from "@/components/exercises/evaluative/useEvaluativeFlow";

export function CriteriaStep({
  s,
  exercise,
}: {
  s: EvaluativeFlowState;
  exercise: Exclude<
    NonNullable<EvaluativeFlowState["exercise"]>,
    { variant: "uncertainty" }
  >;
}) {
  const {
    userProposedCriteria,
    setUserProposedCriteria,
    criteriaPhase,
    setCriteriaPhase,
    criteriaFeedback,
    setCriteriaFeedback,
    criteriaFeedbackLoading,
    userStakeholderMapping,
    setUserStakeholderMapping,
    stakeholderMappingRevealed,
    setStakeholderMappingRevealed,
    setStep,
    setExercise,
    setError,
    isGeoExercise,
    exLevel,
  } = s;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{exercise.title}</CardTitle>
          <CardDescription className="leading-relaxed">
            {exercise.scenario}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-body font-medium">Options</h3>
            <ul className="space-y-2 text-body">
              {exercise.options.map((o) => (
                <li key={o.id} className="border-t pt-2">
                  <p className="font-medium">{o.title}</p>
                  <p className="text-muted-foreground text-meta">
                    {o.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {isGeoExercise && exercise.variant === "scoring" ? (
            <EvaluativeStakeholderMappingCard
              exercise={exercise}
              rows={userStakeholderMapping}
              revealed={stakeholderMappingRevealed}
              onRowsChange={setUserStakeholderMapping}
              onRevealedChange={setStakeholderMappingRevealed}
              onError={setError}
              onBack={() => {
                const updated = { ...exercise, currentStep: 1 as const };
                setExercise(updated);
                void putExercise(updated);
                setStep(0);
              }}
              onContinue={(cleaned) => {
                const next: EvaluativeScoringRow = {
                  ...exercise,
                  userStakeholderMapping: cleaned,
                  stakeholderMappingRevealed: true,
                  currentStep: 2,
                };
                void putExercise(next);
                setExercise(next);
                setStep(2);
              }}
            />
          ) : criteriaPhase === "input" ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-body">
                Name 2-4 criteria and why each matters.
              </p>
              {exLevel.criteriaCandidates &&
              exercise.criteriaCandidates &&
              exercise.criteriaCandidates.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {exercise.criteriaCandidates.map((c) => {
                      const selected = userProposedCriteria.some(
                        (r) => r.name === c,
                      );
                      return (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setUserProposedCriteria((prev) => {
                              const idx = prev.findIndex((r) => r.name === c);
                              if (idx >= 0) {
                                const next = [...prev];
                                next[idx] = { name: "", rationale: "" };
                                return next;
                              }
                              const emptyIdx = prev.findIndex(
                                (r) => !r.name.trim(),
                              );
                              if (emptyIdx === -1) return prev;
                              const next = [...prev];
                              next[emptyIdx] = {
                                name: c,
                                rationale: next[emptyIdx]!.rationale,
                              };
                              return next;
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
                    {userProposedCriteria.filter((r) => r.name.trim()).length}/4
                    selected
                  </p>
                </div>
              ) : null}
              <div className="grid gap-4">
                {userProposedCriteria.map((row, idx) => {
                  const hasCandidates = Boolean(
                    exLevel.criteriaCandidates &&
                    exercise.criteriaCandidates &&
                    exercise.criteriaCandidates.length > 0,
                  );
                  if (hasCandidates && !row.name.trim()) return null;
                  const wordCount = row.rationale.trim()
                    ? row.rationale.trim().split(/\s+/).filter(Boolean).length
                    : 0;
                  return (
                    <div key={idx} className="grid gap-2">
                      {hasCandidates ? (
                        <p className="text-body font-medium">{row.name}</p>
                      ) : (
                        <Input
                          value={row.name}
                          placeholder={`Criterion ${idx + 1} name`}
                          maxLength={40}
                          onChange={(e) =>
                            setUserProposedCriteria((prev) => {
                              const next = [...prev];
                              next[idx] = {
                                ...next[idx]!,
                                name: e.target.value,
                              };
                              return next;
                            })
                          }
                        />
                      )}
                      <Textarea
                        value={row.rationale}
                        placeholder="Why it matters (up to ~500 words)"
                        rows={3}
                        maxLength={3000}
                        onChange={(e) =>
                          setUserProposedCriteria((prev) => {
                            const next = [...prev];
                            next[idx] = {
                              ...next[idx]!,
                              rationale: e.target.value,
                            };
                            return next;
                          })
                        }
                      />
                      <p
                        className={cn(
                          "text-right text-meta",
                          wordCount > 500
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {wordCount} / 500 words
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const updated = { ...exercise, currentStep: 1 as const };
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
                    const cleaned = userProposedCriteria
                      .map((c) => ({
                        name: c.name.trim(),
                        rationale: c.rationale.trim(),
                      }))
                      .filter((c) => c.name && c.rationale);
                    if (cleaned.length < 2) {
                      setError("Enter at least 2 criteria.");
                      return;
                    }
                    if (
                      cleaned.some(
                        (c) =>
                          c.rationale.split(/\s+/).filter(Boolean).length > 500,
                      )
                    ) {
                      setError("Keep each rationale to 500 words or fewer.");
                      return;
                    }
                    setError(null);
                    setCriteriaPhase("compare");
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
                    Your criteria
                  </p>
                  <ul className="space-y-2 text-body">
                    {userProposedCriteria
                      .map((c) => ({
                        name: c.name.trim(),
                        rationale: c.rationale.trim(),
                      }))
                      .filter((c) => c.name && c.rationale)
                      .map((c, i) => (
                        <li key={i}>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-muted-foreground text-meta">
                            {c.rationale}
                          </p>
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-2 text-meta font-medium uppercase">
                    AI framework
                  </p>
                  {exercise.variant === "matrix" ? (
                    <div className="space-y-2 text-body">
                      <div>
                        <p className="font-medium">X: {exercise.axisX.label}</p>
                        <p className="text-muted-foreground text-meta">
                          {exercise.axisX.lowLabel} → {exercise.axisX.highLabel}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Y: {exercise.axisY.label}</p>
                        <p className="text-muted-foreground text-meta">
                          {exercise.axisY.lowLabel} → {exercise.axisY.highLabel}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-2 text-body">
                      {exercise.criteria.map((c) => (
                        <li key={c.id}>
                          <p className="font-medium">{c.label}</p>
                          <p className="text-muted-foreground text-meta">
                            {c.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {criteriaFeedbackLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-body">
                  <InlineSpinner /> Getting AI feedback on your criteria…
                </div>
              ) : criteriaFeedback ? (
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-2 text-meta font-medium uppercase">
                    AI feedback on your criteria
                  </p>
                  <p className="text-body whitespace-pre-wrap">
                    {criteriaFeedback.text}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setCriteriaFeedback(null);
                    setCriteriaPhase("input");
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const cleaned = userProposedCriteria
                      .map((c) => ({
                        name: c.name.trim(),
                        rationale: c.rationale.trim(),
                      }))
                      .filter((c) => c.name && c.rationale);
                    const next: EvaluativeExerciseRow =
                      exercise.variant === "matrix"
                        ? {
                            ...exercise,
                            userProposedCriteria: cleaned,
                            currentStep: 2,
                          }
                        : {
                            ...exercise,
                            userProposedCriteria: cleaned,
                            currentStep: 2,
                          };
                    void putExercise(next);
                    setExercise(next);
                    setStep(2);
                  }}
                >
                  Continue to evaluate
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
