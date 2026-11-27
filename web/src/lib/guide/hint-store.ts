// Hint view counts and the on/off switch, per device in localStorage.
// Safari private mode throws on storage, so every access is guarded.

import { bumpHint, parseHintCounts, type HintCounts } from "@/lib/guide/hint";

const COUNTS_KEY = "cogi.hints";
const ON_KEY = "cogi.hints.on";
const EMPTY: HintCounts = {};

const listeners = new Set<() => void>();
let counts: HintCounts | null = null;
let on: boolean | null = null;
const notify = () => listeners.forEach((fn) => fn());

function readCounts(): HintCounts {
  if (counts) return counts;
  try {
    counts = parseHintCounts(localStorage.getItem(COUNTS_KEY));
  } catch {
    counts = EMPTY;
  }
  return counts;
}

function readOn(): boolean {
  if (on !== null) return on;
  try {
    on = localStorage.getItem(ON_KEY) !== "off";
  } catch {
    on = true;
  }
  return on;
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode: lives for this visit only.
  }
}

// Each hint counts once per page load, however often it renders.
const seenThisLoad = new Set<string>();

export const hintStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  counts: readCounts,
  serverCounts: () => EMPTY,
  on: readOn,
  serverOn: () => false,
  seen: (id: string) => seenThisLoad.has(id),
  bump(id: string) {
    if (seenThisLoad.has(id)) return;
    seenThisLoad.add(id);
    const next = bumpHint(readCounts(), id);
    if (next === readCounts()) return;
    counts = next;
    save(COUNTS_KEY, JSON.stringify(next));
    notify();
  },
  setOn(value: boolean) {
    on = value;
    save(ON_KEY, value ? "on" : "off");
    notify();
  },
  reset() {
    seenThisLoad.clear();
    counts = EMPTY;
    save(COUNTS_KEY, "{}");
    hintStore.setOn(true);
  },
};
