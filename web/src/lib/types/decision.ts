export interface RealDecisionLogEntry {
  id: string;
  text: string;
  decidedAt: string;
  domain: string;
  linkedExerciseId: string | null;
  followUpNote: string | null;
  remindOutcomeAt: string | null;
  /** When set, dashboard reminder for this decision is hidden (Firestore keeps remindOutcomeAt). */
  outcomeReminderDismissedAt?: string | null;
  /** Structured outcome review (filled when reminder fires). */
  outcomeReview?: {
    /** What actually happened? */
    actualOutcome: string;
    /** Was the original reasoning sound, even if the outcome was bad/good? */
    reasoningQuality: "sound" | "flawed" | "lucky" | "unlucky";
    /** What would you do differently with the same information you had then? */
    counterfactual: string;
    /** Which thinking pattern helped or hurt? */
    thinkingPatternNote: string;
  } | null;
  createdAt: string;
}
