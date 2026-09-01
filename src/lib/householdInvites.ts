import { supabase } from "@/integrations/supabase/client";

// On native (iOS/Android) window.location.origin is `http://localhost`, which
// produces dead invite links in emails. Always fall back to the public web origin.
const PUBLIC_ORIGIN = "https://miafamilyassistant.com";

export const inviteOrigin = () =>
  typeof window !== "undefined" &&
  window.location.protocol.startsWith("http") &&
  !/^localhost$|^127\.0\.0\.1$/.test(window.location.hostname)
    ? window.location.origin
    : PUBLIC_ORIGIN;

export const inviteLinkFor = (code: string) => `${inviteOrigin()}/invite/${code}`;

export interface SendInviteResult {
  ok: boolean;
  /** Invite row was created but the email could not be delivered. */
  emailFailed?: boolean;
  link?: string;
  error?: string;
}

/**
 * Creates one household invite and emails the join link.
 * Callers send these one at a time so a single failure never blocks the rest.
 */
export async function sendHouseholdInvite(opts: {
  householdId: string;
  householdName: string;
  invitedBy: string;
  inviterName: string;
  email: string;
  fallbackInviterLabel: string;
}): Promise<SendInviteResult> {
  const email = opts.email.trim();
  const { data, error } = await supabase
    .from("household_invites")
    .insert({
      household_id: opts.householdId,
      invited_by: opts.invitedBy,
      email: email || null,
    })
    .select("id, invite_code, expires_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message };

  const link = inviteLinkFor(data.invite_code);
  if (!email) return { ok: true, link };

  const { error: emailError } = await supabase.functions.invoke("send-household-invite", {
    body: {
      inviteId: data.id,
      inviterName: opts.inviterName || opts.fallbackInviterLabel,
    },
  });

  if (emailError) return { ok: false, emailFailed: true, link, error: emailError.message };
  return { ok: true, link };
}
