"use client";

import { useEffect, useSyncExternalStore } from "react";

import { hintStage } from "@/lib/guide/hint";
import { hintStore } from "@/lib/guide/hint-store";

const noop = () => () => {};

/**
 * A fading hint (PLAN-guide G2). Wide screens: a margin note to the right of the
 * nearest positioned box. Its parent must not be positioned: the note keeps its own
 * spot in the flow for the top. Narrow screens: one line where it sits.
 * The static HTML has none: counts live on the device, so a gone hint must not flash.
 */
export function Hint({
  id,
  full,
  short,
}: {
  id: string;
  full: string;
  short: string;
}) {
  const counts = useSyncExternalStore(
    hintStore.subscribe,
    hintStore.counts,
    hintStore.serverCounts,
  );
  const on = useSyncExternalStore(
    hintStore.subscribe,
    hintStore.on,
    hintStore.serverOn,
  );
  const client = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (on) hintStore.bump(id);
  }, [id, on]);

  // Before this load's bump, show the view it is about to count.
  const view = (counts[id] ?? 0) + (hintStore.seen(id) ? 0 : 1);
  const stage = hintStage(view, on);
  if (!client || stage === "gone") return null;

  return (
    <p
      className="fade-in border-l border-input pl-3 text-meta text-muted-foreground xl:absolute xl:left-full xl:ml-2 xl:w-52"
      data-testid="hint"
    >
      {stage === "full" ? full : short}
    </p>
  );
}
