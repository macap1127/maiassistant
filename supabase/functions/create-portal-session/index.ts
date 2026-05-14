import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { returnUrl, environment } = await req.json();
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token ?? "");
    if (authError || !user) throw new Error("Unauthorized");

    const { data: mem } = await supabase.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle();
    if (!mem) throw new Error("No household");
    const { data: h } = await supabase.from("households").select("stripe_customer_id, owner_user_id").eq("id", mem.household_id).maybeSingle();
    if (!h?.stripe_customer_id) throw new Error("No subscription found");
    if (h.owner_user_id !== user.id) throw new Error("Only the owner can manage billing");

    const stripe = createStripeClient(environment as StripeEnv);
    const portal = await stripe.billingPortal.sessions.create({
      customer: h.stripe_customer_id,
      ...(returnUrl && { return_url: returnUrl }),
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("portal error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
