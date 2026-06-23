import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  }
  return _supabase;
}

const PRICE_TO_TIER: Record<string, { tier: string; seconds: number }> = {
  mia_basic_monthly: { tier: "basic", seconds: 1800 },
  mia_basic_yearly: { tier: "basic", seconds: 1800 },
  mia_family_monthly: { tier: "family", seconds: 7200 },
  mia_family_yearly: { tier: "family", seconds: 7200 },
  mia_family_plus_monthly: { tier: "family_plus", seconds: 14400 },
  mia_family_plus_yearly: { tier: "family_plus", seconds: 14400 },
};

function priceIdFromItem(item: any): string | null {
  return item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || null;
}

async function applySubscription(subscription: any) {
  const householdId = subscription.metadata?.householdId;
  if (!householdId) {
    console.error("No householdId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceKey = priceIdFromItem(item);
  const tierInfo = priceKey ? PRICE_TO_TIER[priceKey] : null;

  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const { data: current } = await getSupabase()
    .from("households")
    .select("current_period_end, voice_seconds_used")
    .eq("id", householdId)
    .maybeSingle();
  const newEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
  const isNewPeriod =
    current?.current_period_end &&
    newEnd &&
    new Date(newEnd).getTime() > new Date(current.current_period_end as string).getTime();

  const update: Record<string, any> = {
    subscription_status: subscription.status,
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: newEnd,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    access_locked: false, // any active/updated sub unlocks access
    has_used_trial: true, // one trial per household, ever
    updated_at: new Date().toISOString(),
  };
  if (tierInfo) {
    update.subscription_tier = tierInfo.tier;
    update.voice_seconds_limit = tierInfo.seconds;
  }
  if (isNewPeriod) update.voice_seconds_used = 0;

  const { error } = await getSupabase().from("households").update(update).eq("id", householdId);
  if (error) console.error("households update error:", error);
}

// Subscription fully ended → lock everything (per user choice).
async function cancelSubscription(subscription: any) {
  const householdId = subscription.metadata?.householdId;
  if (!householdId) return;
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

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  console.log("[payments-webhook] event:", event.type);
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await applySubscription(event.data.object);
      break;
    case "customer.subscription.deleted":
      await cancelSubscription(event.data.object);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
