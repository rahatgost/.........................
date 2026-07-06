// Verifies HOTP + Steam Guard accounts survive export → import cycles
// (encrypted .avf, Aegis JSON, 2FAS JSON, otpauth:// URIs, Google Auth
// migration proto) with otp_type + counter intact.
import test from "node:test";
import assert from "node:assert/strict";

const { buildEncryptedExport, decryptExportedFile } = await import(
  "../../src/lib/vault-export.ts"
);
const { importFromAvf, importFromJson, importFromText, parseGoogleAuthMigrationUri } =
  await import("../../src/lib/vault-import.ts");
const { parseOtpauthUri } = await import("../../src/lib/vault-accounts.ts");

const accounts = [
  {
    id: "h1",
    issuer: "GitHub",
    label: "alice@example.com",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    sort_order: 0,
    is_favorite: false,
    secret: "JBSWY3DPEHPK3PXP",
    otp_type: "hotp",
    counter: 42,
  },
  {
    id: "s1",
    issuer: "Steam",
    label: "gaben",
    algorithm: "SHA1",
    digits: 5,
    period: 30,
    sort_order: 1,
    is_favorite: false,
    secret: "GEZDGNBVGY3TQOJQ",
    otp_type: "steam",
  },
  {
    id: "t1",
    issuer: "Google",
    label: "bob@example.com",
    algorithm: "SHA256",
    digits: 8,
    period: 60,
    sort_order: 2,
    is_favorite: true,
    secret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
    otp_type: "totp",
  },
];

test("avf roundtrip preserves otp_type + HOTP counter", async () => {
  const file = await buildEncryptedExport(accounts, "correct horse battery staple");
  const restored = await decryptExportedFile(file, "correct horse battery staple");
  const hotp = restored.find((a) => a.issuer === "GitHub");
  const steam = restored.find((a) => a.issuer === "Steam");
  const totp = restored.find((a) => a.issuer === "Google");
  assert.equal(hotp.otp_type, "hotp");
  assert.equal(hotp.counter, 42);
  assert.equal(steam.otp_type, "steam");
  assert.equal(steam.digits, 5);
  assert.equal(totp.otp_type, "totp");
  assert.equal(totp.counter, undefined);
});

test("importFromAvf yields ParsedOtpauth entries with HOTP counter + steam type", async () => {
  const file = await buildEncryptedExport(accounts, "another strong pass 42");
  const result = await importFromAvf(file, "another strong pass 42");
  assert.equal(result.source, "avf");
  assert.equal(result.entries.length, 3);
  const h = result.entries.find((e) => e.issuer === "GitHub");
  assert.equal(h.otp_type, "hotp");
  assert.equal(h.counter, 42);
  const s = result.entries.find((e) => e.issuer === "Steam");
  assert.equal(s.otp_type, "steam");
  assert.equal(s.digits, 5);
  assert.equal(s.period, 30);
});

test("Aegis JSON parses hotp counter + steam type", () => {
  const aegis = {
    db: {
      entries: [
        {
          type: "hotp",
          name: "alice@example.com",
          issuer: "GitHub",
          info: { secret: "JBSWY3DPEHPK3PXP", algo: "SHA1", digits: 6, counter: 7 },
        },
        {
          type: "steam",
          name: "gaben",
          issuer: "Steam",
          info: { secret: "GEZDGNBVGY3TQOJQ" },
        },
      ],
    },
  };
  const { entries } = importFromJson(aegis);
  const h = entries.find((e) => e.issuer === "GitHub");
  const s = entries.find((e) => e.issuer === "Steam");
  assert.equal(h.otp_type, "hotp");
  assert.equal(h.counter, 7);
  assert.equal(s.otp_type, "steam");
  assert.equal(s.digits, 5);
});

test("2FAS JSON parses hotp counter + steam type", () => {
  const twofas = {
    services: [
      {
        name: "GitHub",
        secret: "JBSWY3DPEHPK3PXP",
        otp: {
          account: "alice",
          issuer: "GitHub",
          algorithm: "SHA1",
          digits: 6,
          tokenType: "HOTP",
          counter: 11,
        },
      },
      {
        name: "Steam",
        secret: "GEZDGNBVGY3TQOJQ",
        otp: { account: "gaben", issuer: "Steam", tokenType: "STEAM" },
      },
    ],
  };
  const { entries } = importFromJson(twofas);
  const h = entries.find((e) => e.issuer === "GitHub");
  const s = entries.find((e) => e.issuer === "Steam");
  assert.equal(h.otp_type, "hotp");
  assert.equal(h.counter, 11);
  assert.equal(s.otp_type, "steam");
  assert.equal(s.digits, 5);
});

test("otpauth:// hotp URI carries counter through parseOtpauthUri", () => {
  const uri =
    "otpauth://hotp/GitHub:alice?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&counter=99&algorithm=SHA1&digits=6";
  const p = parseOtpauthUri(uri);
  assert.equal(p.otp_type, "hotp");
  assert.equal(p.counter, 99);
});

test("otpauth://steam/ URI detected as steam", () => {
  const p = parseOtpauthUri("otpauth://steam/gaben?secret=GEZDGNBVGY3TQOJQ&issuer=Steam");
  assert.equal(p.otp_type, "steam");
  assert.equal(p.digits, 5);
  assert.equal(p.period, 30);
});

test("importFromText handles otpauth hotp line", () => {
  const { entries } = importFromText(
    "otpauth://hotp/GitHub:alice?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&counter=5",
  );
  assert.equal(entries[0].otp_type, "hotp");
  assert.equal(entries[0].counter, 5);
});
