"use client";

import Link from "next/link";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section, WORD_LINK } from "@/components/shared/Section";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { HistoryExerciseListSkeleton } from "@/components/ui/history-exercise-list-skeleton";
import { isAnalyticalExercise } from "@/lib/types/exercise";
import { CalibrationHistoryCard } from "@/components/exercises/CalibrationHistoryCard";
import { HistoryDetailBody } from "@/components/history/HistoryDetailBody";
import { RedoPanel } from "@/components/history/RedoPanel";
import { MonthlyReviewSection } from "@/components/monthly/MonthlyReviewSection";
import { Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  useHistoryPage,
  type ThinkingTypeFilter,
} from "@/components/history/useHistoryPage";
import { formatDate } from "@/lib/history";
import HistoryActivityHeatmap from "@/components/history/HistoryActivityHeatmap";

const EXERCISE_META_BADGE = "ml-2 text-label uppercase text-muted-foreground";

function HistoryPageInner() {
  const {
    rows,
    streakDays,
    typeFilter,
    setTypeFilter,
    domainQ,
    setDomainQ,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    setFiltersOpen,
    selectedId,
    setSelectedId,
    detailEx,
    setDetailEx,
    pendingDelete,
    deletePhrase,
    setDeletePhrase,
    deleteSubmitting,
    deleteErr,
    filteredListReady,
    allCompletedRows,
    shown,
    goingIds,
    filtersActive,
    showFilters,
    flip,
    clearHistoryFilters,
    openExerciseMissing,
    openExerciseHiddenByFilters,
    selected,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDeleteExercise,
  } = useHistoryPage();
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-12 px-4 pt-8 pb-24 sm:px-6">
      <PageHeader
        title="Exercise history"
        action={
          <Link href="/terms" className={WORD_LINK} data-testid="my-terms-link">
            My terms
          </Link>
        }
      />

      {openExerciseHiddenByFilters ? (
        <Alert>
          <AlertTitle className="text-body">
            Linked exercise is hidden by filters
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-2 text-meta sm:flex-row sm:items-center sm:justify-between">
            <span>Clear filters to show it in the list below.</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={clearHistoryFilters}
            >
              Clear filters
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {openExerciseMissing ? (
        <Alert variant="destructive">
          <AlertTitle className="text-body">Exercise not found</AlertTitle>
          <AlertDescription className="text-meta">
            No completed exercise with this id is in your history. It may have
            been removed.
          </AlertDescription>
        </Alert>
      ) : null}

      <Section
        title="Activity"
        action={
          <p className="text-muted-foreground text-meta tabular-nums">
            Streak:{" "}
            <span className="font-medium text-foreground">{streakDays}</span>{" "}
            day
            {streakDays === 1 ? "" : "s"}
          </p>
        }
      >
        <HistoryActivityHeatmap rows={rows} />
      </Section>

      <MonthlyReviewSection completed={allCompletedRows} />

      <CalibrationHistoryCard rows={rows} />

      {showFilters ? (
        <Section title="Filters" data-testid="history-filters">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={typeFilter}
                onValueChange={(v) =>
                  setTypeFilter((v as ThinkingTypeFilter) ?? "all")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="analytical">Analytical</SelectItem>
                  <SelectItem value="systems">Systems</SelectItem>
                  <SelectItem value="evaluative">Evaluative</SelectItem>
                  <SelectItem value="judgment">Life situations</SelectItem>
                  <SelectItem value="tricky">Tricky questions</SelectItem>
                  <SelectItem value="humor">Light replies</SelectItem>
                  <SelectItem value="strategy">Strategic situations</SelectItem>
                  <SelectItem value="reframe">Reframe</SelectItem>
                  <SelectItem value="calibration">Calibration</SelectItem>
                  <SelectItem value="geo">Geo Lab</SelectItem>
                  <SelectItem value="quick">5-minute question</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Domain contains</Label>
              <Input
                placeholder="e.g. DevOps"
                value={domainQ}
                onChange={(e) => setDomainQ(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Completed on or after</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Completed on or before</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </Section>
      ) : null}

      <Section
        title="Completed exercises"
        action={
          filtersActive ? null : (
            <button
              type="button"
              className={WORD_LINK}
              aria-expanded={showFilters}
              onClick={() => setFiltersOpen((o) => !o)}
            >
              {showFilters ? "hide filters" : "filters"}
            </button>
          )
        }
      >
        {!filteredListReady ? (
          <HistoryExerciseListSkeleton />
        ) : shown.length === 0 ? (
          <p className="text-muted-foreground text-body italic">
            No exercises match these filters.
          </p>
        ) : (
          <ul className="divide-y border-y">
            {shown.map((ex) => (
              <li
                key={ex.id}
                ref={flip(ex.id)}
                className={goingIds.has(ex.id) ? "row-out" : undefined}
                aria-hidden={goingIds.has(ex.id) || undefined}
                inert={goingIds.has(ex.id)}
              >
                <div
                  className={cn(
                    "group relative text-body transition-colors",
                    selectedId === ex.id ? "bg-muted/60" : "hover:bg-muted/30",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(ex.id)}
                    aria-current={selectedId === ex.id ? "true" : undefined}
                    className="w-full py-3 pr-11 pl-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {ex.title}
                        {isAnalyticalExercise(ex) &&
                        ex.source === "real_data" ? (
                          <span className={EXERCISE_META_BADGE}>Real data</span>
                        ) : isAnalyticalExercise(ex) &&
                          ex.isSoundReasoning === true ? (
                          <span className={EXERCISE_META_BADGE}>
                            Sound reasoning
                          </span>
                        ) : null}
                        {"redoOf" in ex && ex.redoOf ? (
                          <span className={EXERCISE_META_BADGE}>Redo</span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground text-meta">
                        {formatDate(ex.completedAt!)}
                      </span>
                    </div>
                    <p className="mt-1 flex min-w-0 items-baseline gap-2 text-meta text-muted-foreground">
                      <span className="section-label shrink-0">{ex.type}</span>
                      <span className="min-w-0 truncate">{ex.domain}</span>
                    </p>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground absolute top-2 right-1 z-10 size-8 rounded-md opacity-40 transition-[opacity,color] duration-150 hover:text-foreground hover:opacity-100 md:pointer-events-none md:opacity-0 md:hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:focus-visible:pointer-events-auto md:focus-visible:opacity-100"
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
      </Section>

      {selected && detailEx ? (
        <section className="group/review relative">
          <div className="flex flex-row flex-wrap items-start justify-between gap-2 pb-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lead font-semibold">Review</h2>
              <p className="section-label">{detailEx.type}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground -mt-0.5 -mr-1 shrink-0 opacity-40 transition-[opacity,color] duration-150 hover:text-foreground hover:opacity-100 md:opacity-0 md:group-hover/review:opacity-100 md:focus-visible:opacity-100"
              aria-label={`Delete exercise: ${detailEx.title}`}
              title="Remove from history"
              onClick={() => openDeleteDialog(detailEx)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
          <div className="space-y-6 text-body">
            <RedoPanel key={detailEx.id} ex={detailEx} completed={allCompletedRows} />
            <HistoryDetailBody detailEx={detailEx} setDetailEx={setDetailEx} />
          </div>
        </section>
      ) : null}

      {pendingDelete ? (
        <ModalShell onClose={closeDeleteDialog} labelledBy="delete-ex-title">
          <h2
            id="delete-ex-title"
            className="font-heading text-lead font-medium"
          >
            Delete exercise?
          </h2>
          <p className="text-muted-foreground mt-2 text-body leading-relaxed">
            Deletes{" "}
            <span className="font-medium text-foreground">
              &quot;{pendingDelete.title}&quot;
            </span>{" "}
            and all its data. Can&apos;t be undone.
          </p>
          <div className="mt-4 grid gap-2">
            <Label htmlFor="delete-ex-confirm">
              Type{" "}
              <span className="font-mono font-semibold text-foreground">
                Delete
              </span>{" "}
              to confirm
            </Label>
            <Input
              id="delete-ex-confirm"
              autoComplete="off"
              autoFocus
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
              placeholder="Delete"
              aria-invalid={
                deletePhrase.length > 0 && deletePhrase !== "Delete"
              }
            />
          </div>
          {deleteErr ? (
            <p className="text-destructive mt-2 text-body" role="alert">
              {deleteErr}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => closeDeleteDialog()}
            >
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
        </ModalShell>
      ) : null}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
          <p className="text-muted-foreground text-body">Loading history…</p>
          <HistoryExerciseListSkeleton />
        </div>
      }
    >
      <HistoryPageInner />
    </Suspense>
  );
}
