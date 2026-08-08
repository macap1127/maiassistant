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
import { useTranslation } from "react-i18next";

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

const ROW_KEYS: (keyof Prefs)[] = ["daily_digest", "event_reminders", "family_activity", "account_billing"];

export function PushNotificationCard() {
  const { t } = useTranslation();
  const ROWS = ROW_KEYS.map((key) => ({
    key,
    label: t(`push.rows.${key}.label`),
    desc: t(`push.rows.${key}.desc`),
  }));
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
        title: t("push.toast.mobileRequiredTitle"),
        description: t("push.toast.mobileRequiredDesc"),
      });
      return;
    }
    setSaving(true);
    try {
      if (!enabled) {
        const token = await registerPushNotifications();
        if (!token) {
          toast({
            title: t("push.toast.permissionNeededTitle"),
            description: t("push.toast.permissionNeededDesc"),
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
          toast({ title: t("push.toast.enabledTitle") });
        }
      } else {
        await unregisterPushNotifications();
        setEnabled(false);
        toast({ title: t("push.toast.disabledTitle") });
      }
    } catch (e: any) {
      toast({ title: t("push.toast.errorTitle"), description: e?.message, variant: "destructive" });
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
      toast({ title: t("push.toast.couldntSaveTitle"), description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card rounded-2xl p-4 border border-border animate-slide-up" style={{ animationDelay: "60ms" }}>
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-primary" />
        <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {t("push.title")}
        </label>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        {t("push.description")}
      </p>

      {!supported && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg p-2.5 mb-3">
          <Smartphone className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{t("push.mobileOnlyNote")}</span>
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
            <Loader2 className="w-4 h-4 animate-spin" /> {t("push.working")}
          </span>
        ) : enabled ? (
          t("push.disable")
        ) : (
          t("push.enable")
        )}
      </button>

      {enabled && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t("push.whatYoullReceive")}
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
