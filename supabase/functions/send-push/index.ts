// Send push notifications via Firebase Cloud Messaging (HTTP v1 API).
// Requires secret FIREBASE_SERVICE_ACCOUNT containing the service account JSON.
//
// Body: { user_ids?: string[], tokens?: string[], title: string, body: string, data?: Record<string,string> }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- Google OAuth (JWT bearer) ----
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getAccessToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    )
  );
  const toSign = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(toSign));
  const jwt = `${toSign}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const saRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!saRaw) throw new Error("FIREBASE_SERVICE_ACCOUNT secret is not set");
    const sa = JSON.parse(saRaw) as { client_email: string; private_key: string; project_id: string };

    const { user_ids, tokens: explicitTokens, title, body, data } = await req.json();
    if (!title || !body) throw new Error("title and body are required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let tokens: string[] = Array.isArray(explicitTokens) ? [...explicitTokens] : [];
    if (Array.isArray(user_ids) && user_ids.length) {
      const { data: rows, error } = await supabase
        .from("device_tokens")
        .select("token")
        .in("user_id", user_ids);
      if (error) throw error;
      tokens.push(...rows.map((r) => r.token));
    }
    tokens = [...new Set(tokens)].filter(Boolean);
    if (!tokens.length) {
      return new Response(JSON.stringify({ sent: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken(sa);
    const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

    const results = await Promise.all(
      tokens.map(async (token) => {
        const payload = {
          message: {
            token,
            notification: { title, body },
            data: data
              ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
              : undefined,
          },
        };
        const r = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const text = await r.text();
        // Clean up invalid tokens
        if (r.status === 404 || r.status === 400) {
          if (text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT")) {
            await supabase.from("device_tokens").delete().eq("token", token);
          }
        }
        return { token: token.slice(0, 12) + "…", ok: r.ok, status: r.status, body: text };
      })
    );

    return new Response(
      JSON.stringify({ sent: results.filter((r) => r.ok).length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[send-push] error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
