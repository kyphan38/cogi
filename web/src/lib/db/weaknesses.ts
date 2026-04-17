import { Unsubscribe, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, listCollectionRows, subscribeCollectionRows, userDocRef } from "@/lib/db/firestore";
import type { WeaknessEntry, WeaknessThinkingGroup } from "@/lib/types/weakness";

const HITS_TO_RESOLVE = 3;

function nowIso(): string {
  return new Date().toISOString();
}

async function findRow(
  thinkingGroup: WeaknessThinkingGroup,
  type: string,
): Promise<WeaknessEntry | undefined> {
  const rows = (await listCollectionRows<WeaknessEntry>(COGI_COLLECTIONS.weaknesses))
    .filter((row) => row.thinkingGroup === thinkingGroup);
  return rows.find((w) => w.type === type);
}

export async function upsertMiss(thinkingGroup: WeaknessThinkingGroup, type: string): Promise<void> {
  const existing = await findRow(thinkingGroup, type);
  const ts = nowIso();
  if (!existing) {
    const row: WeaknessEntry = {
      id: crypto.randomUUID(),
      thinkingGroup,
      type,
      missCount: 1,
      hitCount: 0,
      status: "active",
      lastSeen: ts,
    };
    await setDoc(userDocRef<WeaknessEntry>(COGI_COLLECTIONS.weaknesses, row.id), row);
    return;
  }
  if (existing.status === "resolved") {
    await setDoc(userDocRef<WeaknessEntry>(COGI_COLLECTIONS.weaknesses, existing.id), {
      ...existing,
      status: "active",
      missCount: existing.missCount + 1,
      hitCount: 0,
      lastSeen: ts,
    });
    return;
  }
  await setDoc(userDocRef<WeaknessEntry>(COGI_COLLECTIONS.weaknesses, existing.id), {
    ...existing,
    missCount: existing.missCount + 1,
    lastSeen: ts,
  });
}

export async function recordHit(thinkingGroup: WeaknessThinkingGroup, type: string): Promise<void> {
  const existing = await findRow(thinkingGroup, type);
  if (!existing || existing.status !== "active") return;
  const hitCount = existing.hitCount + 1;
  const ts = nowIso();
  if (hitCount >= HITS_TO_RESOLVE) {
    await setDoc(userDocRef<WeaknessEntry>(COGI_COLLECTIONS.weaknesses, existing.id), {
      ...existing,
      hitCount,
      status: "resolved",
      lastSeen: ts,
    });
    return;
  }
  await setDoc(userDocRef<WeaknessEntry>(COGI_COLLECTIONS.weaknesses, existing.id), {
    ...existing,
    hitCount,
    lastSeen: ts,
  });
}

/** Distinct weakness `type` strings for active rows in this thinking group (newest bias via sort). */
export async function listActiveWeaknessTypes(
  thinkingGroup: WeaknessThinkingGroup,
  limit: number,
): Promise<string[]> {
  const rows = (await listCollectionRows<WeaknessEntry>(COGI_COLLECTIONS.weaknesses))
    .filter((row) => row.thinkingGroup === thinkingGroup);
  const active = rows.filter((w) => w.status === "active");
  active.sort((a, b) => b.missCount - a.missCount || b.lastSeen.localeCompare(a.lastSeen));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of active) {
    if (seen.has(w.type)) continue;
    seen.add(w.type);
    out.push(w.type);
    if (out.length >= limit) break;
  }
  return out;
}

/** Dashboard: top active weaknesses across all thinking groups. */
export async function listTopActiveWeaknesses(limit: number): Promise<WeaknessEntry[]> {
  const rows = await listCollectionRows<WeaknessEntry>(COGI_COLLECTIONS.weaknesses);
  const active = rows.filter((w) => w.status === "active");
  active.sort((a, b) => b.missCount - a.missCount || b.lastSeen.localeCompare(a.lastSeen));
  return active.slice(0, limit);
}

export function subscribeTopActiveWeaknesses(
  limit: number,
  onData: (rows: WeaknessEntry[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<WeaknessEntry>(
    COGI_COLLECTIONS.weaknesses,
    (rows) => {
      const active = rows.filter((row) => row.status === "active");
      active.sort((a, b) => b.missCount - a.missCount || b.lastSeen.localeCompare(a.lastSeen));
      onData(active.slice(0, limit));
    },
    onError,
  );
}
