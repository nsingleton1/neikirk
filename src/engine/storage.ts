export interface SaveRecord {
  storyId: string;
  version: number;
  sceneId: string;
  checkpointId?: string;
  savedAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;

const keyFor = (storyId: string) => `story-save:${storyId}`;

/** Injectable for tests; defaults to window.localStorage when available. */
export interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): KVStore | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* private mode / disabled storage */
  }
  return null;
}

export function saveCheckpoint(
  record: Omit<SaveRecord, "savedAt">,
  now: number = Date.now(),
  store: KVStore | null = defaultStore(),
): void {
  if (!store) return;
  try {
    store.setItem(keyFor(record.storyId), JSON.stringify({ ...record, savedAt: now }));
  } catch {
    /* quota / private mode — resume is best-effort */
  }
}

export function loadCheckpoint(
  storyId: string,
  version: number,
  now: number = Date.now(),
  store: KVStore | null = defaultStore(),
): SaveRecord | null {
  if (!store) return null;
  try {
    const raw = store.getItem(keyFor(storyId));
    if (!raw) return null;
    const rec = JSON.parse(raw) as SaveRecord;
    if (rec.storyId !== storyId || rec.version !== version) {
      store.removeItem(keyFor(storyId));
      return null;
    }
    if (now - rec.savedAt > TTL_MS) {
      store.removeItem(keyFor(storyId));
      return null;
    }
    return rec;
  } catch {
    return null;
  }
}

export function clearCheckpoint(
  storyId: string,
  store: KVStore | null = defaultStore(),
): void {
  if (!store) return;
  try {
    store.removeItem(keyFor(storyId));
  } catch {
    /* ignore */
  }
}
