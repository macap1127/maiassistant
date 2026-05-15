// Daily event SMS reminders.
// Triggered every 15 min via pg_cron. For each opted-in user whose local time
// matches their preferred send_time (and last_sent_date != today local),
// fetch today's household events and send a Twilio SMS, gated to family/family_plus.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function localParts(tz: string) {
  // Returns { hhmm: "HH:MM", date: "YYYY-MM-DD" } in the given IANA tz
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return { hhmm: `${parts.hour}:${parts.minute}`, date: `${parts.year}-${parts.month}-${parts.day}` };
}

function fmtTime12(t?: string | null) {
  if (!t) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  let h = Number(m[1]);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${period}`;
}

function withinWindow(prefHHMM: string, nowHHMM: string, windowMin = 15): boolean {
  // Treat times as minutes-of-day; SMS goes out within the next 15 min after pref time
  const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const diff = toMin(nowHHMM) - toMin(prefHHMM);
  return diff >= 0 && diff < windowMin;
}

async function sendSms(to: string, body: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  const fromPhone = Deno.env.get("TWILIO_FROM_PHONE");
  if (!lovableKey || !twilioKey) throw new Error("Twilio not connected");
  if (!fromPhone) throw new Error("TWILIO_FROM_PHONE not set");

  const resp = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: fromPhone, Body: body }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Twilio ${resp.status}: ${JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { data: prefs, error } = await supabase
      .from("sms_reminder_prefs")
      .select("user_id, household_id, phone, send_time, timezone, last_sent_date")
      .eq("opted_in", true);
    if (error) throw error;

    let sent = 0, skipped = 0, failed = 0;
    const errors: any[] = [];

    for (const p of prefs ?? []) {
      try {
        const { hhmm: nowLocal, date: todayLocal } = localParts(p.timezone || "America/New_York");

        if (!withinWindow(p.send_time, nowLocal, 15)) { skipped++; continue; }
        if (p.last_sent_date === todayLocal) { skipped++; continue; }
        if (!p.phone) { skipped++; continue; }

        // Tier gating: only family / family_plus
        const { data: hh } = await supabase
          .from("households")
          .select("subscription_tier, name, access_locked, subscription_status")
          .eq("id", p.household_id).maybeSingle();
        if (!hh) { skipped++; continue; }
        if (hh.access_locked) { skipped++; continue; }
        if (!["family", "family_plus"].includes(hh.subscription_tier)) { skipped++; continue; }

        // Today's events
        const { data: events } = await supabase
          .from("events")
          .select("title, time, location, assigned_to")
          .eq("household_id", p.household_id)
          .eq("date", todayLocal);

        let body: string;
        if (!events || events.length === 0) {
          body = `${hh.name || "Mai"}: No events scheduled today. Have a good one!`;
        } else {
          const lines = events
            .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
            .slice(0, 8)
            .map(e => {
              const t = fmtTime12(e.time);
              const who = e.assigned_to ? ` (${e.assigned_to})` : "";
              const loc = e.location ? ` @ ${e.location}` : "";
              return `• ${t ? t + " " : ""}${e.title}${loc}${who}`;
            }).join("\n");
          body = `${hh.name || "Mai"} — Today's events:\n${lines}\n\nReply STOP to opt out.`;
        }

        await sendSms(p.phone, body);
        await supabase.from("sms_reminder_prefs")
          .update({ last_sent_date: todayLocal })
          .eq("user_id", p.user_id);
        sent++;
      } catch (e: any) {
        console.error("send failed", p.user_id, e?.message);
        failed++;
        errors.push({ user_id: p.user_id, error: e?.message });
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-event-reminders error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
