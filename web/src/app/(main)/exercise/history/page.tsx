"use client";

import type { ReactNode } from "react";
import { startTransition, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/toast";
import { HistoryExerciseListSkeleton } from "@/components/ui/history-exercise-list-skeleton";
import {
  getExercise,
  deleteExercise,
  subscribeCompletedExercises,
  type CompletedExerciseFilter,
} from "@/lib/db/exercises";
import type { Exercise, ThinkingType } from "@/lib/types/exercise";
import {
  isAnalyticalExercise,
  isEvaluativeExercise,
  isSystemsExercise,
} from "@/lib/types/exercise";
import {
  getPerspectiveViewModel,
  getStructuredPerspectiveSections,
} from "@/lib/perspective/format-structured";
import {
  isAnalyticalCoachingStructured,
  isLegacyPerspectiveStructured,
} from "@/lib/types/perspective";
import { AnalyticalAnswerKey } from "@/components/exercises/AnalyticalAnswerKey";
import { analyticalResultOf } from "@/lib/exercise/analytical-score";
import type { ClarityPerspectiveKind } from "@/lib/types/perspective";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import { Trash2 } from "lucide-react";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { computeStreak } from "@/lib/exercise/streak";

type ThinkingTypeFilter = "all" | ThinkingType;

function perspectiveKindForExercise(ex: Exercise): ClarityPerspectiveKind | null {
  if (isAnalyticalExercise(ex)) return "analytical";
  if (isSystemsExercise(ex)) return "systems";
  if (isEvaluativeExercise(ex)) {
    return ex.variant === "matrix" ? "evaluative-matrix" : "evaluative-scoring";
  }
  return null;
}

function HistoryPerspectiveBody({
  structured,
  kind,
}: {
  structured: AIPerspectiveStructured;
  kind: ClarityPerspectiveKind | null;
}) {
  if (kind && !isLegacyPerspectiveStructured(structured)) {
    const vm = getPerspectiveViewModel(structured, kind);
    if (vm.format === "clarity_v2") {
      return (
        <div className="text-muted-foreground space-y-4 text-sm leading-relaxed">
          <p className="text-foreground text-sm font-medium">{vm.suitableFor}</p>
          <ul className="list-none space-y-4 pl-0">
            {vm.blocks.map((b) => (
              <li key={b.id} className="space-y-2">
                {b.title ? <p className="text-foreground font-medium">{b.title}</p> : null}
                {b.userSnippet ? (
                  <p className="bg-muted/40 rounded-md border px-2 py-1 text-xs">
                    <span className="font-medium">You wrote / selected: </span>
                    {b.userSnippet}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap">{b.body}</p>
                {b.remediation ? (
                  <p className="whitespace-pre-wrap text-xs">
                    <span className="font-medium">Stronger alternative: </span>
                    {b.remediation}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          {vm.openQuestions.length > 0 ? (
            <div>
              <h4 className="text-foreground mb-2 font-medium">Open questions</h4>
              <ul className="list-disc space-y-1 pl-5">
                {vm.openQuestions.map((q, i) => (
                  <li key={i} className="whitespace-pre-wrap">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      );
    }
  }
  if (isLegacyPerspectiveStructured(structured)) {
    return (
      <div className="text-muted-foreground space-y-4 text-sm leading-relaxed">
        {getStructuredPerspectiveSections(structured).map((sec) => (
          <div key={sec.key}>
            <h4 className="text-foreground mb-2 font-medium">{sec.title}</h4>
            <ul className="list-disc space-y-2 pl-5">
              {sec.points.map((p) => (
                <li key={p.id} className="whitespace-pre-wrap">
                  {p.title ? (
                    <>
                      <span className="text-foreground font-medium">{p.title}</span>
                      {" - "}
                    </>
                  ) : null}
                  {p.body}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const HEATMAP_WEEKS = 14;

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

function typeSwatchClass(t: Exercise["type"]): string {
  switch (t) {
    case "analytical":
      return "bg-zinc-700";
    case "systems":
      return "bg-zinc-500";
    case "evaluative":
      return "bg-zinc-800";
    default:
      return "bg-zinc-400";
  }
}

const EXERCISE_META_BADGE =
  "ml-2 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-zinc-600";

function HistoryActivityHeatmap({ rows }: { rows: Exercise[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMonday = startOfWeekMonday(today);
  startMonday.setDate(startMonday.getDate() - (HEATMAP_WEEKS - 1) * 7);

  const latestByDay = new Map<string, { type: Exercise["type"]; at: string }>();
  for (const ex of rows) {
    if (!ex.completedAt) continue;
    const key = new Date(ex.completedAt).toLocaleDateString("en-CA");
    const prev = latestByDay.get(key);
    if (!prev || ex.completedAt > prev.at) {
      latestByDay.set(key, { type: ex.type, at: ex.completedAt });
    }
  }

  const cells: ReactNode[] = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startMonday);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const key = cellDate.toLocaleDateString("en-CA");
      const afterToday = cellDate.getTime() > today.getTime();
      const entry = latestByDay.get(key);
      const title = afterToday
        ? ""
        : cellDate.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
      cells.push(
        <div
          key={`${w}-${d}`}
          title={title}
          className={cn(
            "rounded-sm",
            afterToday
              ? "bg-muted/25"
              : entry
                ? typeSwatchClass(entry.type)
                : "bg-muted/50",
          )}
        />,
      );
    }
  }

  const legend: { type: Exercise["type"]; label: string }[] = [
    { type: "analytical", label: "Analytical" },
    { type: "systems", label: "Systems" },
    { type: "evaluative", label: "Evaluative" },
  ];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div
          className="grid gap-1"
          style={{
            gridTemplateRows: "repeat(7, 11px)",
            gridAutoFlow: "column",
            gridAutoColumns: "minmax(0, 11px)",
          }}
          role="img"
          aria-label="Completed exercises by day, oldest columns on the left"
        >
          {cells}
        </div>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Each square is one day (Mon–Sun top to bottom; columns are weeks). If you finish more than
        one exercise on a day, the color follows the latest completion that day.
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {legend.map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("size-2.5 shrink-0 rounded-sm", typeSwatchClass(type))} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show: showToast } = useToast();
  const [rows, setRows] = useState<Exercise[]>([]);
  const [streakDays, setStreakDays] = useState(0);

  const [typeFilter, setTypeFilter] = useState<ThinkingTypeFilter>("all");
  const [domainQ, setDomainQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailEx, setDetailEx] = useState<Exercise | null>(null);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  /** First Firestore snapshot for the filtered list (avoid flashing "no matches" while subscribing). */
  const [filteredListReady, setFilteredListReady] = useState(false);

  const [allCompletedRows, setAllCompletedRows] = useState<Exercise[]>([]);

  const openExerciseId = searchParams.get("openExercise")?.trim() || null;

  useEffect(() => {
    if (!openExerciseId) return;
    setSelectedId(openExerciseId);
  }, [openExerciseId]);

  const clearHistoryFilters = () => {
    setTypeFilter("all");
    setDomainQ("");
    setFromDate("");
    setToDate("");
    router.replace("/exercise/history");
  };

  const openExerciseMissing = useMemo(
    () =>
      !!openExerciseId &&
      allCompletedRows.length > 0 &&
      !allCompletedRows.some((r) => r.id === openExerciseId),
    [openExerciseId, allCompletedRows],
  );

  const openExerciseHiddenByFilters = useMemo(
    () =>
      !!openExerciseId &&
      !openExerciseMissing &&
      filteredListReady &&
      !rows.some((r) => r.id === openExerciseId),
    [openExerciseId, openExerciseMissing, filteredListReady, rows],
  );

  useEffect(() => {
    const filter: CompletedExerciseFilter = {
      type: typeFilter,
      domainContains: domainQ.trim() || undefined,
      completedAfter: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
      completedBefore: toDate ? `${toDate}T23:59:59.999Z` : undefined,
    };
    const unsubscribe = subscribeCompletedExercises(
      filter,
      (list) => {
        startTransition(() => {
          setFilteredListReady(true);
          setRows(list);
        });
      },
      (error) => {
        logFirestoreQueryError("HistoryPage", "subscribeCompletedExercises(filtered)", error);
      },
    );
    return () => unsubscribe();
  }, [typeFilter, domainQ, fromDate, toDate]);

  useEffect(() => {
    const unsubscribe = subscribeCompletedExercises(
      undefined,
      (list) => {
        startTransition(() => {
          setAllCompletedRows(list);
          setStreakDays(computeStreak(list));
        });
      },
      (error) => {
        logFirestoreQueryError("HistoryPage", "subscribeCompletedExercises(all)", error);
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      startTransition(() => {
        setDetailEx(null);
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      const ex = await getExercise(selectedId);
      if (cancelled) return;
      startTransition(() => {
        setDetailEx(ex ?? null);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!pendingDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPendingDelete(null);
        setDeletePhrase("");
        setDeleteErr(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDelete]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const openDeleteDialog = (ex: Exercise) => {
    setPendingDelete({ id: ex.id, title: ex.title });
    setDeletePhrase("");
    setDeleteErr(null);
  };

  const closeDeleteDialog = () => {
    setPendingDelete(null);
    setDeletePhrase("");
    setDeleteErr(null);
    setDeleteSubmitting(false);
  };

  const confirmDeleteExercise = async () => {
    if (!pendingDelete || deletePhrase !== "Delete") return;
    setDeleteErr(null);
    setDeleteSubmitting(true);
    try {
      await deleteExercise(pendingDelete.id);
      if (selectedId === pendingDelete.id) {
        setSelectedId(null);
      }
      closeDeleteDialog();
      showToast("Exercise removed from your account.", "success");
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Exercise history</h1>
      </div>

      {openExerciseHiddenByFilters ? (
        <Alert>
          <AlertTitle className="text-sm">Linked exercise is hidden by filters</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span>Clear filters to show it in the list below.</span>
            <Button type="button" size="sm" variant="secondary" onClick={clearHistoryFilters}>
              Clear filters
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {openExerciseMissing ? (
        <Alert variant="destructive">
          <AlertTitle className="text-sm">Exercise not found</AlertTitle>
          <AlertDescription className="text-xs">
            No completed exercise with this id is in your history. It may have been removed.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Activity</CardTitle>
          <p className="text-muted-foreground text-xs tabular-nums">
            Streak: <span className="font-medium text-foreground">{streakDays}</span> day
            {streakDays === 1 ? "" : "s"}
          </p>
        </CardHeader>
        <CardContent>
          <HistoryActivityHeatmap rows={rows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter((v as ThinkingTypeFilter) ?? "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="analytical">Analytical</SelectItem>
                <SelectItem value="systems">Systems</SelectItem>
                <SelectItem value="evaluative">Evaluative</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Domain contains</Label>
            <Input placeholder="e.g. DevOps" value={domainQ} onChange={(e) => setDomainQ(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Completed on or after</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Completed on or before</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Completed exercises</h2>
        {!filteredListReady ? (
          <HistoryExerciseListSkeleton />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">No exercises match these filters.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((ex) => (
              <li key={ex.id}>
                <div
                  className={cn(
                    "group relative overflow-hidden rounded-lg border text-sm transition-colors",
                    selectedId === ex.id
                      ? "border-primary/50 bg-accent/30"
                      : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/20",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(ex.id)}
                    className="w-full p-3 pr-11 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {ex.title}
                        {isAnalyticalExercise(ex) && ex.source === "real_data" ? (
                          <span className={EXERCISE_META_BADGE}>Real data</span>
                        ) : isAnalyticalExercise(ex) && ex.isSoundReasoning === true ? (
                          <span className={EXERCISE_META_BADGE}>Sound reasoning</span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground text-xs">{formatDate(ex.completedAt!)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="font-tracker rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                        {ex.type}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {ex.domain}
                      </span>
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="bg-card/90 text-muted-foreground absolute top-2 right-2 z-10 size-8 rounded-md opacity-40 shadow-sm ring-1 ring-border/50 backdrop-blur-sm transition-[opacity,color,background-color] duration-150 hover:bg-destructive/10 hover:text-destructive hover:opacity-100 md:pointer-events-none md:opacity-0 md:hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:focus-visible:pointer-events-auto md:focus-visible:opacity-100"
                    aria-label={`Delete exercise: ${ex.title}`}
                    title="Remove from history"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(ex);
                    }}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && detailEx ? (
        <Card className="group/review relative">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">Review</CardTitle>
              <CardDescription>{detailEx.type}</CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground -mt-0.5 -mr-1 shrink-0 opacity-40 transition-[opacity,color] duration-150 hover:bg-destructive/10 hover:text-destructive hover:opacity-100 md:opacity-0 md:group-hover/review:opacity-100 md:focus-visible:opacity-100"
              aria-label={`Delete exercise: ${detailEx.title}`}
              title="Remove from history"
              onClick={() => openDeleteDialog(detailEx)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {isAnalyticalExercise(detailEx) ? (
              <AnalyticalAnswerKey
                exercise={detailEx}
                result={analyticalResultOf(detailEx)}
                coaching={
                  isAnalyticalCoachingStructured(detailEx.aiPerspectiveStructured)
                    ? detailEx.aiPerspectiveStructured
                    : null
                }
              />
            ) : isSystemsExercise(detailEx) ? (
              <>
                <div>
                  <h3 className="mb-1 font-medium">Scenario</h3>
                  <p className="leading-relaxed">{detailEx.scenario}</p>
                </div>
                <div>
                  <h3 className="mb-1 font-medium">Nodes</h3>
                  <ul className="space-y-1 text-xs">
                    {detailEx.nodes.map((n) => (
                      <li key={n.id}>
                        <span className="font-medium">{n.label}</span> - {n.description}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1 font-medium">Your connections</h3>
                  {detailEx.userEdges.length === 0 ? (
                    <p className="text-muted-foreground">None saved.</p>
                  ) : (
                    <ul className="list-inside list-disc space-y-1 text-xs">
                      {detailEx.userEdges.map((e) => (
                        <li key={e.id}>
                          {e.source} → {e.target} ({e.type.replace(/_/g, " ")})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-1 font-medium">Shock - your impact map</h3>
                  <p className="text-muted-foreground mb-2 text-xs">{detailEx.shockEvent.description}</p>
                  <ul className="space-y-1 text-xs">
                    {detailEx.nodes.map((n) => (
                      <li key={n.id}>
                        {n.label}: {detailEx.nodeImpact[n.id] ?? "none"}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : isEvaluativeExercise(detailEx) ? (
              <>
                <div>
                  <h3 className="mb-1 font-medium">Scenario</h3>
                  <p className="leading-relaxed">{detailEx.scenario}</p>
                </div>
                {detailEx.variant === "matrix" ? (
                  <div>
                    <h3 className="mb-1 font-medium">Matrix placements</h3>
                    <ul className="list-inside list-disc space-y-1 text-xs">
                      {detailEx.options.map((o) => (
                        <li key={o.id}>
                          {o.title}: {detailEx.placements[o.id] ?? "-"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : detailEx.variant === "scoring" ? (
                  <div>
                    <h3 className="mb-1 font-medium">Scoring (summary)</h3>
                    <p className="text-muted-foreground text-xs">
                      {detailEx.options.length} options × {detailEx.criteria.length} criteria (weights and
                      scores saved).
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="mb-1 font-medium">Uncertainty (summary)</h3>
                    <p className="text-muted-foreground text-xs">
                      {detailEx.options.length} options with probability/payoff outcomes recorded.
                    </p>
                  </div>
                )}
              </>
            ) : null}

            {/* v3 analytical feedback lives inside the answer key above. */}
            {isAnalyticalCoachingStructured(detailEx.aiPerspectiveStructured) ? null : (
              <div>
                <h3 className="mb-1 font-medium">AI perspective</h3>
                {detailEx.aiPerspectiveStructured ? (
                  <HistoryPerspectiveBody
                    structured={detailEx.aiPerspectiveStructured}
                    kind={perspectiveKindForExercise(detailEx)}
                  />
                ) : (
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {detailEx.aiPerspective ?? "-"}
                  </p>
                )}
              </div>
            )}

            {"takeaway" in detailEx && detailEx.takeaway ? (
              <div>
                <h3 className="mb-1 font-medium">Takeaway</h3>
                <p className="whitespace-pre-wrap leading-relaxed">{detailEx.takeaway}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {pendingDelete ? (
        <div
          className="cogi-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDeleteDialog();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-ex-title"
            className="cogi-modal-panel w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="delete-ex-title" className="font-heading text-lg font-medium">
              Delete exercise?
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              This removes{" "}
              <span className="font-medium text-foreground">&quot;{pendingDelete.title}&quot;</span>{" "}
              and its journal, action, calibration row, perspective disagreements, and delayed-recall
              reminders from your account. This cannot be undone.
            </p>
            <div className="mt-4 grid gap-2">
              <Label htmlFor="delete-ex-confirm">
                Type <span className="font-mono font-semibold text-foreground">Delete</span> to confirm
              </Label>
              <Input
                id="delete-ex-confirm"
                autoComplete="off"
                autoFocus
                value={deletePhrase}
                onChange={(e) => setDeletePhrase(e.target.value)}
                placeholder="Delete"
                aria-invalid={deletePhrase.length > 0 && deletePhrase !== "Delete"}
              />
            </div>
            {deleteErr ? (
              <p className="text-destructive mt-2 text-sm" role="alert">
                {deleteErr}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => closeDeleteDialog()}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deletePhrase !== "Delete" || deleteSubmitting}
                onClick={() => void confirmDeleteExercise()}
              >
                {deleteSubmitting ? "Deleting…" : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
          <p className="text-muted-foreground text-sm">Loading history…</p>
          <HistoryExerciseListSkeleton />
        </div>
      }
    >
      <HistoryPageInner />
    </Suspense>
  );
}

