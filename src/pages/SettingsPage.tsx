import { useFamilyData } from "@/lib/store";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import maiLogo from "@/assets/mai-logo.png";
import { useHousehold, TIER_INFO } from "@/lib/useHousehold";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { CreditCard, ExternalLink, Loader2, AlertTriangle, Clock, Sparkles, MessageSquare, Languages } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SmsReminderCard } from "@/components/SmsReminderCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish (Español)" },
  { value: "fr", label: "French (Français)" },
  { value: "de", label: "German (Deutsch)" },
  { value: "it", label: "Italian (Italiano)" },
  { value: "pt", label: "Portuguese (Português)" },
  { value: "nl", label: "Dutch (Nederlands)" },
  { value: "pl", label: "Polish (Polski)" },
  { value: "hi", label: "Hindi (हिन्दी)" },
  { value: "ja", label: "Japanese (日本語)" },
  { value: "zh", label: "Chinese (中文)" },
  { value: "ar", label: "Arabic (العربية)" },
];

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment failed",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  unpaid: "Unpaid",
  paused: "Paused",
};

const SettingsPage = () => {
  const { data, update } = useFamilyData();
  const { household, refresh } = useHousehold();
  const [familyName, setFamilyName] = useState(data.familyName);
  const [saved, setSaved] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle return from Stripe Checkout
  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return;
    toast({ title: "Payment received", description: "Updating your plan…" });
    // Webhook may take a moment — poll a few times.
    let tries = 0;
    const interval = setInterval(async () => {
      tries++;
      await refresh();
      if (tries >= 6) clearInterval(interval);
    }, 1500);
    setSearchParams((p) => {
      p.delete("checkout");
      return p;
    }, { replace: true });
    return () => clearInterval(interval);
  }, [searchParams, setSearchParams, refresh]);

  const save = () => {
    update((d) => ({ ...d, familyName: familyName.trim() || d.familyName }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openPortal = async () => {
    setLoadingPortal(true);
    const { data: pdata, error } = await supabase.functions.invoke("create-portal-session", {
      body: { environment: getStripeEnvironment(), returnUrl: window.location.href },
    });
    setLoadingPortal(false);
    if (error || !pdata?.url) {
      toast({ variant: "destructive", title: "Couldn't open billing portal", description: error?.message || pdata?.error || "Try again." });
      return;
    }
    window.open(pdata.url, "_blank");
  };

  const tier = household ? TIER_INFO[household.subscriptionTier] : null;
  const usedMin = household ? Math.floor(household.voiceSecondsUsed / 60) : 0;
  const totalMin = household ? Math.floor(household.voiceSecondsLimit / 60) : 0;
  const renewDate = household?.currentPeriodEnd ? new Date(household.currentPeriodEnd).toLocaleDateString() : null;
  const isPastDue = household?.subscriptionStatus === "past_due";
  const isCanceledScheduled = household?.cancelAtPeriodEnd && household?.subscriptionStatus !== "canceled";
  const isLocked = household?.accessLocked;
  const hasActiveSub =
    !!household?.stripeSubscriptionId &&
    ["active", "trialing", "past_due"].includes(household.subscriptionStatus);

  return (
    <div className="page-container">
      <h1 className="text-2xl font-serif font-semibold mb-6 animate-fade-in">Settings</h1>

      <div className="flex flex-col items-center mb-8 animate-slide-up">
        <img src={maiLogo} alt="Mia" className="w-20 h-20 rounded-3xl shadow-sm mb-3" />
        <p className="text-lg font-serif font-semibold">Mia</p>
        <p className="text-xs text-muted-foreground">Your Family Assistant</p>
      </div>

      <div className="space-y-4">
        {household && tier && (
          <div className="bg-card rounded-2xl p-4 border border-border animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <h2 className="font-medium text-sm">Billing</h2>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                {STATUS_LABELS[household.subscriptionStatus] ?? household.subscriptionStatus}
              </span>
            </div>

            {isLocked && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl p-3 mb-3 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Your subscription has ended. Pick a plan to keep using Mia.</span>
              </div>
            )}

            {!isLocked && household.isInTrial && (
              <div className="flex items-start gap-2 bg-primary/10 text-foreground border border-primary/20 rounded-xl p-3 mb-3 text-xs">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                <span>
                  You're on a free trial — {household.trialDaysLeft ?? 0} day{household.trialDaysLeft === 1 ? "" : "s"} left.
                  Subscribe anytime to keep your access.
                </span>
              </div>
            )}

            {isPastDue && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl p-3 mb-3 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Last payment failed. Update billing to keep Mia active.</span>
              </div>
            )}

            {isCanceledScheduled && renewDate && (
              <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-xl p-3 mb-3 text-xs">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Scheduled to cancel on {renewDate}. You'll keep access until then.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Plan</p>
                <p className="font-medium">
                  {household.isInTrial ? `Trial of ${tier.label}` : isLocked ? "No active plan" : `${tier.label} · $${tier.price}/mo`}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">
                  {isCanceledScheduled ? "Ends" : household.isInTrial ? "Trial ends" : "Renews"}
                </p>
                <p className="font-medium">
                  {household.isInTrial && household.trialEndsAt
                    ? new Date(household.trialEndsAt).toLocaleDateString()
                    : renewDate ?? "—"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Voice usage</p>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (usedMin / Math.max(1, totalMin)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{usedMin} / {totalMin} min this period</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => (hasActiveSub && household.isOwner ? openPortal() : navigate("/pricing"))}
                disabled={loadingPortal}
                className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loadingPortal && <Loader2 className="w-3 h-3 animate-spin" />}
                {hasActiveSub ? "Change plan" : isLocked ? "Choose a plan" : "Subscribe"}
              </button>
              {household.isOwner && household.stripeCustomerId && (
                <button
                  onClick={openPortal}
                  disabled={loadingPortal}
                  className="flex-1 bg-secondary text-secondary-foreground rounded-xl py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loadingPortal ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                  Manage billing
                </button>
              )}
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl p-4 border border-border animate-slide-up">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Family Name
          </label>
          <input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {household && <SmsReminderCard household={household} />}

        <div className="bg-card rounded-2xl p-4 border border-border animate-slide-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-4 h-4 text-primary" />
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Assistant Language
            </label>
          </div>
          <Select
            value={(household as any)?.assistantLanguage ?? "en"}
            onValueChange={async (val) => {
              if (!household?.id) return;
              const { error } = await supabase
                .from("households")
                .update({ assistant_language: val } as any)
                .eq("id", household.id);
              if (error) {
                toast({ variant: "destructive", title: "Couldn't save language", description: error.message });
                return;
              }
              await refresh();
              toast({ title: "Language updated", description: "Mia will use this language on your next conversation." });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-2">
            Changes apply the next time you start a conversation with Mia.
          </p>
        </div>

        <button
          onClick={save}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 transition-opacity animate-slide-up"
          style={{ animationDelay: "160ms" }}
        >
          {saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
