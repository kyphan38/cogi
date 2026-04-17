export interface JournalEntry {
  id: string;
  exerciseId: string;
  promptIds: string[];
  aiReferenceLine: string | null;
  responses: Record<string, string>;
  /** Optional affect label per Phase 6.3. */
  emotionLabel?: "anxious" | "excited" | "frustrated" | "confident" | "uncertain" | "defensive" | "neutral";
  createdAt: string;
}
