import { useState } from "react";
import { Check, Crown, Zap, Sparkles, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useHousehold, type Tier } from "@/lib/useHousehold";
import { StripeEmbeddedCheckout, PaymentTestModeBanner } from "@/components/StripeEmbeddedCheckout";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "@/hooks/use-toast";

const PRICE_IDS: Record<Tier, string> = {
  basic: "mai_basic_monthly",
  family: "mai_family_monthly",
  family_plus: "mai_family_plus_monthly",
};

const tiers: Array<{
  id: Tier;
  name: string;
  tagline: string;
  price: string;
  icon: typeof Zap;
  popular?: boolean;
  features: string[];
}> = [
  {
    id: "basic",
    name: "Basic",
    tagline: "For one person",
    price: "$9",
    icon: Zap,
    features: ["1 login", "30 voice minutes / month", "Tasks, groceries & calendar", "Web & app access"],
  },
  {
    id: "family",
    name: "Family",
    tagline: "Most popular",
    price: "$29",
    icon: Crown,
    popular: true,
    features: ["Up to 4 logins", "120 shared voice minutes / month", "Everything in Basic", "Shared family workspace"],
  },
  {
    id: "family_plus",
    name: "Family Plus",
    tagline: "For larger households",
    price: "$49",
    icon: Sparkles,
    features: ["Up to 6 logins", "240 shared voice minutes / month", "Everything in Family", "Priority support"],
  },
];

const PricingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { household } = useHousehold();
  const [checkoutTier, setCheckoutTier] = useState<Tier | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const hasActiveSub =
    !!household?.stripeSubscriptionId &&
    ["active", "trialing", "past_due"].includes(household.subscriptionStatus);

  const handlePick = async (tier: Tier) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (household && !household.isOwner) {
      toast({ variant: "destructive", title: "Owner only", description: "Only the household owner can change the plan." });
      return;
    }
    // Existing subscriber → route through Stripe portal (handles upgrade/downgrade with proration)
    if (hasActiveSub) {
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
          <p className="text-sm text-muted-foreground">Cancel anytime. Voice minutes reset each month.</p>
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
                    <span className="text-xl font-bold">{tier.price}</span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                </div>

                <ul className="space-y-1.5 mb-4">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePick(tier.id)}
                  disabled={isCurrent}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {isCurrent ? "Current plan" : household ? `Switch to ${tier.name}` : `Get ${tier.name}`}
                </button>
              </div>
            );
          })}
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
            <p className="font-medium">When do voice minutes reset?</p>
            <p className="text-muted-foreground text-xs mt-1">On your billing anniversary each month.</p>
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
            <StripeEmbeddedCheckout
              priceId={PRICE_IDS[checkoutTier]}
              returnUrl={`${window.location.origin}/settings?checkout=success`}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PricingPage;
