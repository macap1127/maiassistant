import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Users, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AcceptInvitePage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState<{ household_id: string; household_name: string; expires_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("household_invites")
        .select("household_id, expires_at, accepted_at, households(name)")
        .eq("invite_code", code.toUpperCase())
        .maybeSingle();
      if (error || !data) {
        setError("This invite link is invalid.");
      } else if (data.accepted_at) {
        setError("This invite has already been used.");
      } else if (new Date(data.expires_at) < new Date()) {
        setError("This invite has expired.");
      } else {
        const joined = data.households as { name?: string } | { name?: string }[] | null;
        const hname = Array.isArray(joined) ? joined[0]?.name : joined?.name;
        setInvite({
          household_id: data.household_id,
          household_name: hname ?? "a family",
          expires_at: data.expires_at,
        });
      }
      setLoading(false);
    })();
  }, [code]);

  const accept = async () => {
    if (!invite || !user || !code) return;
    setAccepting(true);
    // Insert membership; trigger will block if at limit.
    const { error: memErr } = await supabase
      .from("household_members")
      .insert({ household_id: invite.household_id, user_id: user.id, role: "member" });
    if (memErr) {
      setAccepting(false);
      toast({ variant: "destructive", title: "Couldn't join", description: memErr.message });
      return;
    }
    await supabase
      .from("household_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq("invite_code", code.toUpperCase());
    toast({ title: "Welcome!", description: `You've joined ${invite.household_name}.` });
    navigate("/");
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full text-center">
          <X className="w-8 h-8 text-destructive mx-auto mb-3" />
          <h1 className="font-serif font-semibold text-lg mb-2">Invite unavailable</h1>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline">Go home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full text-center">
        <Users className="w-8 h-8 text-primary mx-auto mb-3" />
        <h1 className="font-serif font-semibold text-lg mb-1">You've been invited</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Join <span className="font-medium text-foreground">{invite?.household_name}</span> on Mai.
        </p>

        {!user ? (
          <button
            onClick={() => navigate(`/auth?invite=${code}`)}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90"
          >
            Sign in or create an account
          </button>
        ) : (
          <button
            onClick={accept}
            disabled={accepting}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Accept invite
          </button>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitePage;
