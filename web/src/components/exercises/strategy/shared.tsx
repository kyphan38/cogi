"use client";

import { seededHash } from "@/lib/exercise/guided-candidates";

export type FlowStep = 0 | 1 | 4 | 7;
export const FEEDBACK_STEP = 4;

export const PART_LABELS = {
  learn: "Part 1 of 3 · Learn first",
  analyze: "Part 2 of 3 · Read the game",
  predict: "Part 3 of 3 · Predict the outcome",
} as const;

/** Stable shuffle of keys by exercise id, so ranking does not start in the answer order. */
export function shuffled(keys: string[], seed: string): string[] {
  return keys
    .map((k, i) => ({ k, h: seededHash(seed, i) }))
    .sort((x, y) => x.h - y.h)
    .map((x) => x.k);
}

export function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

/** Strategic situations: game theory in real stories (PLAN-learning.md L2). */
