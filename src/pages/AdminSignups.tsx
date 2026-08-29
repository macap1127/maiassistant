import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const ADMIN_EMAILS = ["michael@aiblueribbon.com", "michaeldmacri@gmail.com", "michael.macri@gmail.com"];

type Row = {
  email: string;
  signed_up_at: string | null;
  last_sign_in_at: string | null;
  household_name: string | null;
  tier: string | null;
  status: string | null;
  household_role: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

type Data = {
  summary: { total_users: number; last_7_days: number; last_30_days: number; paying: number };
  by_tier: Record<string, number>;
  users: Row[];
};

const TIER_LABEL: Record<string, string> = {
  basic: "Basic",
  family: "Family",
  family_plus: "Family Plus",
  none: "No plan",
};

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

function statusVariant(status: string | null) {
  if (status === "active" || status === "trialing") return "default" as const;
  if (status === "past_due") return "secondary" as const;
  return "outline" as const;
}

export default function AdminSignups() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<string>("all");

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  async function load() {
    setLoading(true);
    const { data: res, error } = await supabase.rpc("admin_signup_activity");
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

  const rows = useMemo(() => {
    const all = data?.users ?? [];
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      const matchesTier = tier === "all" || (r.tier ?? "none") === tier;
      const matchesQ =
        !needle ||
        r.email?.toLowerCase().includes(needle) ||
        (r.household_name ?? "").toLowerCase().includes(needle);
      return matchesTier && matchesQ;
    });
  }, [data, q, tier]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const tiers = ["all", ...Object.keys(data?.by_tier ?? {})];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Signups & plans</h1>
            <p className="text-sm text-muted-foreground">
              Every user, when they joined, and which plan they're on.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total users", value: data?.summary.total_users ?? 0 },
            { label: "Last 7 days", value: data?.summary.last_7_days ?? 0 },
            { label: "Last 30 days", value: data?.summary.last_30_days ?? 0 },
            { label: "On a plan", value: data?.summary.paying ?? 0 },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plan breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(data?.by_tier ?? {}).map(([t, c]) => (
              <Badge key={t} variant="secondary" className="text-sm">
                {TIER_LABEL[t] ?? t}: {c}
              </Badge>
            ))}
            {!data && <span className="text-sm text-muted-foreground">Loading…</span>}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search email or household"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs text-base"
          />
          <div className="flex flex-wrap gap-2">
            {tiers.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tier === t ? "default" : "outline"}
                onClick={() => setTier(t)}
              >
                {t === "all" ? "All" : TIER_LABEL[t] ?? t}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3">User</th>
                  <th className="p-3">Household</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Signed up</th>
                  <th className="p-3">Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.email}-${i}`} className="border-b border-border/50">
                    <td className="p-3 font-medium text-foreground">{r.email}</td>
                    <td className="p-3 text-muted-foreground">
                      {r.household_name ?? "—"}
                      {r.household_role === "owner" && (
                        <span className="ml-2 text-xs text-muted-foreground">(owner)</span>
                      )}
                    </td>
                    <td className="p-3">{TIER_LABEL[r.tier ?? "none"] ?? r.tier}</td>
                    <td className="p-3">
                      <Badge variant={statusVariant(r.status)}>{r.status ?? "—"}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{fmt(r.signed_up_at)}</td>
                    <td className="p-3 text-muted-foreground">{fmt(r.last_sign_in_at)}</td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No users match this filter.
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
