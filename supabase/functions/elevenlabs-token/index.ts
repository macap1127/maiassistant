const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

    const { agentId, mode } = await req.json();
    if (!agentId) throw new Error("agentId required");

    if (mode === "voice") {
      const tokenRes = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
        { headers: { "xi-api-key": apiKey } }
      );

      if (!tokenRes.ok) {
        const text = await tokenRes.text();
        console.error("ElevenLabs token error:", tokenRes.status, text);
        return new Response(JSON.stringify({ error: text }), {
          status: tokenRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenData = await tokenRes.json();
      return new Response(JSON.stringify({ token: tokenData.token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      { headers: { "xi-api-key": apiKey } }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("ElevenLabs signed URL error:", res.status, text);
      return new Response(JSON.stringify({ error: text }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ signedUrl: data.signed_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("token function error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
