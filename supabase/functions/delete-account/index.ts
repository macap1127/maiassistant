// Permanently deletes the authenticated user's account. Required by Apple
// App Store guideline 5.1.1(v). If the user owns a household, the household,
// its members, and any active Stripe subscription are removed. If they are
// just a member, they're removed from the household and the user is deleted.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function cancelStripeSub(subId: string | null, customerId: string | null, env: StripeEnv) {
  if (!subId && !customerId) return;
  try {
    const stripe = createStripeClient(env);
    if (subId) {
      await stripe.subscriptions.cancel(subId).catch(() => {});
    }
  } catch (e) {
    console.error("Stripe cancel failed (continuing):", (e as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { environment } = await req.json().catch(() => ({ environment: "sandbox" }));
    const env: StripeEnv = environment === "live" ? "live" : "sandbox";

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Find the household this user belongs to (if any).
    const { data: mem } = await admin
      .from("household_members")
      .select("household_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (mem) {
      const { data: h } = await admin
        .from("households")
        .select("id, owner_user_id, stripe_subscription_id, stripe_customer_id")
        .eq("id", mem.household_id)
        .maybeSingle();

      if (h && h.owner_user_id === user.id) {
        // Owner: cancel Stripe sub + tear down the entire household.
        await cancelStripeSub(h.stripe_subscription_id, h.stripe_customer_id, env);
        // Wipe child rows (no FK cascade in schema).
        const hid = h.id;
        await admin.from("events").delete().eq("household_id", hid);
        await admin.from("tasks").delete().eq("household_id", hid);
        await admin.from("grocery_items").delete().eq("household_id", hid);
        await admin.from("family_members").delete().eq("household_id", hid);
        await admin.from("receipts").delete().eq("household_id", hid);
        await admin.from("sms_reminder_prefs").delete().eq("household_id", hid);
        await admin.from("voice_usage_log").delete().eq("household_id", hid);
        await admin.from("household_invites").delete().eq("household_id", hid);
        await admin.from("household_members").delete().eq("household_id", hid);
        await admin.from("households").delete().eq("id", hid);
      } else {
        // Just a member: remove from the household, leave it intact.
        await admin.from("household_members").delete().eq("user_id", user.id);
        await admin.from("sms_reminder_prefs").delete().eq("user_id", user.id);
      }
    }

    // Finally, delete the auth user.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ deleted: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-account error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
