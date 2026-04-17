/** AI-generated weekly insight (Phase 5.2). */
export interface WeeklyReviewRow {
  id: string;
  createdAt: string;
  /** Total completed exercise count when this review was generated (batch marker). */
  triggeredAtCompletedExerciseCount: number;
  /** Plain markdown: patterns, calibration, blind spot, suggested focus. */
  markdown: string;
}

export type DelayedRecallStatus = "pending" | "answered" | "dismissed";

/** Queue entry: prompt user 48h after exercise completion (Phase 5.3). */
export interface DelayedRecallQueueRow {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  completedAt: string;
  /** ISO time when the card becomes eligible (completedAt + 48h). */
  dueAt: string;
  status: DelayedRecallStatus;
  userAnswer: string | null;
  feedbackText: string | null;
  dismissedAt: string | null;
  answeredAt: string | null;
}
