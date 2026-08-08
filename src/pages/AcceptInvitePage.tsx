import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Users, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const AcceptInvitePage = () => {
  const { t } = useTranslation();
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
      const { data, error } = await supabase.rpc("get_invite_by_code", {
        _code: code,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) {
        setError(t("invite.invalidLink"));
      } else if (row.accepted_at) {
        setError(t("invite.alreadyUsed"));
      } else if (new Date(row.expires_at) < new Date()) {
        setError(t("invite.expired"));
      } else {
        setInvite({
          household_id: row.household_id,
          household_name: row.household_name ?? t("invite.aFamily"),
          expires_at: row.expires_at,
        });
      }
      setLoading(false);
    })();
  }, [code, t]);

  const accept = async () => {
    if (!invite || !user || !code) return;
    setAccepting(true);
    // Server-side RPC validates invite code, inserts membership, and marks accepted atomically.
    const { error: rpcErr } = await supabase.rpc("accept_invite", { _code: code });
    if (rpcErr) {
      setAccepting(false);
      toast({ variant: "destructive", title: t("invite.couldntJoin"), description: rpcErr.message });
      return;
    }

    // Clean up any auto-created solo household the user owns (other than the one
    // they just joined). New signups get a default "My Family" household; if they
    // accepted an invite instead of using it, drop it so the app picks up the
    // invited household.
    const { data: ownedSolo } = await supabase
      .from("households")
      .select("id")
      .eq("owner_user_id", user.id)
      .neq("id", invite.household_id);
    for (const h of ownedSolo ?? []) {
      const { count } = await supabase
        .from("household_members")
        .select("*", { count: "exact", head: true })
        .eq("household_id", h.id);
      if ((count ?? 0) <= 1) {
        await supabase.from("households").delete().eq("id", h.id);
      }
    }

    toast({ title: t("invite.welcomeToast"), description: t("invite.joinedToast", { name: invite.household_name }) });
    navigate("/dashboard");
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
          <h1 className="font-serif font-semibold text-lg mb-2">{t("invite.inviteUnavailable")}</h1>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button onClick={() => navigate("/dashboard")} className="text-sm text-primary hover:underline">{t("invite.goHome")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full text-center">
        <Users className="w-8 h-8 text-primary mx-auto mb-3" />
        <h1 className="font-serif font-semibold text-lg mb-1">{t("invite.youveBeenInvited")}</h1>
        <p className="text-sm text-muted-foreground mb-5">
          {t("invite.joinPrefix")} <span className="font-medium text-foreground">{invite?.household_name}</span> {t("invite.joinSuffix")}
        </p>

        {!user ? (
          <button
            onClick={() => navigate(`/auth?invite=${code}`)}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90"
          >
            {t("invite.signInOrCreate")}
          </button>
        ) : (
          <button
            onClick={accept}
            disabled={accepting}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t("invite.acceptInvite")}
          </button>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitePage;
