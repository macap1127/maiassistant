import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const ADMIN_EMAILS = ["michaeldmacri@gmail.com", "michael.macri@gmail.com", "michael@aiblueribbon.com"];

type Row = {
  email: string;
  emailed_at: string | null;
  delivered: boolean | null;
  last_sign_in_at: string | null;
  tier: string | null;
  status: string | null;
  current_period_end: string | null;
  signed_in_after_email: boolean | null;
  events_added: number;
  tasks_added: number;
  groceries_added: number;
  receipts_added: number;
  voice_seconds: number;
  items_added: number;
  last_activity_at: string | null;
  used_after_email: boolean | null;
};

type Data = {
  summary: { emailed: number; signed_in: number; used_app: number; converted_paid: number };
  users: Row[];
};

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function AdminFreeMonth() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  async function load() {
    setLoading(true);
    const { data: res, error } = await supabase.rpc("admin_free_month_activity");
    if (error) {
      toast({ title: "Failed to load activity", description: error.message, variant: "destructive" });
    } else {
      setData(res as unknown as Data);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const rows = data?.users ?? [];
  const s = data?.summary;
  const pct = (n?: number) =>
    s && s.emailed > 0 ? `${Math.round(((n ?? 0) / s.emailed) * 100)}%` : "—";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Free month follow-up</h1>
            <p className="text-sm text-muted-foreground">
              Everyone who got the free-month email, and what they've done since.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link to="/admin/signups">All signups</Link>
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Emails sent", value: s?.emailed ?? 0, sub: "" },
            { label: "Signed in since", value: s?.signed_in ?? 0, sub: pct(s?.signed_in) },
            { label: "Actually used Mia", value: s?.used_app ?? 0, sub: pct(s?.used_app) },
            { label: "Kept going (paid)", value: s?.converted_paid ?? 0, sub: pct(s?.converted_paid) },
          ].map((c) => (
            <Card key={c.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{c.value}</div>
                {c.sub && <div className="text-xs text-muted-foreground">{c.sub} of those emailed</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3">Person</th>
                  <th className="p-3">Emailed</th>
                  <th className="p-3">Signed in</th>
                  <th className="p-3">Added since</th>
                  <th className="p-3">Voice</th>
                  <th className="p-3">Last activity</th>
                  <th className="p-3">Free month ends</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.email} className="border-b border-border/50">
                    <td className="p-3 font-medium text-foreground">{r.email}</td>
                    <td className="p-3 text-muted-foreground">{fmt(r.emailed_at)}</td>
                    <td className="p-3">
                      {r.signed_in_after_email ? (
                        <Badge>Yes</Badge>
                      ) : (
                        <Badge variant="outline">Not yet</Badge>
                      )}
                      <div className="text-xs text-muted-foreground">{fmt(r.last_sign_in_at)}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {r.items_added > 0 ? (
                        <>
                          <span className="font-medium text-foreground">{r.items_added}</span>{" "}
                          <span className="text-xs">
                            ({r.events_added} events · {r.tasks_added} to-dos · {r.groceries_added} grocery ·{" "}
                            {r.receipts_added} receipts)
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {r.voice_seconds > 0 ? `${Math.round(r.voice_seconds / 60)} min` : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{fmt(r.last_activity_at)}</td>
                    <td className="p-3 text-muted-foreground">{fmt(r.current_period_end)}</td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No free-month emails have gone out yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
