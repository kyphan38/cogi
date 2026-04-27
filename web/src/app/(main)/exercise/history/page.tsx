"use client";

import type { ReactNode } from "react";
import { startTransition, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useToast } from "@/components/ui/toast";
import { HistoryExerciseListSkeleton } from "@/components/ui/history-exercise-list-skeleton";
import {
  getExercise,
  deleteCompletedExerciseAndRelatedRecords,
  subscribeCompletedExercises,
  subscribeConfidenceRecords,
  type CompletedExerciseFilter,
} from "@/lib/db/exercises";
import { getJournalForExercise } from "@/lib/db/journal";
import { JOURNAL_PROMPTS } from "@/lib/ai/prompts/journal-pool";
import type { Exercise } from "@/lib/types/exercise";
import type { ConfidenceRecord } from "@/lib/types/exercise";
import {
  isAnalyticalExercise,
  isComboExercise,
  isEvaluativeExercise,
  isGenerativeExercise,
  isSequentialExercise,
  isSystemsExercise,
} from "@/lib/types/exercise";
import type { JournalEntry } from "@/lib/types/journal";
import { getStructuredPerspectiveSections } from "@/lib/perspective/format-structured";
import { listPerspectiveDisagreementsForExercise } from "@/lib/db/disagreements";
import type { PerspectiveDisagreementRow } from "@/lib/types/disagreement";
import { Trash2 } from "lucide-react";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ThinkingTypeFilter =
  | "all"
  | "analytical"
  | "sequential"
  | "systems"
  | "evaluative"
  | "generative"
  | "combo";

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

function computeStreak(allDone: Exercise[]): number {
  const daySet = new Set<string>();
  for (const ex of allDone) {
    if (!ex.completedAt) continue;
    daySet.add(new Date(ex.completedAt).toLocaleDateString("en-CA"));
  }
  if (daySet.size === 0) return 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!daySet.has(cursor.toLocaleDateString("en-CA"))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let s = 0;
  for (;;) {
    const k = cursor.toLocaleDateString("en-CA");
    if (!daySet.has(k)) break;
    s += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return s;
}

function typeSwatchClass(t: Exercise["type"]): string {
  switch (t) {
    case "analytical":
      return "bg-emerald-400";
    case "sequential":
      return "bg-sky-400";
    case "systems":
      return "bg-violet-400";
    case "evaluative":
      return "bg-amber-400";
    case "generative":
      return "bg-rose-400";
    case "combo":
      return "bg-slate-400";
    default:
      return "bg-muted-foreground/40";
  }
}

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
    { type: "sequential", label: "Sequential" },
    { type: "systems", label: "Systems" },
    { type: "evaluative", label: "Evaluative" },
    { type: "generative", label: "Generative" },
    { type: "combo", label: "Combo" },
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

function GapChart({ points }: { points: { t: string; gap: number }[] }) {
  if (points.length < 2) {
    return (
      <p className="text-muted-foreground text-xs">
        Complete at least two exercises with calibration to see a trend line.
      </p>
    );
  }
  const gaps = points.map((p) => p.gap);
  const min = Math.min(...gaps, 0) - 2;
  const max = Math.max(...gaps, 0) + 2;
  const w = 320;
  const h = 120;
  const pad = 8;
  const xFor = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const yFor = (g: number) => {
    const t = (g - min) / (max - min || 1);
    return h - pad - t * (h - pad * 2);
  };
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.gap)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full max-w-md text-primary"
      aria-label="Calibration gap over time"
    >
      <line
        x1={pad}
        y1={yFor(0)}
        x2={w - pad}
        y2={yFor(0)}
        className="stroke-muted-foreground/40"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function HistoryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show: showToast } = useToast();
  const [rows, setRows] = useState<Exercise[]>([]);
  const [confMap, setConfMap] = useState<Map<string, number>>(new Map());
  const [globalStats, setGlobalStats] = useState<{
    avgConf: number | null;
    avgAcc: number | null;
    avgGap: number | null;
    chartPoints: { t: string; gap: number }[];
  }>({ avgConf: null, avgAcc: null, avgGap: null, chartPoints: [] });
  const [streakDays, setStreakDays] = useState(0);

  const [typeFilter, setTypeFilter] = useState<ThinkingTypeFilter>("all");
  const [domainQ, setDomainQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailEx, setDetailEx] = useState<Exercise | null>(null);
  const [detailJournal, setDetailJournal] = useState<JournalEntry | null>(null);
  const [detailDisagreements, setDetailDisagreements] = useState<PerspectiveDisagreementRow[]>([]);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  /** First Firestore snapshot for the filtered list (avoid flashing "no matches" while subscribing). */
  const [filteredListReady, setFilteredListReady] = useState(false);

  const [allCompletedRows, setAllCompletedRows] = useState<Exercise[]>([]);
  const [confidenceRows, setConfidenceRows] = useState<ConfidenceRecord[]>([]);

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
    const unsubscribe = subscribeConfidenceRecords(
      (rows) => {
        startTransition(() => {
          setConfidenceRows(rows);
        });
      },
      (error) => {
        logFirestoreQueryError("HistoryPage", "subscribeConfidenceRecords", error);
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const m = new Map<string, number>();
    const filteredIds = new Set(rows.map((row) => row.id));
    for (const row of confidenceRows) {
      if (filteredIds.has(row.exerciseId)) {
        m.set(row.exerciseId, row.gap);
      }
    }
    setConfMap(m);
  }, [rows, confidenceRows]);

  useEffect(() => {
    const ids = new Set(allCompletedRows.map((item) => item.id));
    const recs = confidenceRows.filter((row) => ids.has(row.exerciseId));
    if (recs.length === 0) {
      setGlobalStats({
        avgConf: null,
        avgAcc: null,
        avgGap: null,
        chartPoints: [],
      });
      return;
    }
    const avgConf = recs.reduce((sum, row) => sum + row.confidenceBefore, 0) / recs.length;
    const avgAcc = recs.reduce((sum, row) => sum + row.actualAccuracy, 0) / recs.length;
    const avgGap = recs.reduce((sum, row) => sum + row.gap, 0) / recs.length;
    const chartPoints = [...recs]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((row) => ({ t: row.createdAt, gap: row.gap }));
    setGlobalStats({
      avgConf: Math.round(avgConf * 10) / 10,
      avgAcc: Math.round(avgAcc * 10) / 10,
      avgGap: Math.round(avgGap * 10) / 10,
      chartPoints,
    });
  }, [allCompletedRows, confidenceRows]);

  useEffect(() => {
    if (!selectedId) {
      startTransition(() => {
        setDetailEx(null);
        setDetailJournal(null);
        setDetailDisagreements([]);
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      const ex = await getExercise(selectedId);
      const j = await getJournalForExercise(selectedId);
      const disagreements = await listPerspectiveDisagreementsForExercise(selectedId);
      if (cancelled) return;
      startTransition(() => {
        setDetailEx(ex ?? null);
        setDetailJournal(j ?? null);
        setDetailDisagreements(disagreements);
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
      await deleteCompletedExerciseAndRelatedRecords(pendingDelete.id);
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
        <p className="text-muted-foreground text-sm">
          Review completed exercises or remove them from your account. Calibration averages use every
          completion still stored here.
        </p>
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
        <CardHeader>
          <CardTitle className="text-base">Calibration (all completed)</CardTitle>
          <CardDescription>
            Three numbers summarize how your self-rated confidence lines up with measured accuracy
            across finished exercises. Gap = confidence before − actual accuracy (positive ≈
            overconfident on average).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-muted/10 p-3 text-sm">
              <p className="text-muted-foreground">Avg confidence</p>
              <p className="text-lg font-medium tabular-nums">
                {globalStats.avgConf != null ? `${globalStats.avgConf}%` : "—"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                How sure you said you were before each run.
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/10 p-3 text-sm">
              <p className="text-muted-foreground">Avg accuracy</p>
              <p className="text-lg font-medium tabular-nums">
                {globalStats.avgAcc != null ? `${globalStats.avgAcc}%` : "—"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Measured performance after each exercise.
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/10 p-3 text-sm">
              <p className="text-muted-foreground">Avg calibration gap</p>
              <p className="text-lg font-medium tabular-nums">
                {globalStats.avgGap != null
                  ? `${globalStats.avgGap > 0 ? "+" : ""}${globalStats.avgGap}%`
                  : "—"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Above zero → confidence tended to exceed accuracy.
              </p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-2 text-xs">Gap over time</p>
            <GapChart points={globalStats.chartPoints} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription>
              Last {HEATMAP_WEEKS} weeks of completions that match your current filters.
            </CardDescription>
          </div>
          <p className="text-muted-foreground text-xs tabular-nums">
            Streak: <span className="font-medium text-foreground">{streakDays}</span> day
            {streakDays === 1 ? "" : "s"} (all completions)
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
                <SelectItem value="sequential">Sequential</SelectItem>
                <SelectItem value="systems">Systems</SelectItem>
                <SelectItem value="evaluative">Evaluative</SelectItem>
                <SelectItem value="generative">Generative</SelectItem>
                <SelectItem value="combo">Combo</SelectItem>
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
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled
              className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")}
            >
              Realtime filters enabled
            </button>
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
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                            Real data
                          </span>
                        ) : isAnalyticalExercise(ex) && ex.isSoundReasoning === true ? (
                          <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
                            Sound reasoning
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground text-xs">{formatDate(ex.completedAt!)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {ex.type}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {ex.domain}
                      </span>
                      {confMap.has(ex.id)
                        ? (() => {
                            const g = confMap.get(ex.id)!;
                            return (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                                  g > 0
                                    ? "bg-destructive/10 text-destructive"
                                    : g < 0
                                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                                      : "bg-muted text-muted-foreground",
                                )}
                              >
                                gap {g > 0 ? "+" : ""}
                                {g}%
                              </span>
                            );
                          })()
                        : null}
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
              <>
                <div>
                  <h3 className="mb-1 font-medium">Passage</h3>
                  <p className="whitespace-pre-wrap leading-relaxed">{detailEx.passage}</p>
                </div>
                <div>
                  <h3 className="mb-1 font-medium">Your highlights</h3>
                  {detailEx.userHighlights.length === 0 ? (
                    <p className="text-muted-foreground">None saved.</p>
                  ) : (
                    <ul className="list-inside list-disc space-y-1">
                      {detailEx.userHighlights.map((h) => (
                        <li key={h.id}>
                          <span className="font-medium">{h.tag}</span>: {h.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : isSequentialExercise(detailEx) ? (
              <>
                <div>
                  <h3 className="mb-1 font-medium">Scenario</h3>
                  <p className="leading-relaxed">{detailEx.scenario}</p>
                </div>
                <div>
                  <h3 className="mb-1 font-medium">Your order</h3>
                  <ol className="list-inside list-decimal space-y-1">
                    {detailEx.userOrderedStepIds.map((id) => {
                      const s = detailEx.steps.find((x) => x.id === id);
                      return <li key={id}>{s?.text ?? id}</li>;
                    })}
                  </ol>
                </div>
              </>
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
                        <span className="font-medium">{n.label}</span> — {n.description}
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
                  <h3 className="mb-1 font-medium">Shock — your impact map</h3>
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
                          {o.title}: {detailEx.placements[o.id] ?? "—"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div>
                    <h3 className="mb-1 font-medium">Scoring (summary)</h3>
                    <p className="text-muted-foreground text-xs">
                      {detailEx.options.length} options × {detailEx.criteria.length} criteria (weights and
                      scores saved).
                    </p>
                  </div>
                )}
              </>
            ) : isGenerativeExercise(detailEx) ? (
              <>
                <div>
                  <h3 className="mb-1 font-medium">Scenario</h3>
                  <p className="leading-relaxed">{detailEx.scenario}</p>
                </div>
                <div>
                  <h3 className="mb-1 font-medium">Scaffold</h3>
                  <p className="text-xs">Stage at start: {detailEx.stageAtStart}</p>
                </div>
                <div>
                  <h3 className="mb-1 font-medium">Answers (short)</h3>
                  <ul className="space-y-2 text-xs">
                    {detailEx.prompts.map((p) => (
                      <li key={p.id}>
                        <span className="font-medium">{p.question}</span>
                        <p className="text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                          {detailEx.answers[p.id]?.trim() || "—"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1 font-medium">Debate</h3>
                  <p className="text-muted-foreground text-xs">
                    {detailEx.debateTurns.length} reply round(s) recorded
                    {detailEx.rubricScore != null ? ` · rubric ${detailEx.rubricScore}` : ""}
                  </p>
                </div>
              </>
            ) : isComboExercise(detailEx) ? (
              <>
                <div>
                  <h3 className="mb-1 font-medium">Combo preset</h3>
                  <p className="text-xs">{detailEx.preset.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <h3 className="mb-1 font-medium">Shared scenario</h3>
                  <p className="leading-relaxed whitespace-pre-wrap">{detailEx.scenario}</p>
                </div>
                <div>
                  <h3 className="mb-1 font-medium">Sub-results</h3>
                  <ol className="list-inside list-decimal space-y-2 text-xs">
                    {detailEx.subExercises.map((sub, i) => (
                      <li key={`${sub.id}-${i}`}>
                        <span className="font-medium">{sub.type}</span>
                        {sub.type === "analytical" ? <span> — {sub.userHighlights.length} highlight(s)</span> : null}
                        {sub.type === "sequential" ? <span> — {sub.userOrderedStepIds.length} steps ordered</span> : null}
                        {sub.type === "systems" ? <span> — {sub.userEdges.length} edge(s)</span> : null}
                        {sub.type === "evaluative" && sub.variant === "matrix" ? (
                          <span> — {Object.keys(sub.placements).length} placement(s)</span>
                        ) : null}
                        {sub.type === "generative" ? <span> — {Object.keys(sub.answers).length} answer field(s)</span> : null}
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            ) : null}

            <div>
              <h3 className="mb-1 font-medium">AI perspective</h3>
              {isComboExercise(detailEx) ? (
                <p className="text-muted-foreground leading-relaxed">
                  Combined exercise — see sub-results above. No separate AI perspective for this entry.
                </p>
              ) : detailEx.aiPerspectiveStructured ? (
                <div className="text-muted-foreground space-y-4 text-sm leading-relaxed">
                  {getStructuredPerspectiveSections(detailEx.aiPerspectiveStructured).map((sec) => (
                    <div key={sec.key}>
                      <h4 className="text-foreground mb-2 font-medium">{sec.title}</h4>
                      <ul className="list-disc space-y-2 pl-5">
                        {sec.points.map((p) => (
                          <li key={p.id} className="whitespace-pre-wrap">
                            {p.title ? (
                              <>
                                <span className="text-foreground font-medium">{p.title}</span>
                                {" — "}
                              </>
                            ) : null}
                            {p.body}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {detailEx.aiPerspective ?? "—"}
                </p>
              )}
            </div>

            {detailDisagreements.length > 0 ? (
              <div>
                <h3 className="mb-1 font-medium">Perspective disagreements</h3>
                <ul className="space-y-3 text-xs">
                  {detailDisagreements.map((d) => (
                    <li key={d.id} className="rounded-md border p-2">
                      <p className="text-muted-foreground">
                        {d.section} · {d.pointId}
                        {d.pointTitle ? ` — ${d.pointTitle}` : ""}
                      </p>
                      <p className="mt-1 font-medium">You</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{d.userReason}</p>
                      <p className="mt-2 font-medium">AI</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{d.aiReply}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <h3 className="mb-1 font-medium">Journal</h3>
              {!detailJournal ? (
                <p className="text-muted-foreground">No journal entry found.</p>
              ) : (
                <ul className="space-y-2">
                  {detailJournal.emotionLabel ? (
                    <li>
                      <p className="text-xs font-medium">
                        Emotion: <span className="font-normal">{detailJournal.emotionLabel}</span>
                      </p>
                    </li>
                  ) : null}
                  {detailJournal.promptIds.map((pid) => {
                    const label = JOURNAL_PROMPTS.find((p) => p.id === pid)?.text ?? pid;
                    return (
                      <li key={pid}>
                        <p className="text-muted-foreground text-xs">{label}</p>
                        <p className="whitespace-pre-wrap">{detailJournal.responses[pid] ?? "—"}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
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

