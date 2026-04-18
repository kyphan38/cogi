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
  createdAt: string;
}
