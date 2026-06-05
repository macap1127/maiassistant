import { useEffect, useState } from "react";
import { MessageSquare, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { HouseholdState } from "@/lib/useHousehold";

const COMMON_TZS = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Singapore", "Asia/Kolkata", "Australia/Sydney",
];

const guessTz = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/New_York"; }
};

const fmtTime12 = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  let h = Number(m[1]); const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${period}`;
};

interface Props { household: HouseholdState; }

export function SmsReminderCard({ household }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optedIn, setOptedIn] = useState(false);
  const [phone, setPhone] = useState("");
  const [sendTime, setSendTime] = useState("07:00");
  const [tz, setTz] = useState(guessTz());

  const tierAllowed = ["family", "family_plus"].includes(household.subscriptionTier) && household.hasAccess;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("sms_reminder_prefs").select("*").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (data) {
        setOptedIn(!!data.opted_in);
        setPhone(data.phone || "");
        setSendTime(data.send_time || "07:00");
        setTz(data.timezone || guessTz());
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (optedIn && !/^\+?[0-9\s\-()]{7,}$/.test(phone)) {
      toast({ variant: "destructive", title: "Phone number invalid", description: "Use international format like +15551234567." });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("sms_reminder_prefs").upsert({
      user_id: user.id,
      household_id: household.id,
      opted_in: optedIn,
      phone: phone.trim(),
      send_time: sendTime,
      timezone: tz,
    });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't save", description: error.message });
      return;
    }
    toast({ title: optedIn ? "Reminders on" : "Reminders off", description: optedIn ? `Daily SMS at ${fmtTime12(sendTime)} (${tz}).` : "" });
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-4 border border-border flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading reminders…
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 border border-border animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h2 className="font-medium text-sm">Mia Family Assistant — Daily event SMS reminders</h2>
      </div>

      {!tierAllowed ? (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted rounded-xl p-3">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Daily SMS reminders are included with the <b>Family</b> and <b>Family Plus</b> plans. Upgrade in Pricing to enable.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium">Send me a daily reminder</p>
              <p className="text-xs text-muted-foreground">A text with today's events at your chosen time.</p>
            </div>
            <input
              type="checkbox"
              checked={optedIn}
              onChange={(e) => setOptedIn(e.target.checked)}
              className="w-5 h-5 accent-primary"
            />
          </label>

          {optedIn && (
            <>
              <label className="block">
                <span className="text-[10px] uppercase text-muted-foreground">Phone (with country code)</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+15551234567"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] uppercase text-muted-foreground">Send at</span>
                  <input
                    type="time"
                    value={sendTime}
                    onChange={(e) => setSendTime(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase text-muted-foreground">Timezone</span>
                  <select
                    value={tz}
                    onChange={(e) => setTz(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1"
                  >
                    {!COMMON_TZS.includes(tz) && <option value={tz}>{tz}</option>}
                    {COMMON_TZS.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                By enabling this setting and saving, you consent to receive recurring automated SMS text messages from <strong>Mia Family Assistant (Sole Proprietor)</strong> at the number provided for daily household calendar reminders. Message frequency varies, up to one message per day at {fmtTime12(sendTime)}. Message and data rates may apply. Reply STOP to cancel and HELP for help. Consent is not a condition of purchase. See <a href="/terms" className="underline">Terms</a> &amp; <a href="/privacy" className="underline">Privacy</a>.
              </p>
            </>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Save reminder settings
          </button>
        </div>
      )}
    </div>
  );
}
