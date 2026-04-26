// Categorizes a grocery item name into one of a fixed set of categories.
// Uses Lovable AI Gateway with tool-calling for structured output.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat",
  "Bakery",
  "Pantry",
  "Frozen",
  "Beverages",
  "Household",
  "Other",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return new Response(JSON.stringify({ category: "Other" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ category: "Other" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content:
                "You categorize grocery items into exactly one category. Respond only via the provided tool.",
            },
            {
              role: "user",
              content: `Categorize this grocery item: "${name}"`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "set_category",
                description: "Assign the grocery item to one category.",
                parameters: {
                  type: "object",
                  properties: {
                    category: {
                      type: "string",
                      enum: [...CATEGORIES],
                    },
                  },
                  required: ["category"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "set_category" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify({
            category: "Other",
            error:
              response.status === 429
                ? "Rate limited"
                : "AI credits exhausted",
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      return new Response(JSON.stringify({ category: "Other" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let category = "Other";
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (CATEGORIES.includes(parsed.category)) {
          category = parsed.category;
        }
      } catch {
        // fall through
      }
    }

    return new Response(JSON.stringify({ category }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("categorize-grocery error", err);
    return new Response(JSON.stringify({ category: "Other" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
