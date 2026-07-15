import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function resolveOrCreateCustomer(stripe: ReturnType<typeof createStripeClient>, options: { email?: string; userId?: string }) {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

async function subscriptionExistsInEnvironment(
  stripe: ReturnType<typeof createStripeClient>,
  subscriptionId: string,
) {
  try {
    await stripe.subscriptions.retrieve(subscriptionId);
    return true;
  } catch (e: any) {
    if (e?.code === "resource_missing" || e?.raw?.code === "resource_missing") return false;
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { priceId, returnUrl, environment } = await req.json();
    if (!priceId || !returnUrl || !environment) throw new Error("Missing required fields");

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token ?? "");
    if (authError || !user) throw new Error("Unauthorized");

    const { data: mem } = await supabase.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle();
    if (!mem) throw new Error("No household");
    const householdId = mem.household_id;

    // Block creating a *second* subscription. Plan changes must go through the portal.
    const { data: h } = await supabase
      .from("households")
      .select("stripe_subscription_id, subscription_status, owner_user_id, has_used_trial")
      .eq("id", householdId)
      .maybeSingle();
    if (!h) throw new Error("Household not found");
    if (h.owner_user_id !== user.id) throw new Error("Only the owner can subscribe");
    const stripe = createStripeClient(environment as StripeEnv);
    if (h.stripe_subscription_id && ["active", "trialing", "past_due"].includes(h.subscription_status)) {
      const hasSubscriptionHere = await subscriptionExistsInEnvironment(stripe, h.stripe_subscription_id);
      if (hasSubscriptionHere) {
        throw new Error("You already have an active subscription. Use 'Manage billing' to change plans.");
      }
    }

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];

    const customerId = await resolveOrCreateCustomer(stripe, { email: user.email, userId: user.id });

    // 7-day free trial — one per household. Card is collected up-front; Stripe
    // charges automatically at the end of the trial unless the user cancels.
    const eligibleForTrial = !h.has_used_trial;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer: customerId,
      metadata: { userId: user.id, householdId },
      subscription_data: {
        metadata: { userId: user.id, householdId },
        ...(eligibleForTrial && {
          trial_period_days: 7,
          trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        }),
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
