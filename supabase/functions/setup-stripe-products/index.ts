// One-shot setup: assigns the SaaS tax code to all Mai products.
// Required for managed_payments / automatic_tax to work.
// Invoke via Settings page (owner only) or `supabase functions invoke setup-stripe-products`.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const SAAS_TAX_CODE = "txcd_10103001"; // Software as a Service

const LOOKUP_KEYS = [
  "mia_basic_monthly", "mia_basic_yearly",
  "mia_family_monthly", "mia_family_yearly",
  "mia_family_plus_monthly", "mia_family_plus_yearly",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    // Owner-only
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token ?? "");
    if (authError || !user) throw new Error("Unauthorized");

    const { environment } = await req.json();
    const stripe = createStripeClient(environment as StripeEnv);

    const updated: string[] = [];
    for (const key of LOOKUP_KEYS) {
      const prices = await stripe.prices.list({ lookup_keys: [key], limit: 1 });
      const price = prices.data[0];
      if (!price) continue;
      const productId = typeof price.product === "string" ? price.product : price.product.id;
      await stripe.products.update(productId, { tax_code: SAAS_TAX_CODE });
      updated.push(`${key} → ${productId}`);
    }

    return new Response(JSON.stringify({ ok: true, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("setup-stripe-products error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
