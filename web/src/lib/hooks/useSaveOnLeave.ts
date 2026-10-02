"use client";

import { useEffect, useState } from "react";

/**
 * One pending save that can be run early. Exercise flows autosave 2s after the last
 * change; without this, leaving the page inside that window lost the last edits.
 */
export interface PendingSave {
  /** Replace the pending save (the newest state wins). */
  set(save: () => void): void;
  /** Drop it, e.g. once the exercise is finished, so a stale row is never rewritten. */
  clear(): void;
  /** Run it now if there is one. */
  flush(): void;
}

export function createPendingSave(): PendingSave {
  let pending: (() => void) | null = null;
  return {
    set(save) {
      pending = save;
    },
    clear() {
      pending = null;
    },
    flush() {
      const save = pending;
      pending = null;
      save?.();
    },
  };
}

/** A PendingSave that flushes when the tab is hidden, the page unloads, or the flow unmounts. */
export function useSaveOnLeave(): PendingSave {
  const [pending] = useState(createPendingSave);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") pending.flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", pending.flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", pending.flush);
      pending.flush();
    };
  }, [pending]);
  return pending;
}
