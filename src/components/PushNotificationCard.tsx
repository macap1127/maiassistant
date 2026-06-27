import { useEffect, useState } from "react";
import { Bell, Loader2, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  isPushSupported,
  registerPushNotifications,
  unregisterPushNotifications,
} from "@/lib/pushNotifications";

type Prefs = {
  daily_digest: boolean;
  event_reminders: boolean;
  family_activity: boolean;
  account_billing: boolean;
};

const DEFAULT_PREFS: Prefs = {
  daily_digest: true,
  event_reminders: true,
  family_activity: true,
  account_billing: true,
};

const ROWS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: "daily_digest", label: "Daily calendar digest", desc: "A 9 AM summary of today's events." },
  { key: "event_reminders", label: "Event reminders", desc: "30 minutes before timed events." },
  { key: "family_activity", label: "Family activity", desc: "When a member adds a task, grocery, or event." },
  { key: "account_billing", label: "Account & billing", desc: "Trial ending, payment issues, plan changes." },
];

export function PushNotificationCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const supported = isPushSupported();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: tokens }, { data: pref }] = await Promise.all([
        supabase.from("device_tokens").select("id").eq("user_id", user.id).limit(1),
        supabase.from("push_preferences" as any).select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setEnabled((tokens?.length ?? 0) > 0);
      if (pref) {
        setPrefs({
          daily_digest: (pref as any).daily_digest,
          event_reminders: (pref as any).event_reminders,
          family_activity: (pref as any).family_activity,
          account_billing: (pref as any).account_billing,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const toggleMaster = async () => {
    if (!supported) {
      toast({
        title: "Mobile app required",
        description: "Push notifications work in the installed Android/iOS app.",
      });
      return;
    }
    setSaving(true);
    try {
      if (!enabled) {
        const token = await registerPushNotifications();
        if (!token) {
          toast({
            title: "Permission needed",
            description: "Allow notifications for Mia in your phone settings, then try again.",
            variant: "destructive",
          });
        } else {
          setEnabled(true);
          // ensure prefs row exists with defaults
          if (user) {
            await supabase
              .from("push_preferences" as any)
              .upsert({ user_id: user.id, ...prefs }, { onConflict: "user_id" });
          }
          toast({ title: "Push notifications enabled" });
        }
      } else {
        await unregisterPushNotifications();
        setEnabled(false);
        toast({ title: "Push notifications disabled" });
      }
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updatePref = async (key: keyof Prefs, value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const { error } = await supabase
      .from("push_preferences" as any)
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    if (error) {
      setPrefs(prefs); // revert
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card rounded-2xl p-4 border border-border animate-slide-up" style={{ animationDelay: "60ms" }}>
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-primary" />
        <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Push Notifications
        </label>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        Get reminders for tasks and events delivered straight to your phone.
      </p>

      {!supported && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg p-2.5 mb-3">
          <Smartphone className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Available in the installed mobile app. Open Mia on your Android or iOS device to enable.</span>
        </div>
      )}

      <button
        type="button"
        onClick={toggleMaster}
        disabled={loading || saving}
        className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium border transition ${
          enabled
            ? "bg-primary/10 border-primary/40 text-primary"
            : "bg-background border-border text-foreground hover:bg-muted"
        } disabled:opacity-50`}
      >
        {loading || saving ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Working…
          </span>
        ) : enabled ? (
          "Disable push notifications"
        ) : (
          "Enable push notifications"
        )}
      </button>

      {enabled && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            What you'll receive
          </p>
          {ROWS.map((r) => (
            <div key={r.key} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <Switch
                checked={prefs[r.key]}
                onCheckedChange={(v) => updatePref(r.key, v)}
                disabled={saving}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
