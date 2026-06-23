import { useEffect, useState } from "react";
import { Bell, Loader2, Smartphone } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  isPushSupported,
  registerPushNotifications,
  unregisterPushNotifications,
} from "@/lib/pushNotifications";

export function PushNotificationCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const supported = isPushSupported();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("device_tokens")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      setEnabled((data?.length ?? 0) > 0);
      setLoading(false);
    })();
  }, [user]);

  const toggle = async () => {
    if (!supported) {
      toast({
        title: "Mobile app required",
        description:
          "Push notifications work in the installed Android/iOS app. Open Mia on your phone to enable them.",
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
        onClick={toggle}
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
    </div>
  );
}
