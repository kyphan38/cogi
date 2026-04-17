export interface RealDecisionLogEntry {
  id: string;
  text: string;
  decidedAt: string;
  domain: string;
  linkedExerciseId: string | null;
  followUpNote: string | null;
  remindOutcomeAt: string | null;
  createdAt: string;
}
