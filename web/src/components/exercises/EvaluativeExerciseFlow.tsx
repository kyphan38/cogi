"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdaptiveSetupHint } from "@/components/adaptive/AdaptiveSetupHint";
import { ExerciseShell, EVALUATIVE_EXERCISE_STEP_LABELS } from "@/components/shared/ExerciseShell";
import { EvaluativeMatrixBoard } from "@/components/exercises/EvaluativeMatrixBoard";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { AIPerspective } from "@/components/shared/AIPerspective";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import type {
  ConfidenceRecord,
  EvaluativeExerciseRow,
  EvaluativeMatrixRow,
  EvaluativeQuadrant,
  EvaluativeScoringRow,
} from "@/lib/types/exercise";
import type { EvaluativeExercisePayload } from "@/lib/ai/validators/evaluative";
import type { JournalEntry } from "@/lib/types/journal";
import type { ActionBridge } from "@/lib/types/action";
import { buildAdaptiveHintsForRequest } from "@/lib/adaptive/adaptive-hints";
import { putExercise } from "@/lib/db/exercises";
import { getUserContext } from "@/lib/db/settings";
import { completeExerciseFlow } from "@/lib/db/complete-exercise";
import {
  getPromptIdsUsedInLastNCompleted,
  getRecentJournalSnippetsForDomain,
} from "@/lib/db/journal";
import { pickJournalPrompts, type JournalPromptItem } from "@/lib/ai/prompts/journal-pool";
import { computeEvaluativeAccuracy } from "@/lib/analytics/calibration-evaluative";
import { currentIsoWeekKey } from "@/lib/db/actions";
import { aiFetch } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import { DomainInput } from "@/components/shared/DomainInput";
import { listRecentDomains } from "@/lib/db/exercises";

type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

function payloadToRow(
  id: string,
  domain: string,
  data: EvaluativeExercisePayload,
): EvaluativeExerciseRow {
  if (data.variant === "matrix") {
    const row: EvaluativeMatrixRow = {
      id,
      type: "evaluative",
      variant: "matrix",
      domain,
      title: data.title,
      scenario: data.scenario,
      userProposedCriteria: null,
      axisX: data.axisX,
      axisY: data.axisY,
      options: data.options,
      placements: {},
      confidenceBefore: null,
      aiPerspective: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    return row;
  }
  const weights: Record<string, number> = {};
  const scores: Record<string, Record<string, number>> = {};
  for (const c of data.criteria) weights[c.id] = c.suggestedWeight;
  for (const o of data.options) {
    scores[o.id] = { ...o.suggestedScores };
  }
  const row: EvaluativeScoringRow = {
    id,
    type: "evaluative",
    variant: "scoring",
    domain,
    title: data.title,
    scenario: data.scenario,
    userProposedCriteria: null,
    criteria: data.criteria,
    options: data.options,
    hiddenCriteria: data.hiddenCriteria,
    criterionWeights: weights,
    scores,
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  return row;
}

export function EvaluativeExerciseFlow() {
  const [step, setStep] = useState<FlowStep>(0);
  const [domain, setDomain] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [exercise, setExercise] = useState<EvaluativeExerciseRow | null>(null);
  const [placements, setPlacements] = useState<Partial<Record<string, EvaluativeQuadrant>>>({});
  const [criterionWeights, setCriterionWeights] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [userProposedCriteria, setUserProposedCriteria] = useState<
    { name: string; rationale: string }[]
  >(() => Array.from({ length: 4 }, () => ({ name: "", rationale: "" })));
  const [criteriaPhase, setCriteriaPhase] = useState<"input" | "compare">("input");

  const [confidence, setConfidence] = useState(50);
  const [perspectiveText, setPerspectiveText] = useState<string | null>(null);
  const [perspectiveStructured, setPerspectiveStructured] =
    useState<AIPerspectiveStructured | null>(null);

  const [journalPrompts, setJournalPrompts] = useState<JournalPromptItem[]>([]);
  const [journalAnswers, setJournalAnswers] = useState<Record<string, string>>({});
  const [aiRefLine, setAiRefLine] = useState<string | null>(null);
  const [journalPrimed, setJournalPrimed] = useState(false);
  const journalEffectIdRef = useRef(0);

  const [actionText, setActionText] = useState("");

  const [emotionLabel, setEmotionLabel] = useState<
    "anxious" | "excited" | "frustrated" | "confident" | "uncertain" | "defensive" | "neutral"
  >("neutral");

  useEffect(() => {
    void listRecentDomains(20).then(setDomainSuggestions);
  }, []);

  const startGenerate = useCallback(async () => {
    setError(null);
    const d = domain.trim();
    if (!d) {
      setError("Enter a domain.");
      return;
    }
    setLoading(true);
    try {
      const userContext = await getUserContext();
      const adaptiveHints = await buildAdaptiveHintsForRequest("evaluative");
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: d,
          userContext: userContext || undefined,
          exerciseType: "evaluative",
          adaptiveHints,
        }),
      });
      const json = (await res.json()) as
        | { ok: true; data: EvaluativeExercisePayload }
        | { ok: false; error: string };
      if (!json.ok) {
        setError(json.error);
        return;
      }
      const id = crypto.randomUUID();
      const row = payloadToRow(id, d, json.data);
      await putExercise(row);
      setExercise(row);
      if (row.variant === "matrix") {
        setPlacements({});
      } else {
        const w: Record<string, number> = {};
        const s: Record<string, Record<string, number>> = {};
        for (const c of row.criteria) w[c.id] = c.suggestedWeight;
        for (const o of row.options) s[o.id] = { ...o.suggestedScores };
        setCriterionWeights(w);
        setScores(s);
      }
      setPerspectiveText(null);
      setPerspectiveStructured(null);
      setJournalAnswers({});
      setAiRefLine(null);
      setJournalPrimed(false);
      setActionText("");
      setEmotionLabel("neutral");
      setUserProposedCriteria(Array.from({ length: 4 }, () => ({ name: "", rationale: "" })));
      setCriteriaPhase("input");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  const regenerate = () => {
    if (Object.keys(placements).length > 0) {
      const ok = window.confirm("Discard current work and regenerate?");
      if (!ok) return;
    }
    setError(null);
    void startGenerate();
  };

  const mergedMatrixExercise = (): EvaluativeMatrixRow | null => {
    if (!exercise || exercise.variant !== "matrix") return null;
    return { ...exercise, placements };
  };

  const mergedScoringExercise = (): EvaluativeScoringRow | null => {
    if (!exercise || exercise.variant !== "scoring") return null;
    return { ...exercise, criterionWeights, scores };
  };

  const matrixReady = () => {
    const ex = mergedMatrixExercise();
    if (!ex) return false;
    return ex.options.every((o) => placements[o.id] != null);
  };

  const submitPerspective = async () => {
    const ex = exercise;
    if (!ex) return;
    if (perspectiveText != null) {
      setStep(4);
      return;
    }
    if (ex.variant === "matrix" && !matrixReady()) {
      setError("Place every option in a quadrant.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const userContext = await getUserContext();
      const kind =
        ex.variant === "matrix" ? "evaluative-matrix" : "evaluative-scoring";
      const body =
        ex.variant === "matrix"
          ? {
              kind,
              title: ex.title,
              domain: ex.domain,
              confidenceBefore: confidence,
              exercise: mergedMatrixExercise(),
              userContext: userContext || undefined,
            }
          : {
              kind,
              title: ex.title,
              domain: ex.domain,
              confidenceBefore: confidence,
              exercise: mergedScoringExercise(),
              userContext: userContext || undefined,
            };
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await res.json();
      const parsed = parsePerspectiveFetchJson(raw);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      setPerspectiveText(parsed.text);
      setPerspectiveStructured(parsed.structured);
      const partial: EvaluativeExerciseRow =
        ex.variant === "matrix"
          ? {
              ...ex,
              placements,
              confidenceBefore: confidence,
              aiPerspective: parsed.text,
              aiPerspectiveStructured: parsed.structured,
            }
          : {
              ...ex,
              criterionWeights,
              scores,
              confidenceBefore: confidence,
              aiPerspective: parsed.text,
              aiPerspectiveStructured: parsed.structured,
            };
      await putExercise(partial);
      setExercise(partial);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perspective failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 5 || journalPrimed || !exercise) return;
    const effectId = ++journalEffectIdRef.current;
    let cancelled = false;
    void (async () => {
      try {
        const excluded = await getPromptIdsUsedInLastNCompleted(5);
        const forAccuracy: EvaluativeExerciseRow =
          exercise.variant === "matrix"
            ? { ...exercise, placements }
            : { ...exercise, criterionWeights, scores };
        const accuracy = computeEvaluativeAccuracy(forAccuracy);
        const picks = pickJournalPrompts(excluded, {
          exerciseType: "evaluative",
          accuracy,
          confidenceBefore: confidence,
          overconfident: confidence - accuracy > 20,
          underconfident: accuracy - confidence > 20,
        });
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        setJournalPrompts(picks);
        const init: Record<string, string> = {};
        picks.forEach((p) => {
          init[p.id] = "";
        });
        setJournalAnswers(init);
        setJournalPrimed(true);

        const snippets = await getRecentJournalSnippetsForDomain(exercise.domain, 3);
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        if (snippets.length === 0) {
          setAiRefLine(null);
          return;
        }
        const res = await aiFetch("/api/ai/journal-ref", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            domain: exercise.domain,
            snippets,
          }),
        });
        const j = (await res.json()) as { ok: true; line: string | null };
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        if (j.ok && j.line) setAiRefLine(j.line);
      } catch {
        if (!cancelled && effectId === journalEffectIdRef.current) setAiRefLine(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, journalPrimed, exercise]);

  const journalValid = () => {
    const vals = Object.values(journalAnswers);
    const long = vals.filter((v) => v.trim().length > 10);
    return long.length >= 2;
  };

  const weightedRowTotal = (optionId: string) => {
    const ex = exercise;
    if (!ex || ex.variant !== "scoring") return 0;
    let num = 0;
    let den = 0;
    for (const c of ex.criteria) {
      const w = criterionWeights[c.id] ?? 1;
      const s = scores[optionId]?.[c.id] ?? 3;
      num += w * s;
      den += w;
    }
    if (den === 0) return 0;
    return num / den;
  };

  const finishExercise = async () => {
    if (!exercise || !perspectiveText) return;
    if (!journalValid()) {
      setError("Answer at least two prompts with more than 10 characters each.");
      return;
    }
    if (actionText.trim().length < 15) {
      setError("Action must be at least 15 characters.");
      return;
    }
    setError(null);
    const forAccuracy: EvaluativeExerciseRow =
      exercise.variant === "matrix"
        ? { ...exercise, placements }
        : { ...exercise, criterionWeights, scores };
    const accuracy = computeEvaluativeAccuracy(forAccuracy);
    const confidenceRecord: ConfidenceRecord = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      confidenceBefore: confidence,
      actualAccuracy: accuracy,
      gap: confidence - accuracy,
      createdAt: new Date().toISOString(),
    };
    const journalEntry: JournalEntry = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      promptIds: journalPrompts.map((p) => p.id),
      aiReferenceLine: aiRefLine,
      responses: { ...journalAnswers },
      emotionLabel,
      createdAt: new Date().toISOString(),
    };
    const action: ActionBridge = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      oneAction: actionText.trim(),
      weeklyFollowThrough: [{ weekKey: currentIsoWeekKey(), done: false }],
      createdAt: new Date().toISOString(),
    };
    const struct =
      perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null;
    const finalEx: EvaluativeExerciseRow =
      exercise.variant === "matrix"
        ? {
            ...exercise,
            placements,
            confidenceBefore: confidence,
            aiPerspective: perspectiveText,
            aiPerspectiveStructured: struct,
            completedAt: new Date().toISOString(),
          }
        : {
            ...exercise,
            criterionWeights,
            scores,
            confidenceBefore: confidence,
            aiPerspective: perspectiveText,
            aiPerspectiveStructured: struct,
            completedAt: new Date().toISOString(),
          };
    try {
      await completeExerciseFlow({
        exercise: finalEx,
        journal: journalEntry,
        confidence: confidenceRecord,
        action,
      });
      setExercise(finalEx);
      setStep(7);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const shellStep = step;

  return (
    <ExerciseShell stepIndex={shellStep} stepLabels={EVALUATIVE_EXERCISE_STEP_LABELS}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          {step === 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => {
                setError(null);
                void startGenerate();
              }}
            >
              Retry
            </Button>
          ) : null}
        </Alert>
      ) : null}

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Evaluative exercise</CardTitle>
            <CardDescription>
              AI picks a 2×2 matrix (two criteria) or a weighted scoring table (three or more
              criteria). Then you compare with the model’s framing.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Domain</Label>
              <DomainInput value={domain} onChange={setDomain} suggestions={domainSuggestions} />
            </div>
            <p className="text-muted-foreground text-xs">
              Personal context for AI is read from{" "}
              <Link href="/settings" className="underline">
                Settings
              </Link>
              .
            </p>
            <AdaptiveSetupHint exerciseType="evaluative" />
            <Button type="button" disabled={loading} onClick={() => void startGenerate()}>
              {loading ? (
                <>
                  <InlineSpinner /> Generating…
                </>
              ) : (
                "Generate exercise"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>{exercise.title}</CardTitle>
            <CardDescription className="leading-relaxed">{exercise.scenario}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Options</h3>
              <ul className="space-y-2 text-sm">
                {exercise.options.map((o) => (
                  <li key={o.id} className="rounded-md border bg-muted/10 p-2">
                    <p className="font-medium">{o.title}</p>
                    <p className="text-muted-foreground text-xs">{o.description}</p>
                  </li>
                ))}
              </ul>
            </div>

            {criteriaPhase === "input" ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  What 2–4 criteria would you use to evaluate these options? For each, give a short
                  name and one sentence explaining why it matters.
                </p>
                <div className="grid gap-3">
                  {userProposedCriteria.map((row, idx) => (
                    <div key={idx} className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={row.name}
                        placeholder={`Criterion ${idx + 1} name`}
                        maxLength={40}
                        onChange={(e) =>
                          setUserProposedCriteria((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx]!, name: e.target.value };
                            return next;
                          })
                        }
                      />
                      <Input
                        value={row.rationale}
                        placeholder="Why it matters (1 sentence)"
                        maxLength={120}
                        onChange={(e) =>
                          setUserProposedCriteria((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx]!, rationale: e.target.value };
                            return next;
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const cleaned = userProposedCriteria
                        .map((c) => ({ name: c.name.trim(), rationale: c.rationale.trim() }))
                        .filter((c) => c.name && c.rationale);
                      if (cleaned.length < 2) {
                        setError("Enter at least 2 criteria.");
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
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                      Your criteria
                    </p>
                    <ul className="space-y-2 text-sm">
                      {userProposedCriteria
                        .map((c) => ({ name: c.name.trim(), rationale: c.rationale.trim() }))
                        .filter((c) => c.name && c.rationale)
                        .map((c, i) => (
                          <li key={i}>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-muted-foreground text-xs">{c.rationale}</p>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                      AI framework
                    </p>
                    {exercise.variant === "matrix" ? (
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="font-medium">X: {exercise.axisX.label}</p>
                          <p className="text-muted-foreground text-xs">
                            {exercise.axisX.lowLabel} → {exercise.axisX.highLabel}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Y: {exercise.axisY.label}</p>
                          <p className="text-muted-foreground text-xs">
                            {exercise.axisY.lowLabel} → {exercise.axisY.highLabel}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {exercise.criteria.map((c) => (
                          <li key={c.id}>
                            <p className="font-medium">{c.label}</p>
                            <p className="text-muted-foreground text-xs">{c.description}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setCriteriaPhase("input")}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const cleaned = userProposedCriteria
                        .map((c) => ({ name: c.name.trim(), rationale: c.rationale.trim() }))
                        .filter((c) => c.name && c.rationale);
                      const next: EvaluativeExerciseRow =
                        exercise.variant === "matrix"
                          ? { ...exercise, userProposedCriteria: cleaned }
                          : { ...exercise, userProposedCriteria: cleaned };
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
      ) : null}

      {step === 2 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>{exercise.title}</CardTitle>
            <CardDescription className="leading-relaxed">{exercise.scenario}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {exercise.variant === "matrix" ? (
              <EvaluativeMatrixBoard
                axisX={exercise.axisX}
                axisY={exercise.axisY}
                options={exercise.options}
                placements={placements}
                onPlacementsChange={setPlacements}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border p-2 text-left">Option</th>
                      {exercise.criteria.map((c) => (
                        <th key={c.id} className="border p-2 text-left align-bottom">
                          <div className="font-medium">{c.label}</div>
                          <p className="text-muted-foreground mt-1 text-xs font-normal">
                            {c.description}
                          </p>
                          <div className="mt-2 text-xs">Weight (1–5)</div>
                          <Slider
                            min={1}
                            max={5}
                            value={[criterionWeights[c.id] ?? 3]}
                            onValueChange={(v) => {
                              const n = Array.isArray(v) ? (v[0] ?? 3) : v;
                              setCriterionWeights((prev) => ({
                                ...prev,
                                [c.id]: n,
                              }));
                            }}
                            className="mt-2 w-full"
                          />
                          <span className="text-muted-foreground text-xs">
                            AI suggested: {c.suggestedWeight}
                          </span>
                        </th>
                      ))}
                      <th className="border p-2 text-right">Weighted avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercise.options.map((o) => (
                      <tr key={o.id}>
                        <td className="border p-2 align-top">
                          <p className="font-medium">{o.title}</p>
                          <p className="text-muted-foreground text-xs">{o.description}</p>
                        </td>
                        {exercise.criteria.map((c) => (
                          <td key={c.id} className="border p-2 align-top">
                            <div className="text-xs">Score (1–5)</div>
                            <Slider
                              min={1}
                              max={5}
                              value={[scores[o.id]?.[c.id] ?? 3]}
                              onValueChange={(v) => {
                                const n = Array.isArray(v) ? (v[0] ?? 3) : v;
                                setScores((prev) => ({
                                  ...prev,
                                  [o.id]: { ...prev[o.id], [c.id]: n },
                                }));
                              }}
                              className="mt-2 w-full"
                            />
                            <span className="text-muted-foreground text-xs">
                              AI: {o.suggestedScores[c.id]}
                            </span>
                          </td>
                        ))}
                        <td className="border p-2 text-right font-medium">
                          {weightedRowTotal(o.id).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button type="button" variant="secondary" onClick={regenerate}>
                Regenerate
              </Button>
              <Button
                type="button"
                onClick={() => setStep(3)}
                disabled={exercise.variant === "matrix" && !matrixReady()}
              >
                Continue to confidence
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Confidence</CardTitle>
            <CardDescription>
              How confident are you that your evaluation matches strong judgment (before the
              detailed AI comparison)?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConfidenceSlider
              value={confidence}
              onChange={setConfidence}
              label="How confident are you in your evaluation?"
            />
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button type="button" disabled={loading} onClick={() => void submitPerspective()}>
                {loading ? (
                  <>
                    <InlineSpinner /> Loading…
                  </>
                ) : (
                  "Show AI perspective"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 && exercise && perspectiveText ? (
        <Card>
          <CardHeader>
            <CardTitle>AI perspective</CardTitle>
            <CardDescription>Collaborative comparison — not a numeric grade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AIPerspective
              text={perspectiveText}
              structured={perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null}
              exerciseId={exercise.id}
              perspectiveKind={
                exercise.variant === "matrix" ? "evaluative-matrix" : "evaluative-scoring"
              }
              exerciseTitle={exercise.title}
              domain={exercise.domain}
            />
            <Button type="button" onClick={() => setStep(5)}>
              Continue to journal
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 5 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Journal</CardTitle>
            <CardDescription>
              Reflect on how you weighed trade-offs. At least two answers need more than 10
              characters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>What emotion might be influencing your thinking right now?</Label>
              <Select
                value={emotionLabel}
                onValueChange={(v) =>
                  setEmotionLabel(
                    (v as
                      | "anxious"
                      | "excited"
                      | "frustrated"
                      | "confident"
                      | "uncertain"
                      | "defensive"
                      | "neutral") ?? "neutral",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anxious">Anxious</SelectItem>
                  <SelectItem value="excited">Excited</SelectItem>
                  <SelectItem value="frustrated">Frustrated</SelectItem>
                  <SelectItem value="confident">Confident</SelectItem>
                  <SelectItem value="uncertain">Uncertain</SelectItem>
                  <SelectItem value="defensive">Defensive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {aiRefLine ? (
              <p className="text-muted-foreground border-l-2 pl-3 text-sm italic">{aiRefLine}</p>
            ) : null}
            {journalPrompts.map((p) => (
              <div key={p.id} className="grid gap-2">
                <Label>{p.text}</Label>
                <Textarea
                  value={journalAnswers[p.id] ?? ""}
                  onChange={(e) =>
                    setJournalAnswers((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => setStep(4)}>
              Back
            </Button>
            <Button type="button" onClick={() => setStep(6)}>
              Continue to action
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 6 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Action bridge</CardTitle>
            <CardDescription>One concrete action you will take (min. 15 characters).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              rows={3}
              placeholder="e.g. I will revisit the weight on risk next sprint planning…"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(5)}>
                Back
              </Button>
              <Button type="button" onClick={() => void finishExercise()}>
                Finish exercise
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 7 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Exercise saved</CardTitle>
            <CardDescription>Saved to your account (Firebase) in exercise history.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/" className={cn(buttonVariants({ variant: "secondary" }))}>
              Home
            </Link>
            <Link href="/exercise/history" className={cn(buttonVariants({ variant: "outline" }))}>
              History
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </ExerciseShell>
  );
}
