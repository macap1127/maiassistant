import { useEffect, useState } from "react";
import { Check, Crown, Zap, Sparkles, X, Minus, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/lib/auth";
import { useHousehold, type Tier } from "@/lib/useHousehold";
import { StripeEmbeddedCheckout, PaymentTestModeBanner } from "@/components/StripeEmbeddedCheckout";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "@/hooks/use-toast";
import {
  initRevenueCat,
  getOfferings,
  purchasePackage,
  restorePurchases,
  isNative,
} from "@/lib/revenuecat";

type Interval = "monthly" | "yearly";

const PRICE_IDS: Record<Interval, Record<Tier, string>> = {
  monthly: {
    basic: "mia_basic_monthly",
    family: "mia_family_monthly",
    family_plus: "mia_family_plus_monthly",
  },
  yearly: {
    basic: "mia_basic_yearly",
    family: "mia_family_yearly",
    family_plus: "mia_family_plus_yearly",
  },
};

type TierDef = {
  id: Tier;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  icon: typeof Zap;
  popular?: boolean;
  highlights: string[];
};

const tiers: TierDef[] = [
  {
    id: "basic",
    name: "Basic",
    tagline: "For one person",
    monthly: 7.99,
    yearly: 70.99,
    icon: Zap,
    highlights: [
      "1 login",
      "30 voice minutes / month",
      "Tasks, groceries & calendar",
      "Voice assistant (15 languages)",
      "10 receipt scans / month",
      "5 AI calendar imports / month",
    ],
  },
  {
    id: "family",
    name: "Family",
    tagline: "Most popular",
    monthly: 22.99,
    yearly: 220.99,
    icon: Crown,
    popular: true,
    highlights: [
      "Up to 4 logins",
      "120 shared voice minutes / month",
      "Everything in Basic",
      "Shared family workspace & invites",
      "Daily push reminders",
      "Unlimited receipt scanning",
      "AI calendar import (PDF & images)",
    ],
  },
  {
    id: "family_plus",
    name: "Family Plus",
    tagline: "For larger households",
    monthly: 35.99,
    yearly: 350.99,
    icon: Sparkles,
    highlights: [
      "Up to 6 logins",
      "240 shared voice minutes / month",
      "Everything in Family",
      "Priority support",
      "Early access to new features",
    ],
  },
];

type FeatureRow = {
  label: string;
  basic: string | boolean;
  family: string | boolean;
  family_plus: string | boolean;
};

const featureMatrix: { group: string; rows: FeatureRow[] }[] = [
  {
    group: "Household",
    rows: [
      { label: "Logins included", basic: "1", family: "4", family_plus: "6" },
      { label: "Shared family workspace", basic: false, family: true, family_plus: true },
      { label: "Invite household members", basic: false, family: true, family_plus: true },
    ],
  },
  {
    group: "Mia voice assistant",
    rows: [
      { label: "Voice minutes / month", basic: "30", family: "120", family_plus: "240" },
      { label: "15 supported languages", basic: true, family: true, family_plus: true },
      { label: "Bidirectional calendar sync", basic: true, family: true, family_plus: true },
    ],
  },
  {
    group: "Everyday tools",
    rows: [
      { label: "Tasks, groceries & calendar", basic: true, family: true, family_plus: true },
      { label: "Daily push reminders", basic: false, family: true, family_plus: true },
      { label: "Receipt scanning (OCR)", basic: "10 / mo", family: "Unlimited", family_plus: "Unlimited" },
      { label: "AI calendar import (PDF / image)", basic: "5 / mo", family: "Unlimited", family_plus: "Unlimited" },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Email support", basic: true, family: true, family_plus: true },
      { label: "Priority support", basic: false, family: false, family_plus: true },
      { label: "Early access to new features", basic: false, family: false, family_plus: true },
    ],
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-3.5 h-3.5 text-primary mx-auto" />;
  if (value === false) return <Minus className="w-3.5 h-3.5 text-muted-foreground/50 mx-auto" />;
  return <span className="text-[11px] font-medium">{value}</span>;
}

const PricingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { household, refresh } = useHousehold();
  const [checkoutTier, setCheckoutTier] = useState<Tier | null>(null);
  const [interval, setInterval] = useState<Interval>("monthly");
  const [nativePurchasing, setNativePurchasing] = useState<Tier | null>(null);
  const [restoring, setRestoring] = useState(false);
  const native = isNative();

  useEffect(() => {
    if (native && user?.id) initRevenueCat(user.id).catch(console.warn);
  }, [native, user?.id]);

  const hasActiveSub =
    !!household?.stripeSubscriptionId &&
    ["active", "trialing", "past_due"].includes(household.subscriptionStatus);

  const handleNativePurchase = async (tier: Tier) => {
    setNativePurchasing(tier);
    try {
      const offering = await getOfferings();
      if (!offering) throw new Error("No subscription offerings configured. Try again later.");
      const wantedProduct = PRICE_IDS[interval][tier];
      // Match either by RC package identifier or store product identifier.
      const pkg = offering.availablePackages.find(
        (p: any) =>
          p.identifier === wantedProduct ||
          p.product?.identifier === wantedProduct ||
          p.product?.identifier?.endsWith(`.${wantedProduct}`),
      );
      if (!pkg) throw new Error(`Plan ${wantedProduct} not available on this device.`);
      await purchasePackage(pkg);
      toast({ title: "Purchase complete", description: "Updating your plan…" });
      // Give RC webhook a moment to update Supabase, then refresh.
      setTimeout(() => refresh?.(), 2500);
    } catch (e: any) {
      if (e?.userCancelled) return;
      toast({ variant: "destructive", title: "Purchase failed", description: e?.message ?? String(e) });
    } finally {
      setNativePurchasing(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      toast({ title: "Purchases restored", description: "Refreshing your plan…" });
      setTimeout(() => refresh?.(), 1500);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Restore failed", description: e?.message ?? String(e) });
    } finally {
      setRestoring(false);
    }
  };

  const handlePick = async (tier: Tier) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (household && !household.isOwner) {
      toast({ variant: "destructive", title: "Owner only", description: "Only the household owner can change the plan." });
      return;
    }
    if (native) {
      await handleNativePurchase(tier);
      return;
    }
    if (hasActiveSub) {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      if (error || !data?.url) {
        toast({ variant: "destructive", title: "Couldn't open billing portal", description: error?.message || data?.error || "Try again." });
        return;
      }
      window.open(data.url, "_blank");
      return;
    }
    setCheckoutTier(tier);
  };

  return (
    <>
      <PaymentTestModeBanner />
      <div className="page-container pb-28">
        <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          ← Back
        </button>

        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-2xl font-serif font-semibold mb-2">Choose your plan</h1>
          <p className="text-sm text-muted-foreground">Start with a 7-day free trial. Cancel anytime.</p>
          {household && !household.hasUsedTrial && (
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary">
              <Sparkles className="w-3 h-3" /> 7-day free trial on any plan
            </div>
          )}
        </div>

        <div className="space-y-4">
          {tiers.map((tier, i) => {
            const Icon = tier.icon;
            const isCurrent = household?.subscriptionTier === tier.id && household?.subscriptionStatus === "active";
            return (
              <div
                key={tier.id}
                className={`relative bg-card rounded-2xl border p-5 animate-slide-up ${tier.popular ? "border-primary shadow-md" : "border-border"}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full">
                    Most Popular
                  </span>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">{tier.name}</h2>
                    <p className="text-xs text-muted-foreground">{tier.tagline}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-xl font-bold">${interval === "monthly" ? tier.monthly : tier.yearly}</span>
                    <span className="text-xs text-muted-foreground">/{interval === "monthly" ? "mo" : "yr"}</span>
                    {interval === "yearly" && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">≈ ${(tier.yearly / 12).toFixed(2)}/mo</p>
                    )}
                  </div>
                </div>

                <ul className="space-y-1.5 mb-4">
                  {tier.highlights.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePick(tier.id)}
                  disabled={isCurrent || nativePurchasing !== null}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {nativePurchasing === tier.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCurrent
                    ? "Current plan"
                    : nativePurchasing === tier.id
                    ? "Opening store…"
                    : household && hasActiveSub
                    ? `Switch to ${tier.name}`
                    : household && !household.hasUsedTrial
                    ? `Start 7-day free trial`
                    : `Get ${tier.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {native && (
          <div className="mt-6 text-center">
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
            >
              {restoring ? "Restoring…" : "Restore purchases"}
            </button>
          </div>
        )}

        {/* Compare features table */}
        <div className="mt-10">
          <h2 className="font-serif text-lg font-semibold mb-3 text-center">Compare plans</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] bg-secondary/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="px-3 py-2">Feature</div>
              <div className="px-2 py-2 text-center">Basic</div>
              <div className="px-2 py-2 text-center text-primary">Family</div>
              <div className="px-2 py-2 text-center">Family+</div>
            </div>
            {featureMatrix.map((section) => (
              <div key={section.group}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/20 border-t border-border">
                  {section.group}
                </div>
                {section.rows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[1.4fr_repeat(3,1fr)] items-center border-t border-border text-xs">
                    <div className="px-3 py-2.5">{row.label}</div>
                    <div className="px-2 py-2.5 text-center"><Cell value={row.basic} /></div>
                    <div className="px-2 py-2.5 text-center"><Cell value={row.family} /></div>
                    <div className="px-2 py-2.5 text-center"><Cell value={row.family_plus} /></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 space-y-4 text-sm">
          <h2 className="font-serif text-lg font-semibold">FAQ</h2>
          <div>
            <p className="font-medium">What happens if I run out of voice minutes?</p>
            <p className="text-muted-foreground text-xs mt-1">You can still use tasks, groceries, and calendar by hand. Upgrade to keep talking to Mia.</p>
          </div>
          <div>
            <p className="font-medium">Can I switch plans later?</p>
            <p className="text-muted-foreground text-xs mt-1">Yes — change anytime from Settings. You'll be pro-rated automatically.</p>
          </div>
          <div>
            <p className="font-medium">When do voice minutes & receipt scans reset?</p>
            <p className="text-muted-foreground text-xs mt-1">On the 1st of each month.</p>
          </div>
          <div>
            <p className="font-medium">Do voice minutes share across the family?</p>
            <p className="text-muted-foreground text-xs mt-1">Yes — Family and Family Plus minutes are pooled across all logins in the household.</p>
          </div>
        </div>
      </div>

      {checkoutTier && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur overflow-y-auto p-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold">Subscribe to {tiers.find(t => t.id === checkoutTier)?.name}</h2>
              <button onClick={() => setCheckoutTier(null)} className="p-2 rounded-full hover:bg-secondary" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const tier = tiers.find(t => t.id === checkoutTier)!;
              const amount = interval === "monthly" ? tier.monthly : tier.yearly;
              const period = interval === "monthly" ? "month" : "year";
              return (
                <>
                  <div className="bg-secondary/40 border border-border rounded-xl p-3 mb-4 text-[11px] text-muted-foreground leading-relaxed">
                    {household && !household.hasUsedTrial ? (
                      <>
                        <p className="text-foreground font-medium mb-1">7-day free trial, then ${amount}/{period}.</p>
                        <p>You won't be charged today. Your subscription auto-renews {interval} at the listed price until you cancel. Cancel anytime from Settings → Manage billing — no charge if you cancel before the trial ends.</p>
                      </>
                    ) : (
                      <p>Your subscription auto-renews {interval} at ${amount} until you cancel. Cancel anytime from Settings → Manage billing.</p>
                    )}
                    <p className="mt-2">
                      By subscribing, you agree to our{" "}
                      <Link to="/terms" className="underline hover:text-foreground" target="_blank">Terms</Link> and{" "}
                      <Link to="/privacy" className="underline hover:text-foreground" target="_blank">Privacy Policy</Link>.
                    </p>
                  </div>

                  <StripeEmbeddedCheckout
                    priceId={PRICE_IDS[interval][checkoutTier]}
                    returnUrl={`${window.location.origin}/settings?checkout=success`}
                  />
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
};

export default PricingPage;
