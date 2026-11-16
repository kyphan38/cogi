"use client";

export type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Internal step that shows AI feedback (the 3rd practice phase); 7 is "saved". */
export const FEEDBACK_STEP = 4;

/**
 * Where an unfinished exercise reopens. Saved before the 3-step loop it may sit on a
 * step that no longer exists: confidence (3) now lives in the last work part (the
 * perspective guess for geopolitics, else the highlight step), and journal / action
 * (5, 6) fold into AI feedback (4).
 */
export function analyticalResumeStep(
  saved: number | undefined,
  isGeopolitics: boolean,
): FlowStep {
  const s = saved ?? 1;
  if (s === 3) return isGeopolitics ? 2 : 1;
  if (s >= 5) return 4;
  return s as FlowStep;
}
