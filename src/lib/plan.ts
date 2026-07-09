/**
 * Central plan/tier feature matrix. Every gate in the app must consult this
 * file — do NOT hard-code limits or feature checks elsewhere. Server-side
 * enforcement lives in DB triggers (see `enforce_vault_accounts_per_user_limit`
 * and `enforce_family_member_cap`); this module mirrors those caps for UX.
 */

export type PlanTier = "free" | "pro" | "family";

export type PlanFeature =
  | "auto-cloud-backup"
  | "backup-history"
  | "breach-monitoring"
  | "extension-autofill"
  | "family-sharing"
  | "shared-vault"
  | "emergency-access";

export type PlanLimit =
  | "maxAccounts"
  | "maxDevices"
  | "maxTags"
  | "pushHistoryDays"
  | "familyMembers";

/**
 * Numeric caps per tier. Kept in sync with server-side triggers:
 *   - `enforce_vault_accounts_per_user_limit`: 25 free / 500 pro & family
 *   - `enforce_family_member_cap`: 6 members
 */
export const PLAN_LIMITS: Record<PlanTier, Record<PlanLimit, number>> = {
  free: {
    maxAccounts: 25,
    maxDevices: 2,
    maxTags: 5,
    pushHistoryDays: 7,
    familyMembers: 0,
  },
  pro: {
    maxAccounts: 500,
    maxDevices: Number.POSITIVE_INFINITY,
    maxTags: Number.POSITIVE_INFINITY,
    pushHistoryDays: 90,
    familyMembers: 0,
  },
  family: {
    maxAccounts: 500,
    maxDevices: Number.POSITIVE_INFINITY,
    maxTags: Number.POSITIVE_INFINITY,
    pushHistoryDays: 90,
    familyMembers: 6,
  },
};

const FEATURE_MATRIX: Record<PlanFeature, PlanTier[]> = {
  "auto-cloud-backup": ["pro", "family"],
  "backup-history": ["pro", "family"],
  "breach-monitoring": ["pro", "family"],
  "extension-autofill": ["pro", "family"],
  "family-sharing": ["family"],
  "shared-vault": ["family"],
  "emergency-access": ["family"],
};

export function hasFeature(tier: PlanTier | null | undefined, feature: PlanFeature): boolean {
  if (!tier) return false; // fail closed while loading
  return FEATURE_MATRIX[feature].includes(tier);
}

export function getLimit(tier: PlanTier | null | undefined, key: PlanLimit): number {
  return PLAN_LIMITS[tier ?? "free"][key];
}

export const TIER_LABEL: Record<PlanTier, string> = {
  free: "Free",
  pro: "Pro",
  family: "Family",
};

export const TIER_ORDER: PlanTier[] = ["free", "pro", "family"];

export function isPaidTier(tier: PlanTier | null | undefined): boolean {
  return tier === "pro" || tier === "family";
}

/**
 * A human-readable comparison used by the "See what's in Pro" sheet and
 * onboarding — keep this list in sync with FEATURE_MATRIX and PLAN_LIMITS
 * so marketing copy never drifts from enforced reality.
 */
export const COMPARISON_ROWS: ReadonlyArray<{
  label: string;
  free: string;
  pro: string;
  family: string;
}> = [
  { label: "Accounts", free: "25", pro: "500", family: "500" },
  { label: "Devices synced", free: "2", pro: "Unlimited", family: "Unlimited" },
  { label: "Auto cloud backup", free: "—", pro: "✓", family: "✓" },
  { label: "30-day backup history", free: "—", pro: "✓", family: "✓" },
  { label: "Breach monitoring", free: "—", pro: "✓", family: "✓" },
  { label: "Browser autofill", free: "—", pro: "✓", family: "✓" },
  { label: "Custom tags", free: "5", pro: "Unlimited", family: "Unlimited" },
  { label: "Push history", free: "7 days", pro: "90 days", family: "90 days" },
  { label: "Family members", free: "—", pro: "—", family: "Up to 6" },
  { label: "Shared household vault", free: "—", pro: "—", family: "✓" },
  { label: "Emergency access", free: "—", pro: "—", family: "✓" },
];
