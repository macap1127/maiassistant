import { useMemo, useState } from "react";
import { Check, Loader2, Mail, Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { useHousehold } from "@/lib/useHousehold";
import { toast } from "@/hooks/use-toast";
import { sendHouseholdInvite } from "@/lib/householdInvites";

type RowStatus = "idle" | "sending" | "sent" | "error";

interface Props {
  /** How many invites the household can still send. */
  maxInvites: number;
  onSent?: () => void;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/**
 * Multi-email invite form. Sends every filled-in address in one action,
 * sequentially, so one failure never blocks the others.
 */
export default function InviteEmailsForm({ maxInvites, onSent }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { household, refresh } = useHousehold();
  const rowCount = Math.max(0, maxInvites);
  const [emails, setEmails] = useState<string[]>(() => Array(rowCount).fill(""));
  const [statuses, setStatuses] = useState<RowStatus[]>(() => Array(rowCount).fill("idle"));
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () => Array.from({ length: rowCount }, (_, i) => ({ value: emails[i] ?? "", status: statuses[i] ?? "idle" })),
    [rowCount, emails, statuses],
  );

  if (!household || rowCount === 0) return null;

  const setEmailAt = (i: number, v: string) =>
    setEmails((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });

  const setStatusAt = (i: number, s: RowStatus) =>
    setStatuses((prev) => {
      const next = [...prev];
      next[i] = s;
      return next;
    });

  const inviterName =
    ((user?.user_metadata as Record<string, unknown>)?.full_name as string) ||
    ((user?.user_metadata as Record<string, unknown>)?.name as string) ||
    user?.email?.split("@")[0] ||
    "";

  const sendAll = async () => {
    if (!user) return;
    const targets = rows
      .map((r, i) => ({ email: r.value.trim(), i }))
      .filter((r) => r.email.length > 0 && rows[r.i].status !== "sent");

    if (targets.length === 0) {
      toast({ variant: "destructive", title: t("invites.noneEntered") });
      return;
    }
    const invalid = targets.filter((r) => !isEmail(r.email));
    if (invalid.length > 0) {
      toast({ variant: "destructive", title: t("invites.invalidEmail", { email: invalid[0].email }) });
      return;
    }

    setBusy(true);
    let sent = 0;
    let failed = 0;
    for (const target of targets) {
      setStatusAt(target.i, "sending");
      const res = await sendHouseholdInvite({
        householdId: household.id,
        householdName: household.name,
        invitedBy: user.id,
        inviterName,
        email: target.email,
        fallbackInviterLabel: t("logins.aFamilyMember"),
      });
      if (res.ok) {
        sent += 1;
        setStatusAt(target.i, "sent");
      } else {
        failed += 1;
        setStatusAt(target.i, "error");
        if (res.emailFailed && res.link) {
          void navigator.clipboard.writeText(res.link).catch(() => {});
        }
      }
    }
    setBusy(false);
    if (sent > 0) {
      toast({ title: t("invites.sentCount", { count: sent }) });
    }
    if (failed > 0) {
      toast({ variant: "destructive", title: t("invites.someFailed", { count: failed }) });
    }
    onSent?.();
    void refresh();
  };

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={row.value}
              onChange={(e) => {
                setEmailAt(i, e.target.value);
                if (row.status !== "idle") setStatusAt(i, "idle");
              }}
              disabled={busy || row.status === "sent"}
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder={t("invites.emailPlaceholder")}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
            />
          </div>
          <div className="w-6 flex items-center justify-center shrink-0">
            {row.status === "sending" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            {row.status === "sent" && <Check className="w-4 h-4 text-primary" />}
            {row.status === "error" && <X className="w-4 h-4 text-destructive" />}
          </div>
        </div>
      ))}

      <button
        onClick={sendAll}
        disabled={busy}
        className="w-full h-11 rounded-2xl bg-gradient-brand text-primary-foreground font-medium text-sm shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {busy ? t("invites.sending") : t("invites.send")}
      </button>
    </div>
  );
}
