// Push reminders: daily calendar digest (8:00 AM local) + 30-min-before event reminders.
// Schedule via pg_cron every 5 minutes. Dedup via push_send_log.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TZ = "America/New_York"; // default scheduling tz

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

function localParts(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hh: Number(p.hour),
    mm: Number(p.minute),
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
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

async function alreadySent(userId: string, kind: string, key: string) {
  const { error } = await supabase
    .from("push_send_log")
    .insert({ user_id: userId, kind, key });
  if (!error) return false;
  // 23505 = unique_violation → already sent
  if ((error as any).code === "23505") return true;
  console.error("push_send_log insert error", error);
  return true; // be safe: don't double-send on unknown errors
}

async function sendPush(userIds: string[], title: string, body: string, data?: Record<string, string>) {
  if (!userIds.length) return;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
    },
    body: JSON.stringify({ user_ids: userIds, title, body, data }),
  });
  const text = await res.text();
  if (!res.ok) console.error("send-push failed", res.status, text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const now = localParts(TZ);
    let digestSent = 0, reminderSent = 0;

    // Get all households w/ members and device tokens
    const { data: households } = await supabase
      .from("households")
      .select("id, name, access_locked");

    for (const hh of households ?? []) {
      if (hh.access_locked) continue;

      const { data: members } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", hh.id);
      const memberIds = (members ?? []).map((m) => m.user_id);
      if (!memberIds.length) continue;

      // Only members that have a device token
      const { data: tokens } = await supabase
        .from("device_tokens")
        .select("user_id")
        .in("user_id", memberIds);
      const tokenUserIds = [...new Set((tokens ?? []).map((t) => t.user_id))];
      if (!tokenUserIds.length) continue;

      // Load preferences for these users (missing row = defaults ON)
      const { data: prefRows } = await supabase
        .from("push_preferences")
        .select("user_id, daily_digest, event_reminders")
        .in("user_id", tokenUserIds);
      const prefMap = new Map<string, { daily_digest: boolean; event_reminders: boolean }>();
      for (const p of prefRows ?? []) prefMap.set(p.user_id, p as any);
      const wants = (uid: string, key: "daily_digest" | "event_reminders") => {
        const p = prefMap.get(uid);
        return p ? (p as any)[key] !== false : true;
      };


      // ===== Daily digest at 09:00 local (5-min window) =====
      if (now.hh === 9 && now.mm < 5) {
        const { data: todays } = await supabase
          .from("events")
          .select("title, time, location")
          .eq("household_id", hh.id)
          .eq("date", now.date);

        const sorted = (todays ?? []).slice().sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        const title = sorted.length
          ? `Today: ${sorted.length} event${sorted.length === 1 ? "" : "s"}`
          : "No events today";
        const body = sorted.length
          ? sorted.slice(0, 5).map((e) => `${fmtTime12(e.time) || "All day"} — ${e.title}`).join("\n")
          : "Your calendar is clear for today.";

        for (const uid of tokenUserIds) {
          if (!wants(uid, "daily_digest")) continue;
          if (await alreadySent(uid, "daily_digest", now.date)) continue;
          await sendPush([uid], title, body, { type: "daily_digest", date: now.date });
          digestSent++;
        }
      }

      // ===== 30-min-before reminders =====
      const { data: timed } = await supabase
        .from("events")
        .select("id, title, time, location")
        .eq("household_id", hh.id)
        .eq("date", now.date)
        .not("time", "is", null);

      for (const ev of timed ?? []) {
        const m = /^(\d{1,2}):(\d{2})/.exec(ev.time || "");
        if (!m) continue;
        const evMin = Number(m[1]) * 60 + Number(m[2]);
        const diff = evMin - now.minutes;
        // window 25..35 min before event
        if (diff < 25 || diff >= 35) continue;

        const title = `In 30 min: ${ev.title}`;
        const body = `${fmtTime12(ev.time)}${ev.location ? ` · ${ev.location}` : ""}`;
        for (const uid of tokenUserIds) {
          if (!wants(uid, "event_reminders")) continue;
          if (await alreadySent(uid, "event_30min", ev.id)) continue;
          await sendPush([uid], title, body, { type: "event_30min", event_id: ev.id });
          reminderSent++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, digestSent, reminderSent, now }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("push-reminders error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
