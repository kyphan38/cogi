import { Unsubscribe, getDoc, setDoc } from "firebase/firestore";
import type { JournalEntry } from "@/lib/types/journal";
import {
  COGI_COLLECTIONS,
  listCollectionRows,
  subscribeCollectionRows,
  userDocRef,
} from "@/lib/db/firestore";
import { listRecentCompletedExercises } from "@/lib/db/exercises";

export async function putJournal(entry: JournalEntry): Promise<void> {
  await setDoc(userDocRef<JournalEntry>(COGI_COLLECTIONS.journalEntries, entry.id), entry);
}

export async function getJournalForExercise(
  exerciseId: string,
): Promise<JournalEntry | undefined> {
  const rows = await listCollectionRows<JournalEntry>(COGI_COLLECTIONS.journalEntries);
  return rows.find((row) => row.exerciseId === exerciseId);
}

export async function listJournalEntries(): Promise<JournalEntry[]> {
  return listCollectionRows<JournalEntry>(COGI_COLLECTIONS.journalEntries);
}

export function subscribeJournalEntries(
  onData: (rows: JournalEntry[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<JournalEntry>(COGI_COLLECTIONS.journalEntries, onData, onError);
}

/** Collect prompt ids used in the last `n` completed exercises (for rotation). */
export async function getPromptIdsUsedInLastNCompleted(
  n: number,
): Promise<Set<string>> {
  const exercises = await listRecentCompletedExercises(n);
  const used = new Set<string>();
  for (const ex of exercises) {
    const j = await getJournalForExercise(ex.id);
    if (j) j.promptIds.forEach((id) => used.add(id));
  }
  return used;
}

/** Last 2–3 journal text blobs for same domain (for optional AI reference line). */
export async function getRecentJournalSnippetsForDomain(
  domain: string,
  limit: number,
): Promise<string[]> {
  const journals = await listCollectionRows<JournalEntry>(COGI_COLLECTIONS.journalEntries);
  const out: string[] = [];
  for (const j of journals.sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  )) {
    const exSnapshot = await getDoc(userDocRef(COGI_COLLECTIONS.exercises, j.exerciseId));
    const ex = exSnapshot.exists() ? exSnapshot.data() as { domain?: string } : null;
    if (!ex || ex.domain !== domain) continue;
    const blob = Object.values(j.responses)
      .filter((s) => s.trim().length > 0)
      .join(" ")
      .slice(0, 400);
    if (blob.length > 10) out.push(blob);
    if (out.length >= limit) break;
  }
  return out;
}
