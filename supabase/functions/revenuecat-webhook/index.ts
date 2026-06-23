// RevenueCat webhook → updates households.subscription_tier/status on native IAP events.
// Configure in RevenueCat dashboard → Integrations → Webhooks:
//   URL:  https://<project>.functions.supabase.co/revenuecat-webhook
//   Authorization header: Bearer <REVENUECAT_WEBHOOK_AUTH secret>
import { createClient } from "npm:@supabase/supabase-js@2";

const PRODUCT_TO_TIER: Record<string, { tier: string; seconds: number }> = {
  mai_basic_monthly: { tier: "basic", seconds: 1800 },
  mai_basic_yearly: { tier: "basic", seconds: 1800 },
  mai_family_monthly: { tier: "family", seconds: 7200 },
  mai_family_yearly: { tier: "family", seconds: 7200 },
  mai_family_plus_monthly: { tier: "family_plus", seconds: 14400 },
  mai_family_plus_yearly: { tier: "family_plus", seconds: 14400 },
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function householdIdForUser(userId: string): Promise<string | null> {
  // Prefer owned household; fall back to first membership.
  const sb = getSupabase();
  const { data: owned } = await sb
    .from("households")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1)
    .maybeSingle();
  if (owned?.id) return owned.id as string;
  const { data: mem } = await sb
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return (mem?.household_id as string) ?? null;
}

type RCEvent = {
  type: string;
  app_user_id: string;
  product_id?: string;
  expiration_at_ms?: number;
  purchased_at_ms?: number;
  store?: string;
  environment?: string;
  cancel_reason?: string;
};

async function applyActive(ev: RCEvent, householdId: string) {
  const info = ev.product_id ? PRODUCT_TO_TIER[ev.product_id] : null;
  const periodEnd = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null;
  const periodStart = ev.purchased_at_ms ? new Date(ev.purchased_at_ms).toISOString() : null;

  const { data: current } = await getSupabase()
    .from("households")
    .select("current_period_end")
    .eq("id", householdId)
    .maybeSingle();
  const isNewPeriod =
    current?.current_period_end &&
    periodEnd &&
    new Date(periodEnd).getTime() > new Date(current.current_period_end as string).getTime();

  const update: Record<string, unknown> = {
    subscription_status: "active",
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: false,
    access_locked: false,
    has_used_trial: true,
    updated_at: new Date().toISOString(),
  };
  if (info) {
    update.subscription_tier = info.tier;
    update.voice_seconds_limit = info.seconds;
  }
  if (isNewPeriod) update.voice_seconds_used = 0;

  const { error } = await getSupabase().from("households").update(update).eq("id", householdId);
  if (error) console.error("[revenuecat-webhook] update error:", error);
}

async function applyCancelScheduled(ev: RCEvent, householdId: string) {
  const periodEnd = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null;
  await getSupabase()
    .from("households")
    .update({
      cancel_at_period_end: true,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", householdId);
}

async function applyExpired(householdId: string) {
  await getSupabase()
    .from("households")
    .update({
      subscription_status: "canceled",
      cancel_at_period_end: false,
      access_locked: true,
      voice_seconds_limit: 0,
      current_period_end: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", householdId);
}

async function applyBillingIssue(householdId: string) {
  await getSupabase()
    .from("households")
    .update({ subscription_status: "past_due", updated_at: new Date().toISOString() })
    .eq("id", householdId);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  if (!expected) {
    console.error("[revenuecat-webhook] REVENUECAT_WEBHOOK_AUTH not configured");
    return new Response("Server misconfigured", { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const presented = auth.replace(/^Bearer\s+/i, "").trim();
  if (presented !== expected.trim()) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: { event?: RCEvent };
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const ev = payload.event;
  if (!ev?.type || !ev?.app_user_id) {
    return new Response(JSON.stringify({ received: true, ignored: "no event" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("[revenuecat-webhook] event:", ev.type, "user:", ev.app_user_id, "product:", ev.product_id);

  const householdId = await householdIdForUser(ev.app_user_id);
  if (!householdId) {
    console.warn("[revenuecat-webhook] no household for user", ev.app_user_id);
    return new Response(JSON.stringify({ received: true, ignored: "no household" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (ev.type) {
      case "TEST":
        // RC dashboard test ping
        break;
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
      case "UNCANCELLATION":
      case "TEMPORARY_ENTITLEMENT_GRANT":
      case "NON_RENEWING_PURCHASE":
        await applyActive(ev, householdId);
        break;
      case "CANCELLATION":
        await applyCancelScheduled(ev, householdId);
        break;
      case "EXPIRATION":
      case "SUBSCRIPTION_PAUSED":
        await applyExpired(householdId);
        break;
      case "BILLING_ISSUE":
        await applyBillingIssue(householdId);
        break;
      default:
        console.log("[revenuecat-webhook] unhandled:", ev.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[revenuecat-webhook] error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
