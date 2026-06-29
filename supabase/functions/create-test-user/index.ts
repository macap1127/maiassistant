import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = "appreview@miafamilyassistant.com";
  const password = "TestMia1234";

  // Try to find existing user
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === email);

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    return new Response(
      JSON.stringify({ status: "updated", id: existing.id, error: error?.message }),
      { headers: { "content-type": "application/json" } }
    );
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "App Reviewer" },
  });

  return new Response(
    JSON.stringify({ status: "created", id: data?.user?.id, error: error?.message }),
    { headers: { "content-type": "application/json" } }
  );
});
