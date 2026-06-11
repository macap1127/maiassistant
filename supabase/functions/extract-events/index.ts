// Extract calendar events from an image or PDF using Lovable AI (Gemini vision).
// Family / Family Plus: unlimited. Basic: 5 imports per calendar month.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageDataUrl, source, householdId } = await req.json();
    if (!imageDataUrl) {
      return new Response(JSON.stringify({ error: "imageDataUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tier gate: only Family / Family Plus may use AI calendar import.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token || !householdId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: allowed } = await supabase.rpc("household_feature_allowed", {
      _household_id: householdId,
      _feature: "ai_calendar_import",
    });
    if (!allowed) {
      return new Response(JSON.stringify({
        error: "AI calendar import is available on the Family and Family Plus plans. Please upgrade.",
        code: "TIER_UPGRADE_REQUIRED",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const todayISO = new Date().toISOString().slice(0, 10);
    const prompt = `Today is ${todayISO}. Extract every calendar event from this image/document.
Return ONLY a JSON object: {"events":[{"title":"...","date":"YYYY-MM-DD","time":"HH:MM" or null,"location":"..." or null,"notes":"..." or null}]}.
- Resolve relative dates ("next Tuesday") using today's date.
- If a year isn't shown, infer the next upcoming occurrence.
- Skip anything that isn't a dated event.
- If nothing found, return {"events":[]}.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error", resp.status, text);
      return new Response(JSON.stringify({ error: `AI error: ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    let parsed: { events?: any[] } = {};
    try {
      parsed = match ? JSON.parse(match[0]) : {};
    } catch (e) {
      console.error("Parse failed", e, raw);
    }

    const events = (parsed.events || [])
      .filter((e) => e?.title && e?.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
      .map((e) => ({
        title: String(e.title).slice(0, 200),
        date: e.date,
        time: e.time || null,
        location: e.location || null,
        notes: e.notes || null,
        source: source || "Imported",
      }));

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-events error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
