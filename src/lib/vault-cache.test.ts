// Vault cache: tags survive the online write → offline read round-trip.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearVaultCache,
  readVaultCache,
  removeFromVaultCache,
  upsertVaultCache,
  writeVaultCache,
} from "@/lib/vault-cache";
import type { VaultAccountRecord } from "@/lib/vault-accounts";

const USER = "user-123";

function row(overrides: Partial<VaultAccountRecord> = {}): VaultAccountRecord {
  return {
    id: overrides.id ?? "acc-1",
    issuer: "GitHub",
    label: "user@example.com",
    icon_slug: null,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    sort_order: 0,
    is_favorite: false,
    tags: [],
    secret_ciphertext: "\\x00",
    secret_iv: "\\x00",
    updated_at: "2026-07-06T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(async () => {
  await clearVaultCache();
});
afterEach(async () => {
  await clearVaultCache();
});

describe("vault-cache tags round-trip", () => {
  it("writes the initial snapshot and reads it back with tags intact", async () => {
    await writeVaultCache(USER, [
      row({ id: "a", tags: ["work", "aws"] }),
      row({ id: "b", tags: [] }),
    ]);
    const cached = await readVaultCache(USER);
    expect(cached).not.toBeNull();
    const byId = Object.fromEntries((cached ?? []).map((r) => [r.id, r]));
    expect(byId["a"].tags).toEqual(["work", "aws"]);
    expect(byId["b"].tags).toEqual([]);
  });

  it("upsert patches tags without touching other fields", async () => {
    await writeVaultCache(USER, [row({ id: "a", tags: ["old"], is_favorite: true })]);
    const before = (await readVaultCache(USER))?.[0];
    expect(before?.tags).toEqual(["old"]);
    await upsertVaultCache({ ...before!, tags: ["new", "tag"] });
    const after = (await readVaultCache(USER))?.[0];
    expect(after?.tags).toEqual(["new", "tag"]);
    expect(after?.is_favorite).toBe(true); // unrelated field preserved
  });

  it("returns null after a user switch (no cross-user leakage)", async () => {
    await writeVaultCache(USER, [row({ id: "a", tags: ["private"] })]);
    expect(await readVaultCache("other-user")).toBeNull();
  });

  it("removeFromVaultCache drops just the targeted row", async () => {
    await writeVaultCache(USER, [
      row({ id: "a", tags: ["x"] }),
      row({ id: "b", tags: ["y"] }),
    ]);
    await removeFromVaultCache("a");
    const cached = await readVaultCache(USER);
    expect(cached?.map((r) => r.id)).toEqual(["b"]);
    expect(cached?.[0].tags).toEqual(["y"]);
  });

  it("simulates the offline refresh path: last cached write survives reload", async () => {
    // Online load populated the cache with an updated tag list.
    await writeVaultCache(USER, [row({ id: "a", tags: ["work"] })]);
    // Later, user edits tags while online — setAccountTags mirrors via upsert.
    const cur = (await readVaultCache(USER))?.[0];
    await upsertVaultCache({ ...cur!, tags: ["work", "personal"] });
    // Now the tab reloads while offline — vault reads from cache.
    const cached = await readVaultCache(USER);
    expect(cached?.[0].tags).toEqual(["work", "personal"]);
  });
});
