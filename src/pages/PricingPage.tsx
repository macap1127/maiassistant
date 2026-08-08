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
import { useTranslation } from "react-i18next";
import {
  initRevenueCat,
  getOfferings,
  purchasePackage,
  purchaseProductById,

  restorePurchases,
  isNative,
  getNativePlatform,
  
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
  nameKey: string;
  taglineKey: string;
  monthly: number;
  yearly: number;
  icon: typeof Zap;
  popular?: boolean;
  highlightKeys: string[];
};

const tiers: TierDef[] = [
  {
    id: "basic",
    nameKey: "pricing.tier.basic.name",
    taglineKey: "pricing.tier.basic.tagline",
    monthly: 7.99,
    yearly: 70.99,
    icon: Zap,
    highlightKeys: [
      "pricing.highlight.oneLogin",
      "pricing.highlight.voiceMinutes30",
      "pricing.highlight.tasksGroceriesCalendar",
      "pricing.highlight.voiceAssistant15",
      "pricing.highlight.receiptScans10",
      "pricing.highlight.calendarImports5",
    ],
  },
  {
    id: "family",
    nameKey: "pricing.tier.family.name",
    taglineKey: "pricing.tier.family.tagline",
    monthly: 22.99,
    yearly: 220.99,
    icon: Crown,
    popular: true,
    highlightKeys: [
      "pricing.highlight.upTo4Logins",
      "pricing.highlight.voiceMinutes120",
      "pricing.highlight.everythingInBasic",
      "pricing.highlight.sharedWorkspace",
      "pricing.highlight.dailyPush",
      "pricing.highlight.unlimitedReceipts",
      "pricing.highlight.aiCalendarImport",
    ],
  },
  {
    id: "family_plus",
    nameKey: "pricing.tier.familyPlus.name",
    taglineKey: "pricing.tier.familyPlus.tagline",
    monthly: 35.99,
    yearly: 350.99,
    icon: Sparkles,
    highlightKeys: [
      "pricing.highlight.upTo6Logins",
      "pricing.highlight.voiceMinutes240",
      "pricing.highlight.everythingInFamily",
      "pricing.highlight.prioritySupport",
    ],
  },
];

type FeatureRow = {
  labelKey: string;
  basic: string | boolean;
  family: string | boolean;
  family_plus: string | boolean;
};

const featureMatrix: { groupKey: string; rows: FeatureRow[] }[] = [
  {
    groupKey: "pricing.group.household",
    rows: [
      { labelKey: "pricing.feature.loginsIncluded", basic: "1", family: "4", family_plus: "6" },
      { labelKey: "pricing.feature.sharedWorkspace", basic: false, family: true, family_plus: true },
      { labelKey: "pricing.feature.inviteMembers", basic: false, family: true, family_plus: true },
    ],
  },
  {
    groupKey: "pricing.group.voiceAssistant",
    rows: [
      { labelKey: "pricing.feature.voiceMinutesPerMonth", basic: "30", family: "120", family_plus: "240" },
      { labelKey: "pricing.feature.languages15", basic: true, family: true, family_plus: true },
      { labelKey: "pricing.feature.bidirectionalSync", basic: true, family: true, family_plus: true },
    ],
  },
  {
    groupKey: "pricing.group.everydayTools",
    rows: [
      { labelKey: "pricing.feature.tasksGroceriesCalendar", basic: true, family: true, family_plus: true },
      { labelKey: "pricing.feature.dailyPushReminders", basic: false, family: true, family_plus: true },
      { labelKey: "pricing.feature.receiptScanningOcr", basic: "pricing.value.tenPerMo", family: "pricing.value.unlimited", family_plus: "pricing.value.unlimited" },
      { labelKey: "pricing.feature.aiCalendarImportPdf", basic: "pricing.value.fivePerMo", family: "pricing.value.unlimited", family_plus: "pricing.value.unlimited" },
    ],
  },
  {
    groupKey: "pricing.group.support",
    rows: [
      { labelKey: "pricing.feature.emailSupport", basic: true, family: true, family_plus: true },
      { labelKey: "pricing.feature.prioritySupport", basic: false, family: false, family_plus: true },
    ],
  },
];

function Cell({ value, t }: { value: string | boolean; t: (k: string) => string }) {
  if (value === true) return <Check className="w-3.5 h-3.5 text-primary mx-auto" />;
  if (value === false) return <Minus className="w-3.5 h-3.5 text-muted-foreground/50 mx-auto" />;
  const display = value.startsWith("pricing.") ? t(value) : value;
  return <span className="text-xs font-medium">{display}</span>;
}

const PricingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { household, refresh } = useHousehold();
  const [checkoutTier, setCheckoutTier] = useState<Tier | null>(null);
  const [billingInterval, setBillingInterval] = useState<Interval>("monthly");
  const [nativePurchasing, setNativePurchasing] = useState<Tier | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [nativePlatform, setNativePlatform] = useState<"android" | "ios" | null>(() => getNativePlatform());
  const native = nativePlatform !== null;

  useEffect(() => {
    if (native && user?.id) initRevenueCat(user.id).catch(console.warn);
  }, [native, user?.id]);

  useEffect(() => {
    // Re-check briefly after first render in native release builds, where the
    // Capacitor bridge can become available after React has already mounted.
    let checks = 0;
    let intervalId: number | undefined;
    const updatePlatform = () => {
      const platform = getNativePlatform();
      if (platform) setNativePlatform(platform);
      checks += 1;
      if ((platform || checks >= 10) && intervalId) window.clearInterval(intervalId);
    };
    updatePlatform();
    intervalId = window.setInterval(updatePlatform, 300);
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  const hasActiveSub =
    !!household?.stripeSubscriptionId &&
    ["active", "trialing", "past_due"].includes(household.subscriptionStatus);

  const handleNativePurchase = async (tier: Tier) => {
    setNativePurchasing(tier);
    const wantedProduct = PRICE_IDS[billingInterval][tier];
    try {
      // Always make sure the SDK is configured before touching billing —
      // tapping a plan immediately after the paywall mounts used to race the
      // background init and fail with "singleton instance not configured".
      await initRevenueCat(user?.id);

      let pkg: any = null;
      try {
        const offering = await getOfferings();
        pkg = offering?.availablePackages?.find(
          (p: any) =>
            p.identifier === wantedProduct ||
            p.product?.identifier === wantedProduct ||
            p.product?.identifier?.endsWith(`.${wantedProduct}`) ||
            p.product?.identifier?.replace(/\./g, "_").endsWith(wantedProduct),
        );
      } catch (offeringError) {
        console.warn("[purchase] offerings unavailable, falling back to direct product", offeringError);
      }

      if (pkg) {
        await purchasePackage(pkg);
      } else {
        // No Offering configured (or product missing from it) — purchase the
        // store product directly so StoreKit still handles the transaction.
        await purchaseProductById(wantedProduct);
      }

      toast({ title: t("pricing.purchaseComplete"), description: t("pricing.updatingPlan") });
      // Give RC webhook a moment to update Supabase, then refresh.
      setTimeout(() => refresh?.(), 2500);
    } catch (e: any) {
      const message = e?.message ?? String(e);
      if (e?.userCancelled || e?.code === "1" || /cancel/i.test(message)) return;
      console.error("[purchase] failed", e);
      toast({ variant: "destructive", title: t("pricing.purchaseFailed"), description: message });
    } finally {
      setNativePurchasing(null);
    }
  };


  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      toast({ title: t("pricing.purchasesRestored"), description: t("pricing.refreshingPlan") });
      setTimeout(() => refresh?.(), 1500);
    } catch (e: any) {
      toast({ variant: "destructive", title: t("pricing.restoreFailed"), description: e?.message ?? String(e) });
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
      toast({ variant: "destructive", title: t("pricing.ownerOnly"), description: t("pricing.ownerOnlyDesc") });
      return;
    }
    const runtimeNativePlatform = getNativePlatform();
    if (runtimeNativePlatform) {
      setNativePlatform(runtimeNativePlatform);
      await handleNativePurchase(tier);
      return;
    }
    if (hasActiveSub) {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      if (data?.url) {
        window.open(data.url, "_blank");
        return;
      }
      // Customer id belongs to a different Stripe env (e.g. sandbox customer,
      // live site). Fall back to a fresh checkout so the user can subscribe.
      if (data?.error === "customer_not_found") {
        setCheckoutTier(tier);
        return;
      }
      toast({ variant: "destructive", title: t("pricing.couldntOpenPortal"), description: error?.message || data?.error || t("pricing.tryAgain") });
      return;
    }
    setCheckoutTier(tier);
  };


  return (
    <>
      <PaymentTestModeBanner />
      <div className="page-container pb-28">
        {household?.hasAccess !== false && (
          <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            ← {t("pricing.back")}
          </button>
        )}

        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-2xl font-serif font-semibold mb-2">{t("pricing.chooseYourPlan")}</h1>
          <p className="text-sm text-muted-foreground">
            {household?.hasAccess === false
              ? t("pricing.selectPlanToActivate")
              : t("pricing.startFreeTrial")}
          </p>

          {nativePlatform && (
            <p className="mt-1 text-xs text-muted-foreground/70">
              {t("pricing.billedThrough", { store: nativePlatform === "ios" ? t("pricing.appStore") : t("pricing.googlePlay") })}
            </p>
          )}
          {household && !household.hasUsedTrial && (
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Sparkles className="w-3 h-3" /> {t("pricing.sevenDayTrialBadge")}
            </div>
          )}
        </div>

        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center bg-secondary/60 border border-border rounded-full p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                billingInterval === "monthly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("pricing.monthly")}
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                billingInterval === "yearly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("pricing.yearly")}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${billingInterval === "yearly" ? "bg-primary-foreground/20" : "bg-primary/15 text-primary"}`}>
                {t("pricing.save24")}
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {tiers.map((tier, i) => {
            const Icon = tier.icon;
            const isCurrent = household?.subscriptionTier === tier.id && household?.subscriptionStatus === "active";
            const tierName = t(tier.nameKey);
            return (
              <div
                key={tier.id}
                className={`relative bg-card rounded-2xl border p-5 animate-slide-up ${tier.popular ? "border-primary shadow-md" : "border-border"}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full">
                    {t("pricing.mostPopular")}
                  </span>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">{tierName}</h2>
                    <p className="text-xs text-muted-foreground">{t(tier.taglineKey)}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-xl font-bold">${billingInterval === "monthly" ? tier.monthly : tier.yearly}</span>
                    <span className="text-xs text-muted-foreground">/{billingInterval === "monthly" ? t("pricing.mo") : t("pricing.yr")}</span>
                    {billingInterval === "yearly" && (
                      <p className="text-xs text-muted-foreground mt-0.5">≈ ${(tier.yearly / 12).toFixed(2)}/{t("pricing.mo")}</p>
                    )}
                  </div>
                </div>

                <ul className="space-y-1.5 mb-4">
                  {tier.highlightKeys.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span>{t(f)}</span>
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
                    ? t("pricing.currentPlan")
                    : nativePurchasing === tier.id
                    ? t("pricing.openingStore")
                    : household && hasActiveSub
                    ? t("pricing.switchTo", { name: tierName })
                    : household && !household.hasUsedTrial
                    ? t("pricing.start7DayTrial")
                    : t("pricing.get", { name: tierName })}
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
              {restoring ? t("pricing.restoring") : t("pricing.restorePurchases")}
            </button>
          </div>
        )}

        {/* Compare features table */}
        <div className="mt-10">
          <h2 className="font-serif text-lg font-semibold mb-3 text-center">{t("pricing.comparePlans")}</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="px-3 py-2">{t("pricing.feature")}</div>
              <div className="px-2 py-2 text-center">{t("pricing.tier.basic.name")}</div>
              <div className="px-2 py-2 text-center text-primary">{t("pricing.tier.family.name")}</div>
              <div className="px-2 py-2 text-center">{t("pricing.tier.familyPlusShort")}</div>
            </div>
            {featureMatrix.map((section) => (
              <div key={section.groupKey}>
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/20 border-t border-border">
                  {t(section.groupKey)}
                </div>
                {section.rows.map((row) => (
                  <div key={row.labelKey} className="grid grid-cols-[1.4fr_repeat(3,1fr)] items-center border-t border-border text-xs">
                    <div className="px-3 py-2.5">{t(row.labelKey)}</div>
                    <div className="px-2 py-2.5 text-center"><Cell value={row.basic} t={t} /></div>
                    <div className="px-2 py-2.5 text-center"><Cell value={row.family} t={t} /></div>
                    <div className="px-2 py-2.5 text-center"><Cell value={row.family_plus} t={t} /></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 space-y-4 text-sm">
          <h2 className="font-serif text-lg font-semibold">{t("pricing.faq")}</h2>
          <div>
            <p className="font-medium">{t("pricing.faq1Q")}</p>
            <p className="text-muted-foreground text-xs mt-1">{t("pricing.faq1A")}</p>
          </div>
          <div>
            <p className="font-medium">{t("pricing.faq2Q")}</p>
            <p className="text-muted-foreground text-xs mt-1">{t("pricing.faq2A")}</p>
          </div>
          <div>
            <p className="font-medium">{t("pricing.faq3Q")}</p>
            <p className="text-muted-foreground text-xs mt-1">{t("pricing.faq3A")}</p>
          </div>
          <div>
            <p className="font-medium">{t("pricing.faq4Q")}</p>
            <p className="text-muted-foreground text-xs mt-1">{t("pricing.faq4A")}</p>
          </div>
        </div>
      </div>

      {checkoutTier && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur overflow-y-auto p-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold">{t("pricing.subscribeTo", { name: tiers.find(t2 => t2.id === checkoutTier)?.nameKey ? t(tiers.find(t2 => t2.id === checkoutTier)!.nameKey) : "" })}</h2>
              <button onClick={() => setCheckoutTier(null)} className="p-2 rounded-full hover:bg-secondary" aria-label={t("pricing.close")}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const tier = tiers.find(t2 => t2.id === checkoutTier)!;
              const amount = billingInterval === "monthly" ? tier.monthly : tier.yearly;
              const period = billingInterval === "monthly" ? t("pricing.month") : t("pricing.year");
              return (
                <>
                  <div className="bg-secondary/40 border border-border rounded-xl p-3 mb-4 text-xs text-muted-foreground leading-relaxed">
                    {household && !household.hasUsedTrial ? (
                      <>
                        <p className="text-foreground font-medium mb-1">{t("pricing.trialThenPrice", { amount, period })}</p>
                        <p>{t("pricing.trialTerms", { interval: billingInterval })}</p>
                      </>
                    ) : (
                      <p>{t("pricing.renewsTerms", { interval: billingInterval, amount })}</p>
                    )}
                    <p className="mt-2">
                      {t("pricing.bySubscribingPrefix")}{" "}
                      <Link to="/terms" className="underline hover:text-foreground" target="_blank">{t("pricing.terms")}</Link> {t("pricing.and")}{" "}
                      <Link to="/privacy" className="underline hover:text-foreground" target="_blank">{t("pricing.privacyPolicy")}</Link>.
                    </p>
                  </div>

                  <StripeEmbeddedCheckout
                    priceId={PRICE_IDS[billingInterval][checkoutTier]}
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
