import { getCurrentUidOrThrow } from "@/lib/auth/firebase-client";
import type { CogiCollectionName } from "@/lib/db/firestore";

export function isE2EAuthBypass(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as Record<string, unknown>).__E2E_AUTH_BYPASS__
  );
}

type DocData = object;
type Listener = () => void;

/** uid -> collection -> docId -> data */
type Stores = Map<string, Map<CogiCollectionName, Map<string, DocData>>>;

/**
 * Mirrored to sessionStorage so rows survive a full page load, like real Firestore:
 * the Next dev server sometimes forces one on navigation. Each Playwright test has a
 * fresh context, so tests stay isolated.
 */
const STORAGE_KEY = "cogi:e2e-firestore";

function loadStores(): Stores {
  const out: Stores = new Map();
  try {
    const raw = isE2EAuthBypass() ? window.sessionStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return out;
    const parsed = JSON.parse(raw) as Record<string, Record<string, Record<string, DocData>>>;
    for (const [uid, cols] of Object.entries(parsed)) {
      const userStore = new Map<CogiCollectionName, Map<string, DocData>>();
      for (const [col, docs] of Object.entries(cols)) {
        userStore.set(col as CogiCollectionName, new Map(Object.entries(docs)));
      }
      out.set(uid, userStore);
    }
  } catch {
    // Unreadable or blocked storage: start empty.
  }
  return out;
}

function saveStores(): void {
  try {
    const plain: Record<string, Record<string, Record<string, DocData>>> = {};
    for (const [uid, cols] of stores) {
      plain[uid] = {};
      for (const [col, docs] of cols) plain[uid][col] = Object.fromEntries(docs);
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
  } catch {
    // Storage full or blocked: the in-memory store still works until a reload.
  }
}

const stores: Stores = loadStores();
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
  saveStores();
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
  saveStores();
  notify(uid, collection);
}

export async function e2eListCollectionRows<T extends { id: string }>(
  collection: CogiCollectionName,
): Promise<T[]> {
  const uid = getCurrentUidOrThrow();
  const col = getCollectionStore(uid, collection);
  return [...col.values()].map((row) => ({ ...row }) as T);
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
