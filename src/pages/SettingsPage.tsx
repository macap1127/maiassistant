import { useFamilyData } from "@/lib/store";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import maiLogo from "@/assets/mai-logo.png";
import { useHousehold, TIER_INFO } from "@/lib/useHousehold";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { CreditCard, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { data, update } = useFamilyData();
  const { household } = useHousehold();
  const [familyName, setFamilyName] = useState(data.familyName);
  const [saved, setSaved] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const navigate = useNavigate();

  const save = () => {
    update((d) => ({ ...d, familyName: familyName.trim() || d.familyName }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openPortal = async () => {
    setLoadingPortal(true);
    const { data, error } = await supabase.functions.invoke("create-portal-session", {
      body: { environment: getStripeEnvironment(), returnUrl: window.location.href },
    });
    setLoadingPortal(false);
    if (error || !data?.url) {
      toast({ variant: "destructive", title: "Couldn't open billing portal", description: error?.message || data?.error || "Try again." });
      return;
    }
    window.open(data.url, "_blank");
  };

  const tier = household ? TIER_INFO[household.subscriptionTier] : null;
  const usedMin = household ? Math.floor(household.voiceSecondsUsed / 60) : 0;
  const totalMin = household ? Math.floor(household.voiceSecondsLimit / 60) : 0;
  const renewDate = household?.currentPeriodEnd ? new Date(household.currentPeriodEnd).toLocaleDateString() : "—";
  const isPastDue = household?.subscriptionStatus === "past_due" || household?.subscriptionStatus === "canceled";

  return (
    <div className="page-container">
      <h1 className="text-2xl font-serif font-semibold mb-6 animate-fade-in">Settings</h1>

      <div className="flex flex-col items-center mb-8 animate-slide-up">
        <img src={maiLogo} alt="Mai" className="w-20 h-20 rounded-3xl shadow-sm mb-3" />
        <p className="text-lg font-serif font-semibold">Mai</p>
        <p className="text-xs text-muted-foreground">Your Family Assistant</p>
      </div>

      <div className="space-y-4">
        {household && tier && (
          <div className="bg-card rounded-2xl p-4 border border-border animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <h2 className="font-medium text-sm">Billing</h2>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                {household.subscriptionStatus}
              </span>
            </div>

            {isPastDue && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive-foreground border border-destructive/20 rounded-xl p-3 mb-3 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Your subscription needs attention. Update billing to keep Mai active.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Plan</p>
                <p className="font-medium">{tier.label} · ${tier.price}/mo</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Renews</p>
                <p className="font-medium">{renewDate}</p>
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
                onClick={() => navigate("/pricing")}
                className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-xs font-medium hover:opacity-90"
              >
                Change plan
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

        <div className="bg-card rounded-2xl p-4 border border-border animate-slide-up" style={{ animationDelay: "80ms" }}>
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Assistant Preferences
          </label>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Voice Tone</span>
              <span className="text-sm text-muted-foreground">Friendly</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Reminders</span>
              <span className="text-sm text-muted-foreground">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Language</span>
              <span className="text-sm text-muted-foreground">English</span>
            </div>
          </div>
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
