"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdaptiveSetupHint } from "@/components/adaptive/AdaptiveSetupHint";
import { ExerciseShell, SYSTEMS_EXERCISE_STEP_LABELS } from "@/components/shared/ExerciseShell";
import { SystemsFlowCanvas } from "@/components/exercises/SystemsFlowCanvas";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { AIPerspective } from "@/components/shared/AIPerspective";
import { Button, buttonVariants } from "@/components/ui/button";
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
import type {
  ConfidenceRecord,
  SystemsExerciseRow,
  SystemsNodeImpact,
  SystemsUserEdge,
} from "@/lib/types/exercise";
import type { SystemsConnectionType } from "@/lib/ai/validators/systems";
import type { JournalEntry } from "@/lib/types/journal";
import type { ActionBridge } from "@/lib/types/action";
import type { SystemsExercisePayload } from "@/lib/ai/validators/systems";
import { buildAdaptiveHintsForRequest } from "@/lib/adaptive/adaptive-hints";
import { putExercise } from "@/lib/db/exercises";
import { getUserContext } from "@/lib/db/settings";
import { completeExerciseFlow } from "@/lib/db/complete-exercise";
import {
  getPromptIdsUsedInLastNCompleted,
  getRecentJournalSnippetsForDomain,
} from "@/lib/db/journal";
import { pickJournalPrompts, type JournalPromptItem } from "@/lib/ai/prompts/journal-pool";
import { computeSystemsAccuracy } from "@/lib/analytics/calibration-systems";
import { currentIsoWeekKey } from "@/lib/db/actions";
import { aiFetch } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";

const DOMAINS = [
  "DevOps / SRE",
  "MLOps / Data Engineering",
  "Solution Architecture",
  "HPC",
  "Financial Planning",
  "Life Strategy",
  "Social & Communication",
  "Custom",
] as const;

const EDGE_TYPES: SystemsConnectionType[] = [
  "depends_on",
  "conflicts_with",
  "enables",
  "risks",
];

type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

function emptyImpact(nodeIds: string[]): Record<string, SystemsNodeImpact> {
  const o: Record<string, SystemsNodeImpact> = {};
  for (const id of nodeIds) o[id] = "none";
  return o;
}

function cycleImpact(v: SystemsNodeImpact): SystemsNodeImpact {
  if (v === "none") return "direct";
  if (v === "direct") return "indirect";
  return "none";
}

export function SystemsExerciseFlow() {
  const [step, setStep] = useState<FlowStep>(0);
  const [domainChoice, setDomainChoice] = useState<string>(DOMAINS[0]);
  const [customDomain, setCustomDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [exercise, setExercise] = useState<SystemsExerciseRow | null>(null);
  const [userEdges, setUserEdges] = useState<SystemsUserEdge[]>([]);
  const [nodeImpact, setNodeImpact] = useState<Record<string, SystemsNodeImpact>>({});

  const [confidence, setConfidence] = useState(50);
  const [perspectiveText, setPerspectiveText] = useState<string | null>(null);
  const [perspectiveStructured, setPerspectiveStructured] =
    useState<AIPerspectiveStructured | null>(null);

  const [journalPrompts, setJournalPrompts] = useState<JournalPromptItem[]>([]);
  const [journalAnswers, setJournalAnswers] = useState<Record<string, string>>({});
  const [aiRefLine, setAiRefLine] = useState<string | null>(null);
  const [journalPrimed, setJournalPrimed] = useState(false);

  const [actionText, setActionText] = useState("");

  const [emotionLabel, setEmotionLabel] = useState<
    "anxious" | "excited" | "frustrated" | "confident" | "uncertain" | "defensive" | "neutral"
  >("neutral");

  const effectiveDomain =
    domainChoice === "Custom" ? customDomain.trim() : domainChoice;

  const startGenerate = useCallback(async () => {
    setError(null);
    if (!effectiveDomain) {
      setError("Choose or enter a domain.");
      return;
    }
    setLoading(true);
    try {
      const userContext = await getUserContext();
      const adaptiveHints = await buildAdaptiveHintsForRequest("systems");
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: effectiveDomain,
          userContext: userContext || undefined,
          exerciseType: "systems",
          adaptiveHints,
        }),
      });
      const json = (await res.json()) as
        | { ok: true; data: SystemsExercisePayload }
        | { ok: false; error: string };
      if (!json.ok) {
        setError(json.error);
        return;
      }
      const data = json.data;
      const id = crypto.randomUUID();
      const ids = data.nodes.map((n) => n.id);
      const row: SystemsExerciseRow = {
        id,
        type: "systems",
        domain: effectiveDomain,
        title: data.title,
        scenario: data.scenario,
        nodes: data.nodes,
        intendedConnections: data.intendedConnections,
        shockEvent: data.shockEvent,
        userEdges: [],
        nodeImpact: emptyImpact(ids),
        confidenceBefore: null,
        aiPerspective: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      await putExercise(row);
      setExercise(row);
      setUserEdges([]);
      setNodeImpact(emptyImpact(ids));
      setPerspectiveText(null);
      setPerspectiveStructured(null);
      setJournalAnswers({});
      setAiRefLine(null);
      setJournalPrimed(false);
      setActionText("");
      setEmotionLabel("neutral");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  }, [effectiveDomain]);

  const setEdgeType = (edgeId: string, type: SystemsConnectionType) => {
    setUserEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, type } : e)),
    );
  };

  const submitShockPerspective = async () => {
    if (!exercise) return;
    setError(null);
    setLoading(true);
    try {
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "systems",
          title: exercise.title,
          domain: exercise.domain,
          scenario: exercise.scenario,
          nodes: exercise.nodes,
          intendedConnections: exercise.intendedConnections,
          shockEvent: exercise.shockEvent,
          userEdges,
          nodeImpact,
          confidenceBefore: confidence,
          userContext: userContext || undefined,
        }),
      });
      const json = await res.json();
      const parsed = parsePerspectiveFetchJson(json);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      setPerspectiveText(parsed.text);
      setPerspectiveStructured(parsed.structured);
      const partial: SystemsExerciseRow = {
        ...exercise,
        userEdges,
        nodeImpact,
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
    let cancelled = false;
    (async () => {
      try {
        const excluded = await getPromptIdsUsedInLastNCompleted(5);
        const picks = pickJournalPrompts(excluded);
        if (cancelled) return;
        setJournalPrompts(picks);
        const init: Record<string, string> = {};
        picks.forEach((p) => {
          init[p.id] = "";
        });
        setJournalAnswers(init);

        const snippets = await getRecentJournalSnippetsForDomain(
          exercise.domain,
          3,
        );
        if (snippets.length === 0) {
          setAiRefLine(null);
          setJournalPrimed(true);
          return;
        }
        const res = await aiFetch("/api/ai/journal-ref", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: exercise.domain, snippets }),
        });
        const j = (await res.json()) as { ok: true; line: string | null };
        if (!cancelled && j.ok && j.line) setAiRefLine(j.line);
      } catch {
        if (!cancelled) setAiRefLine(null);
      } finally {
        if (!cancelled) setJournalPrimed(true);
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
    const accuracy = computeSystemsAccuracy({
      intendedConnections: exercise.intendedConnections,
      userEdges,
      shock: exercise.shockEvent,
      nodeImpact,
    });
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
    const finalEx: SystemsExerciseRow = {
      ...exercise,
      userEdges,
      nodeImpact,
      confidenceBefore: confidence,
      aiPerspective: perspectiveText,
      aiPerspectiveStructured: perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null,
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

  return (
    <ExerciseShell stepIndex={step} stepLabels={SYSTEMS_EXERCISE_STEP_LABELS}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Systems exercise</CardTitle>
            <CardDescription>
              Map dependencies on a fixed canvas, then respond to a shock scenario.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Domain</Label>
              <Select
                value={domainChoice}
                onValueChange={(v) => setDomainChoice(v ?? DOMAINS[0])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {domainChoice === "Custom" ? (
                <Input
                  placeholder="Describe your domain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                />
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs">
              Personal context for AI is read from{" "}
              <Link href="/settings" className="underline">
                Settings
              </Link>
              .
            </p>
            <AdaptiveSetupHint exerciseType="systems" />
            <Button type="button" disabled={loading} onClick={() => void startGenerate()}>
              {loading ? "Generating…" : "Generate exercise"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>{exercise.title}</CardTitle>
            <CardDescription>Domain: {exercise.domain}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{exercise.scenario}</p>
            <SystemsFlowCanvas
              nodes={exercise.nodes}
              userEdges={userEdges}
              onUserEdgesChange={setUserEdges}
              mode="connect"
              nodeImpact={nodeImpact}
            />
            <p className="text-muted-foreground text-xs">
              Drag from one node&apos;s bottom handle to another&apos;s top handle. Max{" "}
              {20} edges. Select an edge and press Backspace to remove. Set each edge&apos;s
              type below.
            </p>
            {userEdges.length > 0 ? (
              <ul className="space-y-2 rounded-md border p-2 text-sm">
                {userEdges.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground font-mono text-xs">
                      {e.source} → {e.target}
                    </span>
                    <Select
                      value={e.type}
                      onValueChange={(v) => {
                        const t = v as SystemsConnectionType;
                        setEdgeType(e.id, t);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EDGE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setError(null);
                  if (userEdges.length < 1) {
                    setError("Add at least one connection before continuing.");
                    return;
                  }
                  void putExercise({ ...exercise, userEdges });
                  setExercise({ ...exercise, userEdges });
                  setStep(2);
                }}
              >
                Done connecting
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Confidence</CardTitle>
            <CardDescription>
              How confident are you in this map before the shock scenario reflection?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ConfidenceSlider value={confidence} onChange={setConfidence} />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                Continue to shock
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Shock scenario</CardTitle>
            <CardDescription>
              Click nodes to cycle: unaffected → directly affected (orange) → indirectly
              affected (red).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium">{exercise.shockEvent.description}</p>
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
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => void submitShockPerspective()}
              >
                {loading ? "Loading…" : "Submit impact and get AI reflection"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 && exercise && perspectiveText ? (
        <div className="space-y-4">
          <AIPerspective
            text={perspectiveText}
            structured={perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null}
            exerciseId={exercise.id}
            perspectiveKind="systems"
            exerciseTitle={exercise.title}
            domain={exercise.domain}
          />
          <Button type="button" onClick={() => setStep(5)}>
            Continue to journal
          </Button>
        </div>
      ) : null}

      {step === 5 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Metacognition journal</CardTitle>
            <CardDescription>
              Reflect on at least two prompts (more than 10 characters each).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!journalPrimed ? (
              <p className="text-muted-foreground text-sm">Preparing prompts…</p>
            ) : (
              <>
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
                  <p className="text-muted-foreground border-l-2 pl-3 text-sm italic">
                    {aiRefLine}
                  </p>
                ) : null}
                {journalPrompts.map((p) => (
                  <div key={p.id} className="grid gap-2">
                    <Label htmlFor={p.id}>{p.text}</Label>
                    <Textarea
                      id={p.id}
                      rows={3}
                      value={journalAnswers[p.id] ?? ""}
                      onChange={(e) =>
                        setJournalAnswers((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(4)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setError(null);
                      if (!journalValid()) {
                        setError("Need two answers with more than 10 characters.");
                        return;
                      }
                      setStep(6);
                    }}
                  >
                    Continue to action
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 6 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Action bridge</CardTitle>
            <CardDescription>
              One concrete action you will take in real life (at least 15 characters).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={3}
              placeholder="e.g. Schedule a dependency review with stakeholders."
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
            />
            <div className="flex gap-2">
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

      {step === 7 ? (
        <Card>
          <CardHeader>
            <CardTitle>Exercise saved</CardTitle>
            <CardDescription>
              Your responses, journal, and action are stored locally in IndexedDB.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "default" }),
                "inline-flex items-center justify-center",
              )}
            >
              Back to home
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                window.location.assign("/exercise/systems");
              }}
            >
              Start another
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </ExerciseShell>
  );
}
