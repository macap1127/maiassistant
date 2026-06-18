import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ADMIN_EMAIL = "michael@aiblueribbon.com";

type Tester = {
  email: string;
  signed_up: boolean;
  last_sign_in_at: string | null;
  active_today: boolean;
};

type Activity = {
  summary: { total_testers: number; signed_up: number; active_today: number };
  hourly: { hour: number; active: number }[];
  testers: Tester[];
};

type ActiveUser = {
  email: string;
  last_sign_in_at: string | null;
  household_acted_today: boolean;
  signed_in_today: boolean;
  is_tester: boolean;
};

type ActiveToday = {
  day_start: string;
  summary: { total_active: number; household_acted: number; signed_in_only: number; testers_active: number };
  users: ActiveUser[];
};

export default function AdminTesters() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Activity | null>(null);
  const [active, setActive] = useState<ActiveToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState("");
  const [saving, setSaving] = useState(false);


  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  async function load() {
    setLoading(true);
    const [a, b] = await Promise.all([
      supabase.rpc("admin_tester_activity_today"),
      supabase.rpc("admin_active_users_today"),
    ]);
    if (a.error) toast({ title: "Failed to load testers", description: a.error.message, variant: "destructive" });
    else setData(a.data as unknown as Activity);
    if (b.error) toast({ title: "Failed to load active users", description: b.error.message, variant: "destructive" });
    else setActive(b.data as unknown as ActiveToday);
    setLoading(false);
  }


  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function addTesters() {
    const list = Array.from(
      new Set(
        emails
          .split(/[\s,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => /.+@.+\..+/.test(e)),
      ),
    );
    if (list.length === 0) {
      toast({ title: "No valid emails found", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("internal_testers")
      .upsert(list.map((email) => ({ email })), { onConflict: "email", ignoreDuplicates: true });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Added ${list.length} tester${list.length === 1 ? "" : "s"}` });
    setEmails("");
    load();
  }

  async function removeTester(email: string) {
    const { error } = await supabase.from("internal_testers").delete().eq("email", email);
    if (error) {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
      return;
    }
    load();
  }

  const chartData = useMemo(
    () => data?.hourly.map((h) => ({ hour: `${h.hour.toString().padStart(2, "0")}:00`, active: h.active })) ?? [],
    [data],
  );

  if (authLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Internal Testers — Today</h1>
        <p className="text-sm text-muted-foreground">
          Active = signed in today or created/updated a task, event, grocery item, or receipt today.
        </p>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Testers on list" value={data.summary.total_testers} />
          <StatCard label="Signed up" value={data.summary.signed_up} />
          <StatCard label="Active today" value={data.summary.active_today} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hourly active testers (today)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={1} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="active" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add testers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Paste tester emails (one per line, or comma-separated)"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={4}
          />
          <Button onClick={addTesters} disabled={saving}>
            {saving ? "Saving…" : "Add to tester list"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tester list</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.testers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No testers added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Signed up</th>
                    <th className="py-2 pr-3">Active today</th>
                    <th className="py-2 pr-3">Last sign-in</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.testers.map((t) => (
                    <tr key={t.email} className="border-t border-border">
                      <td className="py-2 pr-3 font-mono">{t.email}</td>
                      <td className="py-2 pr-3">{t.signed_up ? "Yes" : "—"}</td>
                      <td className="py-2 pr-3">{t.active_today ? "Yes" : "—"}</td>
                      <td className="py-2 pr-3">
                        {t.last_sign_in_at ? new Date(t.last_sign_in_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeTester(t.email)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
