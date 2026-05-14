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
  currentPeriodEnd: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  isOwner: boolean;
  memberCount: number;
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
      setHousehold({
        id: h.id,
        name: h.name,
        ownerUserId: h.owner_user_id,
        subscriptionTier: (h.subscription_tier ?? "basic") as Tier,
        subscriptionStatus: h.subscription_status ?? "trialing",
        voiceSecondsUsed: h.voice_seconds_used ?? 0,
        voiceSecondsLimit: h.voice_seconds_limit ?? 1800,
        currentPeriodEnd: h.current_period_end,
        stripeCustomerId: h.stripe_customer_id,
        stripeSubscriptionId: h.stripe_subscription_id,
        isOwner: h.owner_user_id === user.id,
        memberCount: count ?? 1,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { household, loading, refresh };
};
