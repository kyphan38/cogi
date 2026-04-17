import Dexie, { type Table } from "dexie";
import type { Exercise } from "@/lib/types/exercise";
import type { JournalEntry } from "@/lib/types/journal";
import type { ActionBridge } from "@/lib/types/action";
import type { RealDecisionLogEntry } from "@/lib/types/decision";
import type { ConfidenceRecord } from "@/lib/types/exercise";
import type { WeeklyReviewRow, DelayedRecallQueueRow } from "@/lib/types/insights";
import type { PerspectiveDisagreementRow } from "@/lib/types/disagreement";
import type { WeaknessEntry } from "@/lib/types/weakness";

export interface AppSettingsRow {
  id: "app";
  userContext: string;
  /** Default true when omitted (recall on). */
  delayedRecallEnabled?: boolean;
  /** After generating a weekly review at completed count C, persist C to avoid duplicates. */
  weeklyReviewLastCompletedCount?: number;
  /**
   * Phase 7 — when false (default), rolling tier + weakness queue are computed but not sent to `/api/ai`.
   * Ship-safe until you validate value in production use.
   */
  adaptiveDifficultyEnabled?: boolean;
}

export class ThinkingDB extends Dexie {
  exercises!: Table<Exercise>;
  journalEntries!: Table<JournalEntry>;
  confidenceRecords!: Table<ConfidenceRecord>;
  actions!: Table<ActionBridge>;
  decisions!: Table<RealDecisionLogEntry>;
  settings!: Table<AppSettingsRow>;
  weeklyReviews!: Table<WeeklyReviewRow>;
  delayedRecallQueue!: Table<DelayedRecallQueueRow>;
  perspectiveDisagreements!: Table<PerspectiveDisagreementRow>;
  weaknesses!: Table<WeaknessEntry>;

  constructor() {
    super("thinking_training_db");
    this.version(1).stores({
      exercises: "id, type, domain, createdAt, completedAt",
      journalEntries: "id, exerciseId, createdAt",
      confidenceRecords: "id, exerciseId, createdAt",
      actions: "id, exerciseId, createdAt",
      decisions: "id, domain, decidedAt, createdAt",
      settings: "id",
    });
    this.version(2).stores({
      weeklyReviews: "id, createdAt, triggeredAtCompletedExerciseCount",
      delayedRecallQueue: "id, exerciseId, status, dueAt, completedAt",
    });
    this.version(3).stores({
      // No index changes; v3 is for additive optional fields such as JournalEntry.emotionLabel.
    });
    this.version(4).stores({
      perspectiveDisagreements: "id, exerciseId, kind, section, pointId, createdAt",
    });
    this.version(5).stores({
      weaknesses: "id, thinkingGroup, type, status, lastSeen",
    });
  }
}

let singleton: ThinkingDB | null = null;

export function getDb(): ThinkingDB {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!singleton) {
    singleton = new ThinkingDB();
  }
  return singleton;
}
