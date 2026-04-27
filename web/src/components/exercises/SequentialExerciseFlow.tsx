"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AdaptiveSetupHint } from "@/components/adaptive/AdaptiveSetupHint";
import { ExerciseShell, SEQUENTIAL_EXERCISE_STEP_LABELS } from "@/components/shared/ExerciseShell";
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
import type { ConfidenceRecord, SequentialExerciseRow } from "@/lib/types/exercise";
import type { JournalEntry } from "@/lib/types/journal";
import type { ActionBridge } from "@/lib/types/action";
import type { SequentialExercisePayload } from "@/lib/ai/validators/sequential";
import { buildAdaptiveHintsForRequest } from "@/lib/adaptive/adaptive-hints";
import { putExercise } from "@/lib/db/exercises";
import { getUserContext } from "@/lib/db/settings";
import { completeExerciseFlow } from "@/lib/db/complete-exercise";
import {
  getPromptIdsUsedInLastNCompleted,
  getRecentJournalSnippetsForDomain,
} from "@/lib/db/journal";
import { pickJournalPrompts, type JournalPromptItem } from "@/lib/ai/prompts/journal-pool";
import { computeSequentialAccuracy } from "@/lib/analytics/calibration-sequential";
import { currentIsoWeekKey } from "@/lib/db/actions";
import { aiFetch } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import { DomainInput } from "@/components/shared/DomainInput";
import { listRecentDomains } from "@/lib/db/exercises";

const ZONE_POOL = "__zone_pool__";
const ZONE_TIMELINE_EMPTY = "__zone_timeline_empty__";
const ZONE_APPEND = "__zone_timeline_append__";

type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function shuffleIds(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

function DraggablePoolItem({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab touch-none rounded-md border bg-card px-3 py-2 text-sm shadow-sm active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...listeners}
      {...attributes}
    >
      {text}
    </div>
  );
}

function SortableTimelineItem({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab touch-none rounded-md border bg-card px-3 py-2 text-sm shadow-sm active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
      {...listeners}
      {...attributes}
    >
      {text}
    </div>
  );
}

function DroppableZone({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "ring-2 ring-primary/40")}
    >
      {children}
    </div>
  );
}

export function SequentialExerciseFlow() {
  const [step, setStep] = useState<FlowStep>(0);
  const [domain, setDomain] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [exercise, setExercise] = useState<SequentialExerciseRow | null>(null);
  const [pool, setPool] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const [confidence, setConfidence] = useState(50);
  const [perspectiveText, setPerspectiveText] = useState<string | null>(null);
  const [perspectiveStructured, setPerspectiveStructured] =
    useState<AIPerspectiveStructured | null>(null);

  const [journalPrompts, setJournalPrompts] = useState<JournalPromptItem[]>([]);
  const [journalAnswers, setJournalAnswers] = useState<Record<string, string>>({});
  const [aiRefLine, setAiRefLine] = useState<string | null>(null);
  const [journalPrimed, setJournalPrimed] = useState(false);
  const journalEffectIdRef = useRef(0);

  const [emotionLabel, setEmotionLabel] = useState<
    "anxious" | "excited" | "frustrated" | "confident" | "uncertain" | "defensive" | "neutral"
  >("neutral");

  const [actionText, setActionText] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    void listRecentDomains(20).then(setDomainSuggestions);
  }, []);

  const stepById = useMemo(() => {
    if (!exercise) return new Map<string, string>();
    return new Map(exercise.steps.map((s) => [s.id, s.text]));
  }, [exercise]);

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
      const adaptiveHints = await buildAdaptiveHintsForRequest("sequential");
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: d,
          userContext: userContext || undefined,
          exerciseType: "sequential",
          adaptiveHints,
        }),
      });
      const json = (await res.json()) as
        | { ok: true; data: SequentialExercisePayload }
        | { ok: false; error: string };
      if (!json.ok) {
        setError(json.error);
        return;
      }
      const data = json.data;
      const id = crypto.randomUUID();
      const ids = data.steps.map((s) => s.id);
      const row: SequentialExerciseRow = {
        id,
        type: "sequential",
        domain: d,
        title: data.title,
        scenario: data.scenario,
        steps: data.steps,
        criticalErrors: data.criticalErrors,
        userOrderedStepIds: [],
        confidenceBefore: null,
        aiPerspective: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      await putExercise(row);
      setExercise(row);
      setPool(shuffleIds(ids));
      setTimeline([]);
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
  }, [domain]);

  const regenerate = () => {
    if (timeline.length > 0) {
      const ok = window.confirm("Discard current work and regenerate?");
      if (!ok) return;
    }
    setError(null);
    void startGenerate();
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;

    const inPool = pool.includes(activeId);
    const inTimeline = timeline.includes(activeId);

    if (inPool) {
      if (overId === ZONE_TIMELINE_EMPTY || overId === ZONE_APPEND) {
        setPool((p) => p.filter((x) => x !== activeId));
        setTimeline((t) => [...t, activeId]);
        return;
      }
      if (timeline.includes(overId)) {
        const idx = timeline.indexOf(overId);
        setPool((p) => p.filter((x) => x !== activeId));
        setTimeline((t) => [...t.slice(0, idx), activeId, ...t.slice(idx)]);
      }
      return;
    }

    if (inTimeline) {
      if (overId === ZONE_POOL) {
        setTimeline((t) => t.filter((x) => x !== activeId));
        setPool((p) => [...p, activeId]);
        return;
      }
      if (timeline.includes(overId)) {
        setTimeline((t) => arrayMove(t, t.indexOf(activeId), t.indexOf(overId)));
      }
    }
  };

  const submitOrderAndConfidence = async () => {
    if (!exercise) return;
    if (perspectiveText != null) {
      setStep(3);
      return;
    }
    if (pool.length > 0 || timeline.length !== exercise.steps.length) {
      setError("Move every step into the timeline before continuing.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "sequential",
          title: exercise.title,
          scenario: exercise.scenario,
          steps: exercise.steps,
          criticalErrors: exercise.criticalErrors,
          userOrderedStepIds: timeline,
          confidenceBefore: confidence,
          domain: exercise.domain,
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
      const partial: SequentialExerciseRow = {
        ...exercise,
        userOrderedStepIds: timeline,
        confidenceBefore: confidence,
        aiPerspective: parsed.text,
        aiPerspectiveStructured: parsed.structured,
      };
      await putExercise(partial);
      setExercise(partial);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perspective failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 4 || journalPrimed || !exercise) return;
    const effectId = ++journalEffectIdRef.current;
    let cancelled = false;
    (async () => {
      try {
        const excluded = await getPromptIdsUsedInLastNCompleted(5);
        const accuracy = computeSequentialAccuracy(exercise.steps, timeline);
        const picks = pickJournalPrompts(excluded, {
          exerciseType: "sequential",
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

        const snippets = await getRecentJournalSnippetsForDomain(
          exercise.domain,
          3,
        );
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
    const accuracy = computeSequentialAccuracy(exercise.steps, timeline);
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
    const finalEx: SequentialExerciseRow = {
      ...exercise,
      userOrderedStepIds: timeline,
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
      setStep(6);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const shellStep =
    step === 0
      ? 0
      : step === 1
        ? 1
        : step === 2
          ? 2
          : step === 3
            ? 3
            : step === 4
              ? 4
              : step === 5
                ? 5
                : 6;

  const activeLabel =
    activeDragId && stepById.has(activeDragId) ? stepById.get(activeDragId)! : "";

  return (
    <ExerciseShell stepIndex={shellStep} stepLabels={SEQUENTIAL_EXERCISE_STEP_LABELS}>
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
            <CardTitle>Sequential exercise</CardTitle>
            <CardDescription>
              Generate a scenario, then drag steps into the right process order before reflecting.
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
            <AdaptiveSetupHint exerciseType="sequential" />
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
            <CardDescription>Domain: {exercise.domain}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{exercise.scenario}</p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-medium">Source</h3>
                  <DroppableZone
                    id={ZONE_POOL}
                    className="flex min-h-[220px] flex-col gap-2 rounded-md border border-dashed p-2"
                  >
                    {pool.length === 0 ? (
                      <p className="text-muted-foreground text-xs">All steps placed.</p>
                    ) : (
                      pool.map((id) => (
                        <DraggablePoolItem
                          key={id}
                          id={id}
                          text={stepById.get(id) ?? id}
                        />
                      ))
                    )}
                  </DroppableZone>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Timeline</h3>
                  {timeline.length === 0 ? (
                    <DroppableZone
                      id={ZONE_TIMELINE_EMPTY}
                      className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed p-2 text-center"
                    >
                      <p className="text-muted-foreground text-xs">
                        Drag steps here in process order (first at the top).
                      </p>
                    </DroppableZone>
                  ) : (
                    <div className="flex min-h-[220px] flex-col gap-2 rounded-md border border-dashed p-2">
                      <SortableContext
                        items={timeline}
                        strategy={verticalListSortingStrategy}
                      >
                        {timeline.map((id) => (
                          <SortableTimelineItem
                            key={id}
                            id={id}
                            text={stepById.get(id) ?? id}
                          />
                        ))}
                      </SortableContext>
                      <DroppableZone id={ZONE_APPEND} className="py-2 text-center">
                        <span className="text-muted-foreground text-xs">
                          Drop here to append to the end
                        </span>
                      </DroppableZone>
                    </div>
                  )}
                </div>
              </div>
              <DragOverlay>
                {activeDragId ? (
                  <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-lg">
                    {activeLabel}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button type="button" variant="secondary" onClick={regenerate}>
                Regenerate
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setError(null);
                  if (pool.length > 0 || timeline.length !== exercise.steps.length) {
                    setError("Place every step in the timeline before continuing.");
                    return;
                  }
                  setStep(2);
                }}
              >
                Continue to confidence
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
              Set how confident you are in your ordering before viewing the AI perspective.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ConfidenceSlider
              value={confidence}
              onChange={setConfidence}
              label="How confident are you in your step ordering?"
            />
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => void submitOrderAndConfidence()}
              >
                {loading ? (
                  <>
                    <InlineSpinner /> Loading perspective…
                  </>
                ) : (
                  "Submit and get AI perspective"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && exercise && perspectiveText ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your choices so far</CardTitle>
              <CardDescription>
                Domain, the order you locked in, and your confidence before this perspective.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">Domain</p>
                <p className="font-medium">{exercise.domain || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">Step order</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5">
                  {timeline.map((id) => (
                    <li key={id} className="leading-snug">
                      {stepById.get(id) ?? id}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">Confidence</p>
                <p className="font-medium">{confidence}%</p>
              </div>
            </CardContent>
          </Card>
          <AIPerspective
            text={perspectiveText}
            structured={perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null}
            exerciseId={exercise.id}
            perspectiveKind="sequential"
            exerciseTitle={exercise.title}
            domain={exercise.domain}
          />
          <Button type="button" onClick={() => setStep(4)}>
            Continue to journal
          </Button>
        </div>
      ) : null}

      {step === 4 && exercise ? (
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
                  <Button type="button" variant="secondary" onClick={() => setStep(3)}>
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
                      setStep(5);
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

      {step === 5 && exercise ? (
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
              placeholder="e.g. Draft a one-page checklist for the handoff before Friday."
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(4)}>
                Back
              </Button>
              <Button type="button" onClick={() => void finishExercise()}>
                Finish exercise
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 6 ? (
        <Card>
          <CardHeader>
            <CardTitle>Exercise saved</CardTitle>
            <CardDescription>
              When you finish the exercise, your responses, journal, and action are saved to your
              account (Firebase).
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
                window.location.assign("/exercise/sequential");
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
