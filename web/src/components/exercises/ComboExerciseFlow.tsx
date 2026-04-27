"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExerciseShell } from "@/components/shared/ExerciseShell";
import { HighlightTag } from "@/components/exercises/HighlightTag";
import { SystemsFlowCanvas } from "@/components/exercises/SystemsFlowCanvas";
import { EvaluativeMatrixBoard } from "@/components/exercises/EvaluativeMatrixBoard";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
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
import type {
  AnalyticalExerciseRow,
  ComboExerciseRow,
  ComboPresetId,
  ComboSubExercise,
  ConfidenceRecord,
  EvaluativeMatrixRow,
  EvaluativeQuadrant,
  GenerativeExerciseRow,
  SequentialExerciseRow,
  SystemsExerciseRow,
  SystemsNodeImpact,
  SystemsUserEdge,
  UserHighlight,
} from "@/lib/types/exercise";
import type { JournalEntry } from "@/lib/types/journal";
import type { ActionBridge } from "@/lib/types/action";
import type { ComboBundle } from "@/lib/ai/validators/combo-bundle";
import { getUserContext } from "@/lib/db/settings";
import { completeExerciseFlow } from "@/lib/db/complete-exercise";
import {
  getPromptIdsUsedInLastNCompleted,
  getRecentJournalSnippetsForDomain,
} from "@/lib/db/journal";
import { pickJournalPrompts, type JournalPromptItem } from "@/lib/ai/prompts/journal-pool";
import { computeAnalyticalAccuracy } from "@/lib/analytics/calibration-analytical";
import { aiFetch } from "@/lib/api/ai-fetch";
import { computeSequentialAccuracy } from "@/lib/analytics/calibration-sequential";
import { computeSystemsAccuracy } from "@/lib/analytics/calibration-systems";
import { computeEvaluativeMatrixAccuracy } from "@/lib/analytics/calibration-evaluative";
import { generativeRubricToAccuracy } from "@/lib/analytics/calibration-generative";
import { currentIsoWeekKey } from "@/lib/db/actions";
import type { SystemsConnectionType } from "@/lib/ai/validators/systems";
import { DomainInput } from "@/components/shared/DomainInput";
import { listRecentDomains } from "@/lib/db/exercises";

function shuffleIds(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

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

type Phase = "pick" | "work" | "journal" | "done";

export function ComboExerciseFlow() {
  const [domain, setDomain] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [preset, setPreset] = useState<ComboPresetId>("full_analysis");
  const [bundle, setBundle] = useState<ComboBundle | null>(null);
  const [comboId, setComboId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [mechStep, setMechStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [seqOrder, setSeqOrder] = useState<string[]>([]);
  const [userEdges, setUserEdges] = useState<SystemsUserEdge[]>([]);
  const [nodeImpact, setNodeImpact] = useState<Record<string, SystemsNodeImpact>>({});
  const [placements, setPlacements] = useState<Partial<Record<string, EvaluativeQuadrant>>>({});
  const [genAnswers, setGenAnswers] = useState<Record<string, string>>({});
  const [systemsPhase, setSystemsPhase] = useState<"connect" | "shock">("connect");

  const [comboConfidence, setComboConfidence] = useState(50);
  const [journalPrompts, setJournalPrompts] = useState<JournalPromptItem[]>([]);
  const [journalAnswers, setJournalAnswers] = useState<Record<string, string>>({});
  const [aiRefLine, setAiRefLine] = useState<string | null>(null);
  const [journalPrimed, setJournalPrimed] = useState(false);
  const journalEffectIdRef = useRef(0);
  const [emotionLabel, setEmotionLabel] = useState<
    "anxious" | "excited" | "frustrated" | "confident" | "uncertain" | "defensive" | "neutral"
  >("neutral");
  const [actionText, setActionText] = useState("");

  useEffect(() => {
    void listRecentDomains(20).then(setDomainSuggestions);
  }, []);

  const mechCount = bundle
    ? bundle.preset === "decision_sprint"
      ? 2
      : 3
    : 0;

  const resetWorkState = () => {
    setHighlights([]);
    setSeqOrder([]);
    setUserEdges([]);
    setNodeImpact({});
    setPlacements({});
    setGenAnswers({});
    setMechStep(0);
    setSystemsPhase("connect");
  };

  useEffect(() => {
    setSystemsPhase("connect");
  }, [mechStep]);

  const generateBundle = useCallback(async () => {
    setError(null);
    const d = domain.trim();
    if (!d) {
      setError("Enter a domain.");
      return;
    }
    setLoading(true);
    try {
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/combo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          preset,
          domain: d,
          userContext: userContext || undefined,
        }),
      });
      const json = (await res.json()) as { ok: true; data: ComboBundle } | { ok: false; error: string };
      if (!json.ok) {
        setError(json.error);
        return;
      }
      const id = crypto.randomUUID();
      setComboId(id);
      setBundle(json.data);
      resetWorkState();
      if (json.data.preset === "root_cause") {
        setSeqOrder(shuffleIds(json.data.sequential.steps.map((s) => s.id)));
      }
      if (json.data.preset === "full_analysis" || json.data.preset === "root_cause") {
        const nodes = json.data.systems.nodes;
        setNodeImpact(emptyImpact(nodes.map((n) => n.id)));
      }
      setPhase("work");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Combo generate failed");
    } finally {
      setLoading(false);
    }
  }, [domain, preset]);

  const regenerate = () => {
    const dirty =
      highlights.length > 0 ||
      seqOrder.length > 0 ||
      userEdges.length > 0 ||
      Object.keys(placements).length > 0 ||
      Object.values(genAnswers).some((t) => t.trim().length > 0);
    if (dirty) {
      const ok = window.confirm("Discard current work and regenerate?");
      if (!ok) return;
    }
    setError(null);
    void generateBundle();
  };

  const analyticalSource = useMemo((): AnalyticalExerciseRow | null => {
    if (!bundle || !comboId) return null;
    const a =
      bundle.preset === "full_analysis"
        ? bundle.analytical
        : bundle.preset === "root_cause"
          ? bundle.analytical
          : null;
    if (!a) return null;
    return {
      id: `${comboId}-analytical`,
      type: "analytical",
      domain: domain.trim(),
      source: "ai",
      title: a.title,
      passage: bundle.sharedScenario,
      embeddedIssues: a.embeddedIssues,
      validPoints: a.validPoints,
      userHighlights: highlights,
      confidenceBefore: null,
      aiPerspective: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
  }, [bundle, comboId, domain, highlights]);

  const systemsSource = useMemo((): SystemsExerciseRow | null => {
    if (!bundle || !comboId) return null;
    if (bundle.preset === "decision_sprint") return null;
    const s = bundle.systems;
    return {
      id: `${comboId}-systems`,
      type: "systems",
      domain: domain.trim(),
      title: s.title,
      scenario: bundle.sharedScenario,
      nodes: s.nodes,
      intendedConnections: s.intendedConnections,
      shockEvent: s.shockEvent,
      userEdges,
      nodeImpact,
      confidenceBefore: null,
      aiPerspective: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
  }, [bundle, comboId, domain, userEdges, nodeImpact]);

  const matrixSource = useMemo((): EvaluativeMatrixRow | null => {
    if (!bundle || !comboId) return null;
    const m =
      bundle.preset === "full_analysis"
        ? bundle.evaluativeMatrix
        : bundle.preset === "decision_sprint"
          ? bundle.evaluativeMatrix
          : null;
    if (!m) return null;
    return {
      id: `${comboId}-matrix`,
      type: "evaluative",
      variant: "matrix",
      domain: domain.trim(),
      title: m.title,
      scenario: bundle.sharedScenario,
      axisX: m.axisX,
      axisY: m.axisY,
      options: m.options,
      placements,
      confidenceBefore: null,
      aiPerspective: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
  }, [bundle, comboId, domain, placements]);

  const sequentialSource = useMemo((): SequentialExerciseRow | null => {
    if (!bundle || bundle.preset !== "root_cause" || !comboId) return null;
    const s = bundle.sequential;
    return {
      id: `${comboId}-sequential`,
      type: "sequential",
      domain: domain.trim(),
      title: s.title,
      scenario: bundle.sharedScenario,
      steps: s.steps,
      criticalErrors: s.criticalErrors,
      userOrderedStepIds: seqOrder,
      confidenceBefore: null,
      aiPerspective: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
  }, [bundle, comboId, domain, seqOrder]);

  const generativeSource = useMemo((): GenerativeExerciseRow | null => {
    if (!bundle || bundle.preset !== "decision_sprint" || !comboId) return null;
    const g = bundle.generative;
    const prompts = g.prompts.map((p) => ({
      id: p.id,
      question: p.question,
      draftText: p.draftText,
      hints: p.hints,
      spareHint: p.spareHint,
    }));
    return {
      id: `${comboId}-generative`,
      type: "generative",
      domain: domain.trim(),
      title: g.title,
      scenario: bundle.sharedScenario,
      stageAtStart: "independent",
      prompts,
      answers: genAnswers,
      draftBaseline: {},
      debateOpening: null,
      debateTurns: [],
      rubricScore: null,
      confidenceBefore: null,
      aiPerspective: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
  }, [bundle, comboId, domain, genAnswers]);

  const moveSeq = (idx: number, dir: -1 | 1) => {
    setSeqOrder((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j]!, next[idx]!];
      return next;
    });
  };

  const nextMechanic = () => {
    setError(null);
    if (!bundle) return;
    if (bundle.preset === "full_analysis") {
      if (mechStep === 0 && highlights.length < 1) {
        setError("Add at least one highlight before continuing.");
        return;
      }
      if (mechStep === 1) {
        if (systemsPhase === "connect") {
          if (userEdges.length < 1) {
            setError("Draw at least one connection before continuing.");
            return;
          }
          setSystemsPhase("shock");
          return;
        }
      }
      if (mechStep === 2) {
        const m = matrixSource;
        if (!m || Object.keys(placements).length < m.options.length) {
          setError("Place every option on the matrix before continuing.");
          return;
        }
      }
    } else if (bundle.preset === "decision_sprint") {
      if (mechStep === 0) {
        const m = matrixSource;
        if (!m || Object.keys(placements).length < m.options.length) {
          setError("Place every option on the matrix before continuing.");
          return;
        }
      } else {
        const filled = Object.values(genAnswers).filter((t) => t.trim().length > 20);
        if (filled.length < 2) {
          setError("Answer at least two generative prompts with 20+ characters each.");
          return;
        }
      }
    } else {
      if (mechStep === 0 && seqOrder.length < 1) {
        setError("Order the steps.");
        return;
      }
      if (mechStep === 1) {
        if (systemsPhase === "connect") {
          if (userEdges.length < 1) {
            setError("Draw at least one connection before continuing.");
            return;
          }
          setSystemsPhase("shock");
          return;
        }
      }
      if (mechStep === 2 && highlights.length < 1) {
        setError("Add at least one highlight before continuing.");
        return;
      }
    }
    if (mechStep + 1 >= mechCount) {
      setPhase("journal");
      setJournalPrimed(false);
      return;
    }
    setMechStep((s) => s + 1);
  };

  useEffect(() => {
    if (phase !== "journal" || journalPrimed || !bundle || !comboId) return;
    const d = domain.trim();
    if (!d) return;
    const effectId = ++journalEffectIdRef.current;
    let cancelled = false;
    void (async () => {
      try {
        const excluded = await getPromptIdsUsedInLastNCompleted(5);
        const accuracies: number[] = [];
        if (bundle.preset === "full_analysis") {
          if (analyticalSource) {
            accuracies.push(
              computeAnalyticalAccuracy(
                analyticalSource.passage,
                analyticalSource.embeddedIssues,
                analyticalSource.validPoints,
                highlights,
                analyticalSource.isSoundReasoning === true,
              ),
            );
          }
          if (systemsSource) {
            accuracies.push(
              computeSystemsAccuracy({
                intendedConnections: systemsSource.intendedConnections,
                userEdges,
                shock: systemsSource.shockEvent,
                nodeImpact,
              }),
            );
          }
          if (matrixSource) {
            accuracies.push(computeEvaluativeMatrixAccuracy({ ...matrixSource, placements }));
          }
        } else if (bundle.preset === "decision_sprint") {
          if (matrixSource) {
            accuracies.push(computeEvaluativeMatrixAccuracy({ ...matrixSource, placements }));
          }
          const gFilled = Object.values(genAnswers).filter((t) => t.trim().length > 20).length;
          if (gFilled > 0) {
            accuracies.push(generativeRubricToAccuracy(50));
          }
        } else {
          if (sequentialSource) {
            accuracies.push(computeSequentialAccuracy(sequentialSource.steps, seqOrder));
          }
          if (systemsSource) {
            accuracies.push(
              computeSystemsAccuracy({
                intendedConnections: systemsSource.intendedConnections,
                userEdges,
                shock: systemsSource.shockEvent,
                nodeImpact,
              }),
            );
          }
          if (analyticalSource) {
            accuracies.push(
              computeAnalyticalAccuracy(
                analyticalSource.passage,
                analyticalSource.embeddedIssues,
                analyticalSource.validPoints,
                highlights,
                analyticalSource.isSoundReasoning === true,
              ),
            );
          }
        }
        const accuracy =
          accuracies.length > 0
            ? Math.round(accuracies.reduce((s, n) => s + n, 0) / accuracies.length)
            : undefined;
        const picks = pickJournalPrompts(excluded, {
          exerciseType: "combo",
          accuracy,
          confidenceBefore: comboConfidence,
          overconfident: accuracy != null ? comboConfidence - accuracy > 20 : undefined,
          underconfident: accuracy != null ? accuracy - comboConfidence > 20 : undefined,
        });
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        setJournalPrompts(picks);
        const init: Record<string, string> = {};
        picks.forEach((p) => {
          init[p.id] = "";
        });
        setJournalAnswers(init);
        setJournalPrimed(true);
        const snippets = await getRecentJournalSnippetsForDomain(d, 3);
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
            domain: d,
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
  }, [phase, journalPrimed, bundle, comboId, domain]);

  const journalValid = () => {
    const vals = Object.values(journalAnswers);
    const long = vals.filter((v) => v.trim().length > 10);
    return long.length >= 2;
  };

  const finishCombo = async () => {
    if (!bundle || !comboId) return;
    if (!journalValid()) {
      setError("Answer at least two journal prompts with more than 10 characters each.");
      return;
    }
    if (actionText.trim().length < 15) {
      setError("Action must be at least 15 characters.");
      return;
    }
    setError(null);
    const now = new Date().toISOString();
    const subs: ComboSubExercise[] = [];
    let accs: number[] = [];

    if (bundle.preset === "full_analysis") {
      const a: AnalyticalExerciseRow = {
        ...analyticalSource!,
        userHighlights: highlights,
      };
      const sys: SystemsExerciseRow = { ...systemsSource!, userEdges, nodeImpact };
      const ev: EvaluativeMatrixRow = { ...matrixSource!, placements };
      subs.push(a, sys, ev);
      accs = [
        computeAnalyticalAccuracy(a.passage, a.embeddedIssues, a.validPoints, highlights),
        computeSystemsAccuracy({
          intendedConnections: sys.intendedConnections,
          userEdges,
          shock: sys.shockEvent,
          nodeImpact,
        }),
        computeEvaluativeMatrixAccuracy(ev),
      ];
    } else if (bundle.preset === "decision_sprint") {
      const ev: EvaluativeMatrixRow = { ...matrixSource!, placements };
      const g: GenerativeExerciseRow = { ...generativeSource! };
      subs.push(ev, g);
      accs = [computeEvaluativeMatrixAccuracy(ev), generativeRubricToAccuracy(50)];
    } else {
      const seq: SequentialExerciseRow = { ...sequentialSource! };
      const sys: SystemsExerciseRow = { ...systemsSource!, userEdges, nodeImpact };
      const a: AnalyticalExerciseRow = { ...analyticalSource!, userHighlights: highlights };
      subs.push(seq, sys, a);
      accs = [
        computeSequentialAccuracy(seq.steps, seqOrder),
        computeSystemsAccuracy({
          intendedConnections: sys.intendedConnections,
          userEdges,
          shock: sys.shockEvent,
          nodeImpact,
        }),
        computeAnalyticalAccuracy(a.passage, a.embeddedIssues, a.validPoints, highlights),
      ];
    }

    const actualAccuracy = Math.round(accs.reduce((s, n) => s + n, 0) / accs.length);
    const confidenceRecord: ConfidenceRecord = {
      id: crypto.randomUUID(),
      exerciseId: comboId,
      confidenceBefore: comboConfidence,
      actualAccuracy,
      gap: comboConfidence - actualAccuracy,
      createdAt: now,
    };
    const journalEntry: JournalEntry = {
      id: crypto.randomUUID(),
      exerciseId: comboId,
      promptIds: journalPrompts.map((p) => p.id),
      aiReferenceLine: aiRefLine,
      responses: { ...journalAnswers },
      emotionLabel,
      createdAt: now,
    };
    const action: ActionBridge = {
      id: crypto.randomUUID(),
      exerciseId: comboId,
      oneAction: actionText.trim(),
      weeklyFollowThrough: [{ weekKey: currentIsoWeekKey(), done: false }],
      createdAt: now,
    };
    const comboRow: ComboExerciseRow = {
      id: comboId,
      type: "combo",
      preset: bundle.preset,
      domain: domain.trim(),
      title: bundle.sharedTitle,
      scenario: bundle.sharedScenario,
      subExercises: subs,
      confidenceBefore: comboConfidence,
      aiPerspective: null,
      aiPerspectiveStructured: null,
      createdAt: now,
      completedAt: now,
    };

    try {
      await completeExerciseFlow({
        exercise: comboRow,
        journal: journalEntry,
        confidence: confidenceRecord,
        action,
      });
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const setEdgeType = (edgeId: string, type: SystemsConnectionType) => {
    setUserEdges((prev) => prev.map((e) => (e.id === edgeId ? { ...e, type } : e)));
  };

  const comboStepLabels = useMemo(() => {
    const mc = bundle ? (bundle.preset === "decision_sprint" ? 2 : 3) : 3;
    const labels = ["Setup"];
    for (let i = 0; i < mc; i++) labels.push(`Step ${i + 1}`);
    labels.push("Journal", "Done");
    return labels as readonly string[];
  }, [bundle]);

  const shellStep =
    phase === "pick"
      ? 0
      : phase === "work"
        ? 1 + mechStep
        : phase === "journal"
          ? 1 + mechCount
          : 2 + mechCount;

  return (
    <ExerciseShell stepIndex={shellStep} stepLabels={comboStepLabels}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          {phase === "pick" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => {
                setError(null);
                void generateBundle();
              }}
            >
              Retry
            </Button>
          ) : null}
        </Alert>
      ) : null}

      {phase === "pick" ? (
        <Card>
          <CardHeader>
            <CardTitle>Combo exercise</CardTitle>
            <CardDescription>
              One scenario, multiple thinking modes. Journal once at the end.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Domain</Label>
              <DomainInput value={domain} onChange={setDomain} suggestions={domainSuggestions} />
            </div>
            <div className="grid gap-2">
              <Label>Preset</Label>
              <Select
                value={preset}
                onValueChange={(v) => setPreset((v as ComboPresetId) ?? "full_analysis")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_analysis">
                    Full analysis — analytical → systems → evaluative matrix
                  </SelectItem>
                  <SelectItem value="decision_sprint">
                    Decision sprint — evaluative matrix → generative
                  </SelectItem>
                  <SelectItem value="root_cause">
                    Root cause — sequential → systems → analytical
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" disabled={loading} onClick={() => void generateBundle()}>
              {loading ? (
                <>
                  <InlineSpinner /> Generating scenario…
                </>
              ) : (
                "Generate combo"
              )}
            </Button>
            <Link href="/" className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}>
              ← Home
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {phase === "work" && bundle && comboId ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{bundle.sharedTitle}</CardTitle>
              <CardDescription>
                Step {mechStep + 1} of {mechCount} — same scenario continues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={regenerate}>
                  Regenerate
                </Button>
              </div>
              <p className="text-muted-foreground mb-4 text-sm whitespace-pre-wrap">
                {bundle.sharedScenario}
              </p>
              {bundle.preset === "full_analysis" && mechStep === 0 && analyticalSource ? (
                <HighlightTag
                  passage={analyticalSource.passage}
                  highlights={highlights}
                  onChange={setHighlights}
                  onSelectionOverlap={() =>
                    setError("Selection overlaps an existing highlight. Remove or adjust first.")
                  }
                />
              ) : null}
              {bundle.preset === "full_analysis" && mechStep === 1 && systemsSource ? (
                <>
                  {systemsPhase === "shock" ? (
                    <div className="mb-3 space-y-1">
                      <p className="text-sm font-medium">Shock</p>
                      <p className="text-muted-foreground text-sm">
                        {systemsSource.shockEvent.description}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Click nodes to cycle: unaffected → directly affected → indirectly affected.
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground mb-2 text-xs">
                      Connect nodes, set edge types, then continue to mark shock impacts.
                    </p>
                  )}
                  <SystemsFlowCanvas
                    nodes={systemsSource.nodes}
                    userEdges={userEdges}
                    onUserEdgesChange={setUserEdges}
                    mode={systemsPhase === "connect" ? "connect" : "shock"}
                    nodeImpact={nodeImpact}
                    onToggleNodeImpact={
                      systemsPhase === "shock"
                        ? (id) =>
                            setNodeImpact((prev) => ({
                              ...prev,
                              [id]: cycleImpact(prev[id] ?? "none"),
                            }))
                        : undefined
                    }
                  />
                </>
              ) : null}
              {bundle.preset === "full_analysis" && mechStep === 1 && systemsPhase === "connect" ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Edge types</p>
                  <ul className="space-y-2 text-xs">
                    {userEdges.map((e) => (
                      <li key={e.id} className="flex flex-wrap items-center gap-2">
                        <span>
                          {e.source} → {e.target}
                        </span>
                        <Select
                          value={e.type}
                          onValueChange={(v) =>
                            setEdgeType(e.id, v as SystemsConnectionType)
                          }
                        >
                          <SelectTrigger className="h-8 w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="depends_on">depends on</SelectItem>
                            <SelectItem value="conflicts_with">conflicts with</SelectItem>
                            <SelectItem value="enables">enables</SelectItem>
                            <SelectItem value="risks">risks</SelectItem>
                          </SelectContent>
                        </Select>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {bundle.preset === "full_analysis" && mechStep === 2 && matrixSource ? (
                <EvaluativeMatrixBoard
                  axisX={matrixSource.axisX}
                  axisY={matrixSource.axisY}
                  options={matrixSource.options}
                  placements={placements}
                  onPlacementsChange={setPlacements}
                />
              ) : null}

              {bundle.preset === "decision_sprint" && mechStep === 0 && matrixSource ? (
                <EvaluativeMatrixBoard
                  axisX={matrixSource.axisX}
                  axisY={matrixSource.axisY}
                  options={matrixSource.options}
                  placements={placements}
                  onPlacementsChange={setPlacements}
                />
              ) : null}
              {bundle.preset === "decision_sprint" && mechStep === 1 && bundle ? (
                <div className="space-y-4">
                  {bundle.generative.prompts.map((p) => (
                    <div key={p.id} className="grid gap-2">
                      <Label htmlFor={`g-${p.id}`}>{p.question}</Label>
                      <Textarea
                        id={`g-${p.id}`}
                        rows={4}
                        value={genAnswers[p.id] ?? ""}
                        onChange={(e) =>
                          setGenAnswers((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {bundle.preset === "root_cause" && mechStep === 0 && bundle ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Order the steps (most causal first)</p>
                  <ol className="space-y-2">
                    {seqOrder.map((id, idx) => {
                      const st = bundle.sequential.steps.find((s) => s.id === id);
                      return (
                        <li
                          key={id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"
                        >
                          <span>{st?.text ?? id}</span>
                          <span className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={idx === 0}
                              onClick={() => moveSeq(idx, -1)}
                            >
                              Up
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={idx === seqOrder.length - 1}
                              onClick={() => moveSeq(idx, 1)}
                            >
                              Down
                            </Button>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : null}
              {bundle.preset === "root_cause" && mechStep === 1 && systemsSource ? (
                <>
                  {systemsPhase === "shock" ? (
                    <div className="mb-3 space-y-1">
                      <p className="text-sm font-medium">Shock</p>
                      <p className="text-muted-foreground text-sm">
                        {systemsSource.shockEvent.description}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Click nodes to cycle impact: none → direct → indirect.
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground mb-2 text-xs">
                      Connect nodes and set edge types, then continue for shock impacts.
                    </p>
                  )}
                  <SystemsFlowCanvas
                    nodes={systemsSource.nodes}
                    userEdges={userEdges}
                    onUserEdgesChange={setUserEdges}
                    mode={systemsPhase === "connect" ? "connect" : "shock"}
                    nodeImpact={nodeImpact}
                    onToggleNodeImpact={
                      systemsPhase === "shock"
                        ? (id) =>
                            setNodeImpact((prev) => ({
                              ...prev,
                              [id]: cycleImpact(prev[id] ?? "none"),
                            }))
                        : undefined
                    }
                  />
                </>
              ) : null}
              {bundle.preset === "root_cause" && mechStep === 1 && systemsPhase === "connect" ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Edge types</p>
                  <ul className="space-y-2 text-xs">
                    {userEdges.map((e) => (
                      <li key={e.id} className="flex flex-wrap items-center gap-2">
                        <span>
                          {e.source} → {e.target}
                        </span>
                        <Select
                          value={e.type}
                          onValueChange={(v) =>
                            setEdgeType(e.id, v as SystemsConnectionType)
                          }
                        >
                          <SelectTrigger className="h-8 w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="depends_on">depends on</SelectItem>
                            <SelectItem value="conflicts_with">conflicts with</SelectItem>
                            <SelectItem value="enables">enables</SelectItem>
                            <SelectItem value="risks">risks</SelectItem>
                          </SelectContent>
                        </Select>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {bundle.preset === "root_cause" && mechStep === 2 && analyticalSource ? (
                <HighlightTag
                  passage={analyticalSource.passage}
                  highlights={highlights}
                  onChange={setHighlights}
                  onSelectionOverlap={() =>
                    setError("Selection overlaps an existing highlight. Remove or adjust first.")
                  }
                />
              ) : null}
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPhase("pick");
                setBundle(null);
                setComboId(null);
                resetWorkState();
              }}
            >
              Abandon combo
            </Button>
            <Button type="button" onClick={() => nextMechanic()}>
              {bundle.preset !== "decision_sprint" && mechStep === 1 && systemsPhase === "connect"
                ? "Continue to shock impacts"
                : mechStep + 1 >= mechCount
                  ? "Continue to journal"
                  : "Next step"}
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "journal" && bundle && comboId ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reflect on the full combo</CardTitle>
              <CardDescription>
                One journal for all steps. Set overall confidence, then answer prompts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ConfidenceSlider
                value={comboConfidence}
                onChange={setComboConfidence}
                label="How confident are you in your overall work?"
              />
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
              {!journalPrimed ? (
                <p className="text-muted-foreground text-sm">Preparing prompts…</p>
              ) : (
                <>
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
                          setJournalAnswers((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                  <div className="grid gap-2">
                    <Label htmlFor="combo-action">One concrete action</Label>
                    <Textarea
                      id="combo-action"
                      rows={2}
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setPhase("work")}>
              Back
            </Button>
            <Button type="button" onClick={() => void finishCombo()}>
              Finish combo
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "done" ? (
        <Card>
          <CardHeader>
            <CardTitle>Combo saved</CardTitle>
            <CardDescription>Stored as one entry in exercise history.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link href="/exercise/history" className={buttonVariants({ variant: "secondary" })}>
              View history
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                window.location.assign("/exercise/combo");
              }}
            >
              Start another combo
            </Button>
            <Link href="/" className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}>
              Home
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </ExerciseShell>
  );
}
