/**
 * Auto-unlock (a.k.a. "Passphrase unlock off").
 *
 * When enabled, the vault DEK is stored on this device so the app opens
 * without asking for a passphrase, PIN or biometric. This trades a big
 * chunk of security for convenience — anyone with access to this browser
 * profile can read the vault — so it's off by default and must be turned
 * on explicitly from Security settings.
 *
 * Implementation: after a successful unlock we export the DEK's raw bytes,
 * base64 them, and stash in localStorage under a per-user key. On the
 * next launch the lock gate imports those bytes straight back into an
 * AES-GCM CryptoKey and skips the lock screen.
 */

const STORAGE_PREFIX = "aegis.auto-unlock.v1.";

function key(userId: string) {
  return STORAGE_PREFIX + userId;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function isAutoUnlockEnabled(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!window.localStorage.getItem(key(userId));
  } catch {
    return false;
  }
}

export async function enableAutoUnlock(userId: string, dek: CryptoKey): Promise<void> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", dek));
  try {
    window.localStorage.setItem(key(userId), bytesToB64(raw));
  } finally {
    raw.fill(0);
  }
}

export function disableAutoUnlock(userId: string): { removed: boolean } {
  if (typeof window === "undefined") return { removed: false };
  const k = key(userId);
  const had = window.localStorage.getItem(k) !== null;
  try {
    window.localStorage.removeItem(k);
  } catch {
    return { removed: false };
  }
  return { removed: had };
}

export async function loadAutoUnlockKey(userId: string): Promise<CryptoKey | null> {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key(userId));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const bytes = b64ToBytes(raw);
    return await crypto.subtle.importKey(
      "raw",
      bytes as unknown as BufferSource,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
    );
  } catch {
    return null;
  }
}
