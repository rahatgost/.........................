// Offline-friendly avatar blob cache.
//
// Avatars live in a private storage bucket and are normally fetched via
// a short-lived signed URL. That breaks in two situations:
//   • The device is offline (no network → no signed URL, no image).
//   • A slow signed-URL round-trip produces a visible "empty avatar" flash
//     on every navigation.
//
// We keep the last known avatar blob per user in IndexedDB and hand back
// an object URL synchronously. The network path still runs in the
// background and refreshes the cache when a new photo is uploaded.

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "aegis-media";
const DB_VERSION = 1;
const STORE = "avatars";

interface Schema {
  [STORE]: { key: string; value: { blob: Blob; updatedAt: number } };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function getDb(): Promise<IDBPDatabase<Schema>> | null {
  if (typeof indexedDB === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

export async function putAvatarBlob(userId: string, blob: Blob): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.put(STORE, { blob, updatedAt: Date.now() }, userId);
}

export async function getAvatarBlob(userId: string): Promise<Blob | null> {
  const db = await getDb();
  if (!db) return null;
  const rec = await db.get(STORE, userId);
  return rec?.blob ?? null;
}

export async function clearAvatarBlob(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(STORE, userId);
}

/**
 * Wipe every cached avatar blob. Used by the storage-pressure evictor
 * so we free space before the OS silently evicts our vault mirror.
 * Avatars refetch on next network load, so this is safe to call any
 * time.
 */
export async function clearAllAvatarBlobs(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.clear(STORE);
  } catch {
    // best-effort
  }
}

/**
 * Try to warm-cache a signed URL: fetch the bytes and store the blob so
 * later loads (including offline) can render immediately. Failures are
 * swallowed — this is a best-effort cache prime.
 */
export async function cacheAvatarFromUrl(userId: string, url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    await putAvatarBlob(userId, blob);
    return blob;
  } catch {
    return null;
  }
}
