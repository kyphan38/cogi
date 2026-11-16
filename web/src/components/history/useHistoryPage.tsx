"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFlip } from "@/lib/hooks/useFlip";
import { useRowMotion } from "@/lib/hooks/useRowMotion";
import { useToast } from "@/components/ui/toast";
import {
  getExercise,
  deleteExercise,
  subscribeCompletedExercises,
  type CompletedExerciseFilter,
} from "@/lib/db/exercises";
import type { Exercise, ThinkingType } from "@/lib/types/exercise";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import { computeStreak } from "@/lib/exercise/streak";

export type ThinkingTypeFilter = "all" | ThinkingType | "geo" | "quick";

/** State, data loading, filters and delete of the History page. */
export function useHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show: showToast } = useToast();
  const [rows, setRows] = useState<Exercise[]>([]);
  const [streakDays, setStreakDays] = useState(0);

  const [typeFilter, setTypeFilter] = useState<ThinkingTypeFilter>("all");
  const [domainQ, setDomainQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // Filters are rarely used: closed behind a word, open while any is set.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersActive =
    typeFilter !== "all" || domainQ !== "" || fromDate !== "" || toDate !== "";
  const showFilters = filtersOpen || filtersActive;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailEx, setDetailEx] = useState<Exercise | null>(null);

  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  /** First Firestore snapshot for the filtered list (avoid flashing "no matches" while subscribing). */
  const [filteredListReady, setFilteredListReady] = useState(false);

  const [allCompletedRows, setAllCompletedRows] = useState<Exercise[]>([]);

  // A row a live update removes (a delete) slides out; a new filter or a big swap
  // of the list plays nothing.
  const { shown, goingIds } = useRowMotion(
    rows,
    `${typeFilter}|${domainQ}|${fromDate}|${toDate}`,
    filteredListReady,
    // Same order the list query uses: newest first.
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
  // The rows below one that leaves slide up to its place.
  const flip = useFlip(shown.map((ex) => ex.id));

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
        logFirestoreQueryError(
          "HistoryPage",
          "subscribeCompletedExercises(filtered)",
          error,
        );
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
        logFirestoreQueryError(
          "HistoryPage",
          "subscribeCompletedExercises(all)",
          error,
        );
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

  return {
    rows,
    setRows,
    streakDays,
    setStreakDays,
    typeFilter,
    setTypeFilter,
    domainQ,
    setDomainQ,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    filtersOpen,
    setFiltersOpen,
    selectedId,
    setSelectedId,
    detailEx,
    setDetailEx,
    pendingDelete,
    setPendingDelete,
    deletePhrase,
    setDeletePhrase,
    deleteSubmitting,
    setDeleteSubmitting,
    deleteErr,
    setDeleteErr,
    filteredListReady,
    setFilteredListReady,
    allCompletedRows,
    setAllCompletedRows,
    showToast,
    shown,
    goingIds,
    router,
    searchParams,
    filtersActive,
    showFilters,
    flip,
    openExerciseId,
    clearHistoryFilters,
    openExerciseMissing,
    openExerciseHiddenByFilters,
    selected,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDeleteExercise,
  };
}
