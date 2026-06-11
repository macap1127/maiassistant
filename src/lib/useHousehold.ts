import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Tier = "basic" | "family" | "family_plus";

export const TIER_INFO: Record<Tier, { label: string; price: number; logins: number; minutes: number; seconds: number }> = {
  basic: { label: "Basic", price: 9, logins: 1, minutes: 30, seconds: 1800 },
  family: { label: "Family", price: 29, logins: 4, minutes: 120, seconds: 7200 },
  family_plus: { label: "Family Plus", price: 49, logins: 6, minutes: 240, seconds: 14400 },
};

export interface HouseholdState {
  id: string;
  name: string;
  ownerUserId: string;
  subscriptionTier: Tier;
  subscriptionStatus: string;
  voiceSecondsUsed: number;
  voiceSecondsLimit: number;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  accessLocked: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  hasUsedTrial: boolean;
  isOwner: boolean;
  memberCount: number;
  assistantLanguage: string;
  aiCalendarImportsUsed: number;
  aiCalendarImportsPeriodStart: string | null;
  // Derived:
  hasAccess: boolean;          // can use paid features right now
  isInTrial: boolean;          // free trial window, no Stripe sub yet
  trialDaysLeft: number | null;
}

function deriveAccess(h: any): { hasAccess: boolean; isInTrial: boolean; trialDaysLeft: number | null } {
  // CLOSED-TEST OVERRIDE: grant full access to everyone during the closed beta.
  // To restore paywall logic, remove this block and uncomment the original logic below.
  const now = Date.now();
  const trialEnd = h.trial_ends_at ? new Date(h.trial_ends_at).getTime() : null;
  const inTrial = !h.stripe_subscription_id && !!trialEnd && trialEnd > now;
  const trialDaysLeft = inTrial && trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / 86400000)) : null;
  return { hasAccess: true, isInTrial: inTrial, trialDaysLeft };

  /* ORIGINAL PAYWALL LOGIC — re-enable after closed testing:
  const periodEnd = h.current_period_end ? new Date(h.current_period_end).getTime() : null;
  let hasAccess = false;
  if (!h.access_locked) {
    if (["active", "trialing", "past_due"].includes(h.subscription_status) && (!periodEnd || periodEnd > now)) hasAccess = true;
    else if (h.subscription_status === "canceled" && periodEnd && periodEnd > now) hasAccess = true;
    else if (inTrial) hasAccess = true;
  }
  return { hasAccess, isInTrial: inTrial, trialDaysLeft };
  */
}

export const useHousehold = () => {
  const { user } = useAuth();
  const [household, setHousehold] = useState<HouseholdState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setHousehold(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: memRow } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!memRow) {
      setHousehold(null);
      setLoading(false);
      return;
    }
    const { data: h } = await supabase
      .from("households")
      .select("*")
      .eq("id", memRow.household_id)
      .maybeSingle();
    const { count } = await supabase
      .from("household_members")
      .select("*", { count: "exact", head: true })
      .eq("household_id", memRow.household_id);
    if (h) {
      const derived = deriveAccess(h);
      setHousehold({
        id: h.id,
        name: h.name,
        ownerUserId: h.owner_user_id,
        subscriptionTier: (h.subscription_tier ?? "basic") as Tier,
        subscriptionStatus: h.subscription_status ?? "trialing",
        voiceSecondsUsed: h.voice_seconds_used ?? 0,
        voiceSecondsLimit: h.voice_seconds_limit ?? 1800,
        currentPeriodEnd: h.current_period_end,
        trialEndsAt: (h as any).trial_ends_at ?? null,
        cancelAtPeriodEnd: (h as any).cancel_at_period_end ?? false,
        accessLocked: (h as any).access_locked ?? false,
        stripeCustomerId: h.stripe_customer_id,
        stripeSubscriptionId: h.stripe_subscription_id,
        hasUsedTrial: (h as any).has_used_trial ?? false,
        isOwner: h.owner_user_id === user.id,
        memberCount: count ?? 1,
        assistantLanguage: (h as any).assistant_language ?? "en",
        aiCalendarImportsUsed: (h as any).ai_calendar_imports_used ?? 0,
        aiCalendarImportsPeriodStart: (h as any).ai_calendar_imports_period_start ?? null,
        ...derived,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime: refetch on any household row change
  useEffect(() => {
    if (!household?.id) return;
    const channel = supabase
      .channel(`household-billing-${household.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "households", filter: `id=eq.${household.id}` },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [household?.id, refresh]);

  return { household, loading, refresh };
};
