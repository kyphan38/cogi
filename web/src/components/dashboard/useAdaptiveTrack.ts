"use client";

import { useEffect, useState } from "react";

import { logFirestoreQueryError } from "@/lib/db/firestore";
import { skipAdaptiveStep, syncAdaptiveTrack } from "@/lib/tracks/sync";
import type { AdaptiveTracksDoc } from "@/lib/tracks/adaptive";
import type { Exercise } from "@/lib/types/exercise";

/**
 * The adaptive track for Today: loaded (and closed or built when due) once the
 * exercise lists are in. Null until then, or when the read fails.
 */
export function useAdaptiveTrack(completed: Exercise[] | null, incomplete: Exercise[]) {
  const [doc, setDoc] = useState<AdaptiveTracksDoc | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!completed) return;
    let cancelled = false;
    void syncAdaptiveTrack(completed, incomplete)
      .then((d) => {
        if (!cancelled) setDoc(d);
      })
      .catch((e) => logFirestoreQueryError("useAdaptiveTrack", "syncAdaptiveTrack", e));
    return () => {
      cancelled = true;
    };
    // Sync once per load of the finished list; the unfinished list only matters for redo.
  }, [completed]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (task: () => Promise<AdaptiveTracksDoc>) => {
    if (busy) return;
    setBusy(true);
    try {
      setDoc(await task());
    } catch (e) {
      logFirestoreQueryError("useAdaptiveTrack", "update", e);
    } finally {
      setBusy(false);
    }
  };

  return {
    doc,
    busy,
    skip: (stepId: string) => run(() => skipAdaptiveStep(stepId, completed ?? [], incomplete)),
    closeStale: () => run(() => syncAdaptiveTrack(completed ?? [], incomplete, { closeStale: true })),
  };
}
