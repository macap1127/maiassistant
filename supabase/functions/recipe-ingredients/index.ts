// Returns a list of grocery ingredients for a given recipe/dish using Lovable AI.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { dish, servings } = await req.json();
    if (!dish || typeof dish !== "string") {
      return new Response(JSON.stringify({ error: "dish required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You list grocery shopping ingredients for recipes. Use common pantry-friendly names. Respond ONLY via the tool." },
          { role: "user", content: `List the grocery ingredients to make ${dish}${servings ? ` for ${servings} servings` : ""}. Skip basic pantry staples like salt, pepper, water unless central.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "list_ingredients",
            description: "Return ingredients to buy.",
            parameters: {
              type: "object",
              properties: {
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      quantity: { type: "string" },
                    },
                    required: ["name"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["ingredients"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "list_ingredients" } },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error", resp.status, text);
      return new Response(JSON.stringify({ error: `AI error: ${resp.status}`, ingredients: [] }), {
        status: resp.status === 429 || resp.status === 402 ? resp.status : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const tc = json?.choices?.[0]?.message?.tool_calls?.[0];
    let ingredients: { name: string; quantity?: string }[] = [];
    if (tc?.function?.arguments) {
      try {
        const parsed = JSON.parse(tc.function.arguments);
        if (Array.isArray(parsed.ingredients)) {
          ingredients = parsed.ingredients
            .filter((i: any) => i?.name)
            .map((i: any) => ({ name: String(i.name).slice(0, 80), quantity: i.quantity ? String(i.quantity).slice(0, 40) : undefined }));
        }
      } catch (e) { console.error("parse fail", e); }
    }

    return new Response(JSON.stringify({ dish, ingredients }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recipe-ingredients error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown", ingredients: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
