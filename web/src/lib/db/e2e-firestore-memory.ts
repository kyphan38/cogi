import { getCurrentUidOrThrow } from "@/lib/auth/firebase-client";
import type { CogiCollectionName } from "@/lib/db/firestore";

export function isE2EAuthBypass(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as Record<string, unknown>).__E2E_AUTH_BYPASS__
  );
}

type DocData = Record<string, unknown>;
type Listener = () => void;

/** uid -> collection -> docId -> data */
const stores = new Map<string, Map<CogiCollectionName, Map<string, DocData>>>();
const listeners = new Map<string, Set<Listener>>();

function listenerKey(uid: string, collection: CogiCollectionName): string {
  return `${uid}:${collection}`;
}

function getCollectionStore(uid: string, collection: CogiCollectionName): Map<string, DocData> {
  if (!stores.has(uid)) stores.set(uid, new Map());
  const userStore = stores.get(uid)!;
  if (!userStore.has(collection)) userStore.set(collection, new Map());
  return userStore.get(collection)!;
}

function notify(uid: string, collection: CogiCollectionName): void {
  const key = listenerKey(uid, collection);
  const set = listeners.get(key);
  if (!set) return;
  for (const fn of set) fn();
}

export async function e2eSetDoc(
  collection: CogiCollectionName,
  docId: string,
  data: DocData,
): Promise<void> {
  const uid = getCurrentUidOrThrow();
  const col = getCollectionStore(uid, collection);
  col.set(docId, { ...data, id: docId });
  notify(uid, collection);
}

export async function e2eGetDoc<T extends DocData>(
  collection: CogiCollectionName,
  docId: string,
): Promise<T | undefined> {
  const uid = getCurrentUidOrThrow();
  const row = getCollectionStore(uid, collection).get(docId);
  return row ? ({ ...row } as T) : undefined;
}

export async function e2eDeleteDoc(
  collection: CogiCollectionName,
  docId: string,
): Promise<void> {
  const uid = getCurrentUidOrThrow();
  getCollectionStore(uid, collection).delete(docId);
  notify(uid, collection);
}

export async function e2eListCollectionRows<T extends { id: string }>(
  collection: CogiCollectionName,
): Promise<T[]> {
  const uid = getCurrentUidOrThrow();
  const col = getCollectionStore(uid, collection);
  return [...col.values()].map((row) => ({ id: row.id as string, ...row }) as T);
}

export function e2eSubscribeCollectionRows<T extends { id: string }>(
  collection: CogiCollectionName,
  onData: (rows: T[]) => void,
): () => void {
  const uid = getCurrentUidOrThrow();
  const key = listenerKey(uid, collection);

  const emit = () => {
    void e2eListCollectionRows<T>(collection).then(onData);
  };

  emit();

  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(emit);

  return () => {
    listeners.get(key)?.delete(emit);
  };
}
