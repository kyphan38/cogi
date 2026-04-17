import { getDb } from "@/lib/db/schema";
import type { JournalEntry } from "@/lib/types/journal";
import { listRecentCompletedExercises } from "@/lib/db/exercises";

export async function putJournal(entry: JournalEntry): Promise<void> {
  await getDb().journalEntries.put(entry);
}

export async function getJournalForExercise(
  exerciseId: string,
): Promise<JournalEntry | undefined> {
  return getDb().journalEntries.where("exerciseId").equals(exerciseId).first();
}

/** Collect prompt ids used in the last `n` completed exercises (for rotation). */
export async function getPromptIdsUsedInLastNCompleted(
  n: number,
): Promise<Set<string>> {
  const exercises = await listRecentCompletedExercises(n);
  const used = new Set<string>();
  for (const ex of exercises) {
    const j = await getDb().journalEntries.where("exerciseId").equals(ex.id).first();
    if (j) j.promptIds.forEach((id) => used.add(id));
  }
  return used;
}

/** Last 2–3 journal text blobs for same domain (for optional AI reference line). */
export async function getRecentJournalSnippetsForDomain(
  domain: string,
  limit: number,
): Promise<string[]> {
  const journals = await getDb().journalEntries.toArray();
  const out: string[] = [];
  for (const j of journals.sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  )) {
    const ex = await getDb().exercises.get(j.exerciseId);
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
