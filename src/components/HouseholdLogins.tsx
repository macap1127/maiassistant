import { useEffect, useState } from "react";
import { Copy, Trash2, UserPlus, Crown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useHousehold, TIER_INFO } from "@/lib/useHousehold";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface InviteRow {
  id: string;
  invite_code: string;
  email: string | null;
  expires_at: string;
  accepted_at: string | null;
}

interface MemberRow {
  user_id: string;
  role: string;
  created_at: string;
}

interface FamilyMemberRow {
  id: string;
  name: string;
  user_id: string | null;
}

export default function HouseholdLogins() {
  const { user } = useAuth();
  const { household, refresh } = useHousehold();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberRow[]>([]);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState(false);

  const loadAll = async () => {
    if (!household) return;
    const { data: invs } = await supabase
      .from("household_invites")
      .select("id, invite_code, email, expires_at, accepted_at")
      .eq("household_id", household.id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    setInvites(invs ?? []);
    const { data: mems } = await supabase
      .from("household_members")
      .select("user_id, role, created_at")
      .eq("household_id", household.id)
      .order("created_at", { ascending: true });
    setMembers(mems ?? []);
    const { data: fam } = await supabase
      .from("family_members")
      .select("id, name, user_id")
      .eq("household_id", household.id)
      .order("name");
    setFamilyMembers((fam ?? []) as FamilyMemberRow[]);
  };

  useEffect(() => {
    void loadAll();
  }, [household?.id]);


  if (!household) return null;
  const tier = TIER_INFO[household.subscriptionTier];
  const atLimit = household.memberCount >= tier.logins;

  const createInvite = async () => {
    if (!household.isOwner || !user) return;
    if (atLimit) {
      toast({ variant: "destructive", title: "Login limit reached", description: `Your ${tier.label} plan allows ${tier.logins} login${tier.logins === 1 ? "" : "s"}. Upgrade to add more.` });
      return;
    }
    setCreating(true);
    const trimmedEmail = email.trim();
    const { data, error } = await supabase
      .from("household_invites")
      .insert({
        household_id: household.id,
        invited_by: user.id,
        email: trimmedEmail || null,
      })
      .select("id, invite_code, expires_at")
      .single();
    setCreating(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't create invite", description: error.message });
      return;
    }
    setEmail("");
    void loadAll();
    const link = `${window.location.origin}/invite/${data.invite_code}`;

    if (trimmedEmail) {
      const inviterName =
        (user.user_metadata as any)?.full_name ||
        (user.user_metadata as any)?.name ||
        user.email?.split("@")[0] ||
        "A family member";
      const expiresAt = new Date(data.expires_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const { error: emailError } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "household-invite",
            recipientEmail: trimmedEmail,
            idempotencyKey: `household-invite-${data.id}`,
            templateData: {
              inviterName,
              householdName: household.name,
              inviteCode: data.invite_code,
              inviteUrl: link,
              expiresAt,
            },
          },
        },
      );
      if (emailError) {
        void navigator.clipboard.writeText(link).catch(() => {});
        toast({
          variant: "destructive",
          title: "Invite created, but email failed",
          description: `${emailError.message}. Link copied to clipboard instead.`,
        });
      } else {
        toast({
          title: "Invite sent",
          description: `Email sent to ${trimmedEmail}.`,
        });
      }
    } else {
      void navigator.clipboard.writeText(link).catch(() => {});
      toast({ title: "Invite link copied", description: link });
    }
  };

  const revoke = async (id: string) => {
    await supabase.from("household_invites").delete().eq("id", id);
    void loadAll();
  };

  const removeMember = async (uid: string) => {
    if (uid === household.ownerUserId) return;
    await supabase.from("household_members").delete().eq("household_id", household.id).eq("user_id", uid);
    void loadAll();
    void refresh();
  };

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/invite/${code}`;
    void navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: link });
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 mb-4 animate-slide-up">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-primary" />
        <h2 className="font-medium text-sm">Logins</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {household.memberCount} / {tier.logins} on {tier.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        People who can sign in to this household.
      </p>

      <div className="space-y-2 mb-3">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs">
              {m.user_id === household.ownerUserId ? <Crown className="w-3.5 h-3.5 text-warning" /> : "👤"}
            </div>
            <span className="flex-1 truncate font-mono text-xs">
              {m.user_id === user?.id ? "You" : m.user_id.slice(0, 8) + "…"}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.role}</span>
            {household.isOwner && m.user_id !== household.ownerUserId && (
              <button onClick={() => removeMember(m.user_id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {household.isOwner && (
        <>
          {invites.length > 0 && (
            <div className="space-y-2 mb-3 pt-3 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending invites</p>
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 text-sm">
                  <code className="text-xs bg-secondary rounded px-2 py-1">{inv.invite_code}</code>
                  <span className="flex-1 truncate text-xs text-muted-foreground">{inv.email || "any email"}</span>
                  <button onClick={() => copyLink(inv.invite_code)} className="text-muted-foreground hover:text-primary" aria-label="Copy link">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => revoke(inv.id)} className="text-muted-foreground hover:text-destructive" aria-label="Revoke">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {atLimit ? (
            <button
              onClick={() => navigate("/pricing")}
              className="w-full bg-warning/15 text-warning-foreground rounded-xl py-2 text-xs font-medium hover:opacity-90"
            >
              Upgrade to add more logins
            </button>
          ) : (
            <div className="flex gap-2 pt-3 border-t border-border">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={createInvite}
                disabled={creating}
                className="bg-primary text-primary-foreground rounded-xl px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Invite
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
