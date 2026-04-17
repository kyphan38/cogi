"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { aiFetch } from "@/lib/api/ai-fetch";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  aggregateCompletedByDomain,
  aggregateCompletedByType,
  calibrationGapSeries,
  totalCompleted,
} from "@/lib/analytics/dashboard-aggregates";
import {
  listCompletedExercises,
  listConfidenceRecords,
  subscribeCompletedExercises,
  subscribeConfidenceRecords,
} from "@/lib/db/exercises";
import { getJournalForExercise } from "@/lib/db/journal";
import { listDecisions } from "@/lib/db/decisions";
import { listActionsFromLast14Days } from "@/lib/db/actions";
import {
  subscribeAppSettings,
  setWeeklyReviewLastCompletedCount,
} from "@/lib/db/settings";
import type { AdaptiveExerciseType } from "@/lib/adaptive/types";
import { getPerformanceSnapshotForThinkingType } from "@/lib/adaptive/performance-profile";
import { subscribeTopActiveWeaknesses } from "@/lib/db/weaknesses";
import type { WeaknessEntry } from "@/lib/types/weakness";
import { WEAKNESS_BUCKET } from "@/lib/types/weakness";
import {
  putWeeklyReview,
  subscribeWeeklyReviewsNewestFirst,
} from "@/lib/db/weekly-reviews";
import { subscribeNextDueRecall } from "@/lib/db/delayed-recall";
import { buildWeeklyReviewSlices } from "@/lib/insights/build-weekly-review-payload";
import type { WeeklyReviewRow } from "@/lib/types/insights";
import type { DelayedRecallQueueRow } from "@/lib/types/insights";
import { DelayedRecallCard } from "@/components/dashboard/DelayedRecallCard";
import { WeeklyInsights } from "@/components/dashboard/WeeklyInsights";
import { countPerspectiveDisagreementsForExercises } from "@/lib/db/disagreements";
import { logFirestoreQueryError } from "@/lib/db/firestore";

const ADAPTIVE_TYPES: AdaptiveExerciseType[] = [
  "analytical",
  "sequential",
  "systems",
  "evaluative",
  "generative",
];

type PerfSnap = Awaited<ReturnType<typeof getPerformanceSnapshotForThinkingType>>;

const WEAKNESS_LABEL: Record<string, string> = {
  [WEAKNESS_BUCKET.sequential]: "Sequential dependencies / order",
  [WEAKNESS_BUCKET.systems]: "Systems edges & shock ripple",
  [WEAKNESS_BUCKET.evaluativeMatrix]: "Evaluative matrix placement",
  [WEAKNESS_BUCKET.evaluativeScoring]: "Evaluative scoring tradeoffs",
  [WEAKNESS_BUCKET.generative]: "Generative depth / rubric",
  logical_fallacy: "Logical fallacy spotting",
  hidden_assumption: "Hidden assumptions",
  weak_evidence: "Weak evidence",
  bias: "Bias detection",
};

function weaknessDisplay(w: WeaknessEntry): string {
  return `${w.thinkingGroup}: ${WEAKNESS_LABEL[w.type] ?? w.type}`;
}

function GapChart({ points }: { points: { t: string; gap: number }[] }) {
  if (points.length < 2) {
    return (
      <p className="text-muted-foreground text-xs">
        Complete at least two exercises with calibration to see a trend.
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

export function DashboardContent() {
  const [completed, setCompleted] = useState<Awaited<ReturnType<typeof listCompletedExercises>>>([]);
  const [confRecords, setConfRecords] = useState<Awaited<ReturnType<typeof listConfidenceRecords>>>([]);
  const [latestReview, setLatestReview] = useState<WeeklyReviewRow | null>(null);
  const [pastReviews, setPastReviews] = useState<WeeklyReviewRow[]>([]);
  const [recall, setRecall] = useState<DelayedRecallQueueRow | null>(null);
  const [lastReviewCount, setLastReviewCount] = useState<number>(0);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [adaptiveOn, setAdaptiveOn] = useState(false);
  const [perfByType, setPerfByType] = useState<Partial<Record<AdaptiveExerciseType, PerfSnap>>>({});
  const [topWeak, setTopWeak] = useState<WeaknessEntry[]>([]);

  useEffect(() => {
    let recallEnabled = true;
    const unsubCompleted = subscribeCompletedExercises(
      undefined,
      (rows) => setCompleted(rows),
      (error) => {
        logFirestoreQueryError("DashboardContent", "subscribeCompletedExercises", error);
      },
    );
    const unsubConfidence = subscribeConfidenceRecords(
      (rows) => setConfRecords(rows),
      (error) => {
        logFirestoreQueryError("DashboardContent", "subscribeConfidenceRecords", error);
      },
    );
    const unsubSettings = subscribeAppSettings(
      (settings) => {
        recallEnabled = settings.delayedRecallEnabled !== false;
        setLastReviewCount(settings.weeklyReviewLastCompletedCount ?? 0);
        setAdaptiveOn(settings.adaptiveDifficultyEnabled === true);
        if (!recallEnabled) {
          setRecall(null);
        }
      },
      (error) => {
        logFirestoreQueryError("DashboardContent", "subscribeAppSettings", error);
      },
    );
    const unsubWeekly = subscribeWeeklyReviewsNewestFirst(
      (rows) => {
        setPastReviews(rows);
        setLatestReview(rows[0] ?? null);
      },
      (error) => {
        logFirestoreQueryError("DashboardContent", "subscribeWeeklyReviewsNewestFirst", error);
      },
    );
    const unsubRecall = subscribeNextDueRecall(
      (row) => {
        if (recallEnabled) {
          setRecall(row);
        }
      },
      (error) => {
        logFirestoreQueryError("DashboardContent", "subscribeNextDueRecall", error);
      },
    );
    return () => {
      unsubCompleted();
      unsubConfidence();
      unsubSettings();
      unsubWeekly();
      unsubRecall();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!adaptiveOn) {
      setPerfByType({});
      setTopWeak([]);
      return;
    }
    void (async () => {
      const snaps = await Promise.all(
        ADAPTIVE_TYPES.map(async (type) => [type, await getPerformanceSnapshotForThinkingType(type)] as const),
      );
      if (cancelled) return;
      setPerfByType(Object.fromEntries(snaps) as Partial<Record<AdaptiveExerciseType, PerfSnap>>);
    })();
    const unsubscribeWeaknesses = subscribeTopActiveWeaknesses(
      3,
      (rows) => {
        if (!cancelled) {
          setTopWeak(rows);
        }
      },
      (error) => {
        logFirestoreQueryError("DashboardContent", "subscribeTopActiveWeaknesses", error);
      },
    );
    return () => {
      cancelled = true;
      unsubscribeWeaknesses();
    };
  }, [adaptiveOn, completed, confRecords]);

  const byType = aggregateCompletedByType(completed);
  const byDomain = aggregateCompletedByDomain(completed);
  const gapPoints = calibrationGapSeries(confRecords);
  const count = totalCompleted(completed);
  const weeklyEligible = count >= lastReviewCount + 7;

  const calibrationSummary = useMemo(() => {
    const n = confRecords.length;
    if (n === 0) {
      return {
        avgGap: null as number | null,
        avgAcc: null as number | null,
        avgConf: null as number | null,
        stance: "none" as const,
      };
    }
    const avgGap = confRecords.reduce((s, c) => s + c.gap, 0) / n;
    const avgAcc = confRecords.reduce((s, c) => s + c.actualAccuracy, 0) / n;
    const avgConf = confRecords.reduce((s, c) => s + c.confidenceBefore, 0) / n;
    let stance: "calibrated" | "over" | "under" = "calibrated";
    if (avgGap > 10) stance = "over";
    else if (avgGap < -10) stance = "under";
    return {
      avgGap: Math.round(avgGap * 10) / 10,
      avgAcc: Math.round(avgAcc * 10) / 10,
      avgConf: Math.round(avgConf * 10) / 10,
      stance,
    };
  }, [confRecords]);

  const generateWeekly = async () => {
    setWeeklyError(null);
    const last7 = completed.slice(0, 7);
    if (last7.length < 7) {
      setWeeklyError("Need at least 7 completed exercises.");
      return;
    }
    setWeeklyLoading(true);
    try {
      const journals = await Promise.all(last7.map((ex) => getJournalForExercise(ex.id)));
      const map = new Map(last7.map((ex, i) => [ex.id, journals[i]] as const));
      const decisions = (await listDecisions()).slice(0, 3);
      const actionsRaw = await listActionsFromLast14Days();
      const ids = new Set(last7.map((ex) => ex.id));
      const perspectiveDisagreementCount = await countPerspectiveDisagreementsForExercises(ids);
      const payload = buildWeeklyReviewSlices(last7, map, decisions, actionsRaw, {
        perspectiveDisagreementCount,
      });
      const requestId = crypto.randomUUID();
      const res = await aiFetch("/api/ai/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          requestId,
          triggeredAtCompletedExerciseCount: count,
        }),
      });
      const json = (await res.json()) as
        | {
            ok: true;
            markdown: string;
            saved?: { saved: true; id: string; path: string; savedAt: string };
          }
        | { ok: false; error: string };
      if (!json.ok) {
        setWeeklyError(json.error);
        return;
      }
      if (!json.saved?.saved) {
        const row: WeeklyReviewRow = {
          id: requestId,
          createdAt: new Date().toISOString(),
          triggeredAtCompletedExerciseCount: count,
          markdown: json.markdown,
        };
        await putWeeklyReview(row);
      }
      await setWeeklyReviewLastCompletedCount(count);
    } catch (e) {
      setWeeklyError(e instanceof Error ? e.message : "Weekly review failed");
    } finally {
      setWeeklyLoading(false);
    }
  };

  const stanceLabel =
    calibrationSummary.stance === "none"
      ? "Not enough calibration rows yet."
      : calibrationSummary.stance === "over"
        ? "Trending overconfident (confidence above measured accuracy on average)."
        : calibrationSummary.stance === "under"
          ? "Trending underconfident (confidence below measured accuracy on average)."
          : "Confidence and measured accuracy are fairly aligned on average.";

  const stanceCardClass =
    calibrationSummary.stance === "over"
      ? "border-amber-300/60 bg-amber-50/90 dark:border-amber-800/50 dark:bg-amber-950/40"
      : calibrationSummary.stance === "under"
        ? "border-sky-300/60 bg-sky-50/90 dark:border-sky-800/50 dark:bg-sky-950/40"
        : calibrationSummary.stance === "calibrated"
          ? "border-emerald-300/60 bg-emerald-50/90 dark:border-emerald-900/50 dark:bg-emerald-950/35"
          : "";

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl tracking-tight sm:text-[1.65rem]">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Trends from exercises stored in this browser.
        </p>
      </div>

      <div className="mb-6 grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card px-3.5 py-3">
          <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Completed</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{count}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">Exercises with a completion record.</p>
        </div>
        <div
          className={cn(
            "rounded-lg border px-3.5 py-3",
            stanceCardClass || "border-border bg-card",
          )}
        >
          <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Calibration</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {calibrationSummary.avgGap != null ? `${calibrationSummary.avgGap > 0 ? "+" : ""}${calibrationSummary.avgGap}%` : "—"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{stanceLabel}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3.5 py-3">
          <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Measured accuracy</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {calibrationSummary.avgAcc != null ? `${calibrationSummary.avgAcc}%` : "—"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">Average actual accuracy across completed runs.</p>
        </div>
      </div>

      {!adaptiveOn ? (
        <p className="text-muted-foreground mb-6 text-xs">
          Adaptive difficulty is off.{" "}
          <Link href="/settings" className="text-primary underline underline-offset-2">
            Turn on in Settings
          </Link>{" "}
          to send tier and weakness hints when generating exercises.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completed exercises</CardTitle>
              <CardDescription>Total: {count}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground mb-2 text-xs">By type</p>
                <ul className="space-y-1 text-sm">
                  {Object.entries(byType).map(([k, v]) => (
                    <li key={k}>
                      <span className="font-medium">{k}</span>: {v}
                    </li>
                  ))}
                  {count === 0 ? <li className="text-muted-foreground">No data yet.</li> : null}
                </ul>
              </div>
              <div>
                <p className="text-muted-foreground mb-2 text-xs">By domain (top)</p>
                <ul className="space-y-1 text-sm">
                  {byDomain.slice(0, 6).map((d) => (
                    <li key={d.domain}>
                      {d.domain}: {d.count}
                    </li>
                  ))}
                  {count === 0 ? <li className="text-muted-foreground">No data yet.</li> : null}
                </ul>
              </div>
            </CardContent>
          </Card>

          {adaptiveOn ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Adaptive difficulty</CardTitle>
                <CardDescription>
                  Rolling accuracy by thinking type (tier after enough completions) and active blind
                  spots.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-2 text-xs">Performance tier by type</p>
                  <ul className="space-y-1">
                    {ADAPTIVE_TYPES.map((t) => {
                      const s = perfByType[t];
                      if (!s) return null;
                      const label =
                        s.tier && s.rollingMean != null
                          ? `${s.tier} (~${s.rollingMean}%, n=${s.sampleCount})`
                          : s.sampleCount > 0 && s.rollingMean != null
                            ? `Collecting (~${s.rollingMean}%, n=${s.sampleCount})`
                            : "—";
                      return (
                        <li key={t}>
                          <span className="font-medium">{t}</span>: {label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <p className="text-muted-foreground mb-2 text-xs">Current blind spots (top 3)</p>
                  {topWeak.length ? (
                    <ul className="list-inside list-disc space-y-1">
                      {topWeak.map((w) => (
                        <li key={w.id}>{weaknessDisplay(w)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-xs italic">
                      No blind spots queued yet — keep practicing; misses will surface here when
                      adaptive is on.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calibration gap</CardTitle>
              <CardDescription>Positive gap ≈ overconfident vs measured accuracy.</CardDescription>
            </CardHeader>
            <CardContent>
              <GapChart points={gapPoints} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly insight</CardTitle>
              <CardDescription>
                Generated from your last 7 completed exercises (not calendar-based). Next batch when
                you reach {lastReviewCount + 7} completed (you have {count}).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {weeklyError ? <p className="text-destructive text-sm">{weeklyError}</p> : null}
              {weeklyEligible ? (
                <Button type="button" disabled={weeklyLoading} onClick={() => void generateWeekly()}>
                  {weeklyLoading ? "Generating…" : "Generate weekly review"}
                </Button>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  You need {lastReviewCount + 7 - count} more completed exercise
                  {lastReviewCount + 7 - count === 1 ? "" : "s"} before the next weekly narrative
                  unlocks.
                </p>
              )}
              {latestReview ? (
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-muted-foreground mb-2 text-xs">
                    Latest · batch at {latestReview.triggeredAtCompletedExerciseCount} completed ·{" "}
                    {new Date(latestReview.createdAt).toLocaleString()}
                  </p>
                  <div className="prose prose-sm dark:prose-invert max-h-64 overflow-y-auto text-sm">
                    <pre className="whitespace-pre-wrap font-sans">{latestReview.markdown}</pre>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  No review generated yet — once you are eligible, one click will summarize your last
                  seven completions.
                </p>
              )}
            </CardContent>
          </Card>

          {pastReviews.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Past weekly reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pastReviews.slice(1, 6).map((r) => (
                  <details key={r.id} className="rounded-md border text-sm">
                    <summary className="cursor-pointer px-3 py-2 font-medium">
                      {new Date(r.createdAt).toLocaleDateString()} · count {r.triggeredAtCompletedExerciseCount}
                    </summary>
                    <div className="border-t px-3 py-2">
                      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                        {r.markdown}
                      </pre>
                    </div>
                  </details>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Delayed recall</CardTitle>
              <CardDescription className="text-xs">
                One card at a time, 48h after an exercise. Disable in Settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recall ? (
                <DelayedRecallCard recall={recall} onUpdated={() => {}} />
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  Nothing due in the next window — when an exercise matures, a short recall prompt
                  will appear here.
                </p>
              )}
            </CardContent>
          </Card>
          <WeeklyInsights />
        </aside>
      </div>
    </div>
  );
}
