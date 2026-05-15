// Extract structured receipt details from a photo using Lovable AI (Gemini vision).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageDataUrl } = await req.json();
    if (!imageDataUrl) {
      return new Response(JSON.stringify({ error: "imageDataUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const todayISO = new Date().toISOString().slice(0, 10);
    const prompt = `You are reading a retail receipt photo. Today is ${todayISO}.
Return ONLY a JSON object with these fields:
{
  "store": "store/merchant name as printed (best guess)",
  "purchase_date": "YYYY-MM-DD or null if not visible",
  "total": number (final total paid, no currency symbol) or null,
  "currency": "ISO code like USD, EUR, GBP — default USD if unclear",
  "items_summary": "short comma-separated list of the main line items (max 200 chars)",
  "notes": "anything else useful like payment method, last 4 of card, or null"
}
Be conservative — use null when you cannot read a field reliably. Do not invent values.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI error: ${resp.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    let parsed: any = {};
    try { parsed = match ? JSON.parse(match[0]) : {}; } catch (e) { console.error("parse fail", e, raw); }

    const result = {
      store: typeof parsed.store === "string" ? parsed.store.slice(0, 120) : "",
      purchase_date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.purchase_date) ? parsed.purchase_date : null,
      total: typeof parsed.total === "number" && isFinite(parsed.total) ? parsed.total : null,
      currency: typeof parsed.currency === "string" ? parsed.currency.slice(0, 6).toUpperCase() : "USD",
      items_summary: typeof parsed.items_summary === "string" ? parsed.items_summary.slice(0, 300) : "",
      notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 300) : "",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-receipt error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
