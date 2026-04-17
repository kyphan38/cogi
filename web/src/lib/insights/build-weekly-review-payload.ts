import type { Exercise } from "@/lib/types/exercise";
import {
  isAnalyticalExercise,
  isComboExercise,
  isEvaluativeExercise,
  isGenerativeExercise,
  isSequentialExercise,
  isSystemsExercise,
} from "@/lib/types/exercise";
import type { JournalEntry } from "@/lib/types/journal";
import type { RealDecisionLogEntry } from "@/lib/types/decision";
import type { ActionBridge } from "@/lib/types/action";

export const MAX_EX_SUMMARY_CHARS = 400;
export const MAX_JOURNAL_PROMPT_CHARS = 200;
export const MAX_JOURNAL_BLOB_TOTAL = 1200;
export const MAX_DECISION_TEXT_CHARS = 500;
export const MAX_ACTION_CHARS = 320;

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function exerciseSummaryForReview(ex: Exercise): string {
  if (isAnalyticalExercise(ex)) return clip(ex.passage, MAX_EX_SUMMARY_CHARS);
  if (isSequentialExercise(ex)) return clip(ex.scenario, MAX_EX_SUMMARY_CHARS);
  if (isSystemsExercise(ex)) return clip(ex.scenario, MAX_EX_SUMMARY_CHARS);
  if (isEvaluativeExercise(ex)) return clip(ex.scenario, MAX_EX_SUMMARY_CHARS);
  if (isGenerativeExercise(ex)) return clip(ex.scenario, MAX_EX_SUMMARY_CHARS);
  if (isComboExercise(ex)) return clip(ex.scenario, MAX_EX_SUMMARY_CHARS);
  return clip((ex as Exercise).title, MAX_EX_SUMMARY_CHARS);
}

export function aiSnippetForReview(ex: Exercise): string {
  const p = ex.aiPerspective?.trim() ?? "";
  if (!p) return "";
  return clip(p, MAX_EX_SUMMARY_CHARS);
}

export function journalBlobForReview(j: JournalEntry | undefined): string {
  if (!j) return "";
  const parts: string[] = [];
  for (const pid of j.promptIds) {
    const text = (j.responses[pid] ?? "").trim();
    if (!text) continue;
    parts.push(clip(text, MAX_JOURNAL_PROMPT_CHARS));
  }
  return clip(parts.join(" | "), MAX_JOURNAL_BLOB_TOTAL);
}

export interface WeeklyReviewExerciseSlice {
  type: string;
  domain: string;
  title: string;
  completedAt: string;
  summary: string;
  aiPerspectiveSnippet: string;
  journalBlob: string;
}

export interface WeeklyReviewDecisionSlice {
  text: string;
  domain: string;
  followUpNoteFilled: boolean;
}

export interface WeeklyReviewActionSlice {
  exerciseTitle: string;
  oneAction: string;
  createdAt: string;
}

export interface WeeklyReviewClientPayload {
  exercises: WeeklyReviewExerciseSlice[];
  decisions: WeeklyReviewDecisionSlice[];
  actions: WeeklyReviewActionSlice[];
  /** Counts of journal emotionLabel across the 7 exercises (when present). */
  emotionHistogram: Record<string, number>;
  /** Count of stored perspective disagreements tied to those exercise ids. */
  perspectiveDisagreementCount: number;
}

export function buildWeeklyReviewSlices(
  lastSeven: Exercise[],
  journalByExerciseId: Map<string, JournalEntry | undefined>,
  lastThreeDecisions: RealDecisionLogEntry[],
  recentActions: (ActionBridge & { exerciseTitle: string })[],
  opts?: { perspectiveDisagreementCount?: number },
): WeeklyReviewClientPayload {
  const emotionHistogram: Record<string, number> = {};
  for (const j of journalByExerciseId.values()) {
    const lab = j?.emotionLabel;
    if (!lab) continue;
    emotionHistogram[lab] = (emotionHistogram[lab] ?? 0) + 1;
  }

  const exercises: WeeklyReviewExerciseSlice[] = lastSeven.map((ex) => ({
    type: ex.type,
    domain: ex.domain,
    title: ex.title,
    completedAt: ex.completedAt ?? "",
    summary: exerciseSummaryForReview(ex),
    aiPerspectiveSnippet: aiSnippetForReview(ex),
    journalBlob: journalBlobForReview(journalByExerciseId.get(ex.id)),
  }));

  const decisions: WeeklyReviewDecisionSlice[] = lastThreeDecisions.map((d) => ({
    text: clip(d.text, MAX_DECISION_TEXT_CHARS),
    domain: d.domain,
    followUpNoteFilled: Boolean(d.followUpNote?.trim()),
  }));

  const actions: WeeklyReviewActionSlice[] = recentActions.map((a) => ({
    exerciseTitle: clip(a.exerciseTitle, 120),
    oneAction: clip(a.oneAction, MAX_ACTION_CHARS),
    createdAt: a.createdAt,
  }));

  return {
    exercises,
    decisions,
    actions,
    emotionHistogram,
    perspectiveDisagreementCount: opts?.perspectiveDisagreementCount ?? 0,
  };
}
