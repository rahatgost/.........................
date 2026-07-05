// Offline-safe queue for pending tag updates.
//
// When setAccountTags() cannot reach the server (offline, network error),
// we persist the desired tag list to localStorage, mirror it optimistically
// to the IndexedDB vault cache, and retry on the next `online` event or the
// next successful vault fetch. This means a user editing tags on a subway
// never loses their change — it just syncs when the tunnel ends.
//
// Only tag updates are queued: TOTP secrets, deletes, and creates still
// require an online round-trip because they touch encrypted material or
// referential state.

const QUEUE_KEY = "aegis.tag-queue.v1";

export interface QueuedTagUpdate {
  id: string;
  tags: string[];
  queuedAt: number;
}

type QueueMap = Record<string, QueuedTagUpdate>;

function safeGetStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readQueue(): QueueMap {
  const storage = safeGetStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(QUEUE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as QueueMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeQueue(map: QueueMap): void {
  const storage = safeGetStorage();
  if (!storage) return;
  try {
    if (Object.keys(map).length === 0) storage.removeItem(QUEUE_KEY);
    else storage.setItem(QUEUE_KEY, JSON.stringify(map));
  } catch {
    // Best-effort — a quota error is fine; the DB write already succeeded
    // OR will be retried on next tag edit.
  }
}

/** Push a pending tag update (last-writer-wins per account). */
export function enqueueTagUpdate(id: string, tags: string[]): void {
  const map = readQueue();
  map[id] = { id, tags, queuedAt: Date.now() };
  writeQueue(map);
}

/** Drop a pending tag update once the server has accepted it. */
export function dequeueTagUpdate(id: string): void {
  const map = readQueue();
  if (!(id in map)) return;
  delete map[id];
  writeQueue(map);
}

/** List all pending tag updates (order not significant). */
export function listQueuedTagUpdates(): QueuedTagUpdate[] {
  return Object.values(readQueue());
}

export function hasQueuedTagUpdates(): boolean {
  return Object.keys(readQueue()).length > 0;
}

export function clearTagQueue(): void {
  writeQueue({});
}

/**
 * Try to flush all pending tag updates against the server. Returns the
 * updates that were successfully synced. Errors on individual rows are
 * swallowed and left in the queue for the next retry.
 */
export async function flushQueuedTagUpdates(
  applier: (id: string, tags: string[]) => Promise<void>,
): Promise<QueuedTagUpdate[]> {
  const pending = listQueuedTagUpdates();
  const synced: QueuedTagUpdate[] = [];
  for (const entry of pending) {
    try {
      await applier(entry.id, entry.tags);
      dequeueTagUpdate(entry.id);
      synced.push(entry);
    } catch {
      // Leave in queue; try again next flush.
    }
  }
  return synced;
}
