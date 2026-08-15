// Per-plan limits, mirrored from the database triggers/functions so the UI can
// show remaining allowances before the server rejects an action.
//   - voice minutes: households.voice_seconds_limit (per billing period)
//   - AI calendar imports: can_use_ai_calendar_import() — 5/month on basic
//   - receipt scans: enforce_receipt_tier_limit() — 10/month on basic
//   - member seats: tier_member_limit()
export type Tier = "basic" | "family" | "family_plus";

export const TIER_LIMITS: Record<
  Tier,
  { aiCalendarImports: number | null; receiptScans: number | null; members: number }
> = {
  basic: { aiCalendarImports: 5, receiptScans: 10, members: 1 },
  family: { aiCalendarImports: null, receiptScans: null, members: 4 },
  family_plus: { aiCalendarImports: null, receiptScans: null, members: 6 },
};

export const limitsForTier = (tier?: string) => TIER_LIMITS[(tier as Tier) ?? "basic"] ?? TIER_LIMITS.basic;

export const startOfCurrentMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

/** Monthly counters reset on the 1st; ignore a stale period start. */
export const usedThisMonth = (used: number, periodStart: string | null | undefined) => {
  if (!periodStart) return 0;
  return new Date(periodStart) < startOfCurrentMonth() ? 0 : used;
};

export const remainingOf = (limit: number | null, used: number) =>
  limit == null ? null : Math.max(0, limit - used);
