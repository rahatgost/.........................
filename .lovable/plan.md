# Free / Pro / Family — feature separation

Aegis er 3ta tier ache (`free`, `pro`, `family`) but ekhono kono real gate nei — sob feature sobar jonno open. Ei plan e ekta clean matrix define kori, ekta central `usePlan()` hook banai, ar tarpor phase-wise 3-4 ta core feature gate kori.

## 1. Feature matrix (final)

| Feature | Free | Pro | Family |
|---|---|---|---|
| **Accounts (TOTP entries)** | 25 max | Unlimited | Unlimited |
| **Devices synced** | 2 | Unlimited | Unlimited |
| **Encrypted cloud backup** | Manual export only | Auto + 30-day history | Auto + 30-day history |
| **Vault health scan** | Basic (weak/duplicate) | + Breach monitoring (HIBP) | + Breach monitoring |
| **Browser extension** | Manual copy code | Autofill + auto-submit | Autofill + auto-submit |
| **Tags** | 5 custom | Unlimited | Unlimited |
| **Push approval history** | Last 7 days | Last 90 days | Last 90 days |
| **Family members** | — | — | Up to 6 |
| **Shared household vault** | — | — | ✓ |
| **Emergency access** | — | — | ✓ |

Non-gated (always free): core TOTP generation, offline unlock, biometrics, master passphrase, recovery kit, manual export, dark mode, i18n.

## 2. Central plan helper

New file `src/lib/plan.ts`:

- Types: `PlanTier = "free" | "pro" | "family"`, `PlanFeature` union of all gated feature keys.
- `PLAN_LIMITS` constant: numeric caps per tier (`maxAccounts`, `maxDevices`, `maxTags`, `pushHistoryDays`).
- `hasFeature(tier, feature)` — boolean check.
- `getLimit(tier, key)` — numeric limit.
- `TIER_LABEL`, `TIER_ORDER` for UI.

New hook `src/hooks/use-plan.ts`:

- Uses TanStack Query + `getMySubscription` server fn (already exists).
- Returns `{ tier, isPro, isFamily, hasFeature, getLimit, loading }`.
- Sensible default: treat as `free` while loading so gates fail closed.

## 3. Upgrade prompt component

`src/components/aegis/upgrade-prompt.tsx` — small reusable card/sheet with:
- Icon + feature name
- "This is a Pro feature" copy
- CTA button → opens the existing plan sheet on Profile (or navigates `/profile?upgrade=pro`).

Used inline anywhere a Free user hits a gate.

## 4. Enforcement — phase 1 (this PR)

Gate the 4 highest-value features:

**a. Account cap (25 for Free)**
- `src/routes/_authenticated/_locked/vault_.new.tsx` and `vault_.import.tsx`: before saving, check `accounts.length >= getLimit(tier, "maxAccounts")`. If exceeded, show `<UpgradePrompt feature="unlimited-accounts" />` instead of the save button.
- Vault tab: show a subtle "24 / 25 accounts" counter for Free users approaching cap.

**b. Auto cloud backup (Pro+)**
- `src/lib/vault-autobackup.ts` and `vault-cloud-backup.ts`: wrap the scheduled backup trigger — if `!isPro`, skip auto and only allow manual export.
- Settings backup toggle in `src/components/aegis/settings.tsx`: show as Pro-locked with upgrade prompt for Free.

**c. Breach monitoring (Pro+)**
- `src/components/vault/ScanTab.tsx` / `vault-health.tsx`: Free sees weak/duplicate; the HIBP breach section renders `<UpgradePrompt feature="breach-monitoring" />` for Free.

**d. Family members (Family only)**
- `src/routes/_authenticated/family.tsx`: if `!isFamily`, render an upgrade card instead of the invite UI. Already partially in place — formalize with `usePlan()`.

## 5. Server-side enforcement

Client gates are UX; add a lightweight server check for account cap in the vault write path so a modded client can't bypass:

- New server fn `checkAccountQuota` (or inline in existing vault sync fn) — reads user's tier from `subscriptions`, counts vault entries, rejects with a clear error if over cap.
- Backup + breach are already server-observable via subscription tier if we later add server-side scheduling; for now the client gate is enough (they're read-only reveals).

## 6. Profile UI polish

- Current profile plan row shows "25 accounts / Family sharing" — replace copy with the real matrix.
- Add a "See what's in Pro" link that opens a full comparison sheet showing the table above.
- New file `src/components/aegis/plan-comparison-sheet.tsx`.

## 7. Onboarding step alignment

Update the just-added `StepPro` copy in `src/components/onboarding/Onboarding.tsx` to match the exact matrix (currently lists 5 features — align wording with `hasFeature` keys so nothing drifts).

## 8. Not in this PR (deferred)

- Actual HIBP integration (currently the "breach monitoring" section is a placeholder — gate the UI now, wire the API in a follow-up).
- Browser extension autofill gate — lives in the extension repo, needs its own release.
- Emergency access + shared household vault — deferred to a Family v2 phase.
- Server-side per-request quota middleware — phase 1 uses point checks; phase 2 will centralize.

## Technical notes

- All limits centralized in `PLAN_LIMITS` so future tier tweaks are one-line changes.
- `usePlan()` cached via TanStack Query (5min stale) — no per-render fetch.
- `hasFeature()` fails closed on unknown/loading tier — never accidentally grants Pro.
- Upgrade prompt reuses existing `planSheet` on Profile, no duplicate paywall UI.
- No changes to `subscriptions` table schema — the tier column already drives everything.

## Files touched

New:
- `src/lib/plan.ts`
- `src/hooks/use-plan.ts`
- `src/components/aegis/upgrade-prompt.tsx`
- `src/components/aegis/plan-comparison-sheet.tsx`

Edited:
- `src/routes/_authenticated/_locked/vault_.new.tsx`
- `src/routes/_authenticated/_locked/vault_.import.tsx`
- `src/routes/_authenticated/_tabs/vault.tsx` (counter)
- `src/routes/_authenticated/_tabs/profile.tsx` (comparison sheet link + copy)
- `src/routes/_authenticated/family.tsx` (formal gate)
- `src/lib/vault-autobackup.ts`
- `src/lib/vault-cloud-backup.ts`
- `src/components/aegis/settings.tsx` (backup toggle gate)
- `src/components/vault/ScanTab.tsx` (breach section gate)
- `src/components/onboarding/Onboarding.tsx` (copy align)
- `src/lib/subscriptions.functions.ts` (add `checkAccountQuota`)
