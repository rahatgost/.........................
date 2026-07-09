# Aegis Public API

The Aegis Public API is a **read-only** HTTP surface for third-party tools
that need to enumerate an Aegis vault — password-manager importers, backup
verifiers, dashboards, CLI helpers.

The API never returns plaintext OTP secrets. Every secret is wrapped with
the caller's vault key (own accounts) or sealed to the caller's X25519 public
key (incoming shares). Decryption happens on the client.

The full machine-readable spec lives at [`docs/openapi.yaml`](./openapi.yaml).
A ready-to-import [Postman collection](./postman/aegis-api.postman_collection.json)
is also shipped.

---

## Base URL

```
https://api.aegis-syed.lovable.app
```

All paths in this document are relative to that base.

## Authentication

Every request must carry a **personal API token** as a bearer credential:

```
Authorization: Bearer aegis_pat_<opaque-64-chars>
```

Mint a token in the app: **Settings → Developer → API tokens → New token.**
Tokens are shown once. Losing one means minting a new one — the server
does not store the plaintext.

Tokens are scoped to a single vault and to the `vault:read` + `shares:read`
scopes. There is no write scope in v1.

## Rate limits

- **60 requests per minute** per token.
- Bursts up to **10 requests per second**.
- On overflow the server returns `429 Too Many Requests` with a
  `Retry-After` header (seconds).

Check `/v1/whoami` for your current budget.

## Versioning

- Breaking changes ship under a new path prefix (`/v2/...`).
- Additive changes may land inside `/v1` and are announced in
  `docs/changelog.md`.
- We keep the previous major online for **at least 12 months** after a
  successor ships.

## Errors

All errors return JSON:

```json
{ "code": "unauthorized", "message": "Token has been revoked." }
```

| HTTP | `code`             | Meaning                                  |
| ---- | ------------------ | ---------------------------------------- |
| 401  | `unauthorized`     | Missing, invalid, or revoked token.      |
| 404  | `not_found`        | Row not visible to this token.           |
| 429  | `rate_limited`     | Per-token rate limit exceeded.           |
| 500  | `internal_error`   | Server bug. Please open an issue.        |

---

## Endpoints

### `GET /v1/whoami`

Confirms the token is valid and returns rate-limit headroom.

```bash
curl -H "Authorization: Bearer $AEGIS_TOKEN" \
  https://api.aegis-syed.lovable.app/v1/whoami
```

```json
{
  "user_id": "6a0f...b12c",
  "token_id": "d3e8...901a",
  "scopes": ["vault:read", "shares:read"],
  "rate_limit": { "requests_per_minute": 60, "remaining": 58 }
}
```

### `GET /v1/vault/accounts`

Paginated list of encrypted vault accounts. Cursors are opaque; pass the
`next_cursor` from the previous response as `?cursor=`.

```bash
curl -H "Authorization: Bearer $AEGIS_TOKEN" \
  "https://api.aegis-syed.lovable.app/v1/vault/accounts?limit=50"
```

Response shape (abbreviated):

```json
{
  "data": [
    {
      "id": "e0d1...9a7f",
      "issuer": "GitHub",
      "label": "alice@example.com",
      "otp_type": "totp",
      "algorithm": "SHA1",
      "digits": 6,
      "period": 30,
      "encrypted_secret": "BASE64...",
      "needs_rotation": false,
      "tags": ["work"],
      "created_at": "2026-07-04T10:22:00Z",
      "updated_at": "2026-07-09T08:41:11Z"
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjUwfQ=="
}
```

`encrypted_secret` is AES-GCM ciphertext wrapped with your vault key. To
turn it into TOTP codes you need the same crypto path the web client
uses; the reference implementation lives in `src/lib/vault-crypto.ts` of
the open-source repo.

### `GET /v1/vault/accounts/{accountId}`

Single-row lookup by id. Returns `404` if the token isn't allowed to see
that row.

### `GET /v1/shares/incoming`

Lists accounts that other users have shared with you. Each row includes
a `sealed_secret` (crypto_box envelope keyed to your X25519 public key)
and the sender's public key. Open the envelope client-side to obtain the
plaintext OTP URI.

---

## Client-side decryption

Because the API never returns plaintext, any integration must reuse the
Aegis crypto helpers to make sense of the payload.

Minimal TypeScript example (owned accounts):

```ts
import { unwrapVaultKey, decryptAccountSecret } from "@aegis/shared-crypto";

const vaultKey = await unwrapVaultKey(wrappedKeyFromLogin, passphrase);

for (const row of accountsPage.data) {
  const uri = await decryptAccountSecret(vaultKey, row.encrypted_secret);
  console.log(row.issuer, uri); // e.g. "otpauth://totp/..."
}
```

For incoming shares use `openSealedShare` with your X25519 private key
(kept in `IndexedDB`, exported via **Settings → Developer → Export
sharing keys**).

---

## Best practices

- Cache aggressively. Vault entries change rarely; poll no more often
  than every 30 seconds unless the user opts in.
- Persist `next_cursor`, not offsets. Cursors survive concurrent writes;
  offsets do not.
- Store tokens in the caller's OS keychain, never in a `.env` committed
  to version control.
- Never log `encrypted_secret` or `sealed_secret`. Even the wrapped form
  is a secret — leaking it lets an attacker who later obtains the vault
  key decrypt it offline.
- Handle `429` by respecting `Retry-After`. Aggressive retries will get
  the token temporarily quarantined.

## Reporting issues

Security issues → `security@aegis.example` (see `SECURITY.md`).
Everything else → GitHub Issues on the open-source repo.
