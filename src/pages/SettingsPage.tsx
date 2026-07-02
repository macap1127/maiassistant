import { useFamilyData, genId } from "@/lib/store";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import maiLogo from "@/assets/mai-logo.png";
import { useHousehold, TIER_INFO } from "@/lib/useHousehold";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { CreditCard, ExternalLink, Loader2, AlertTriangle, Clock, Sparkles, Languages, Trash2, Users, Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PushNotificationCard } from "@/components/PushNotificationCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { isNative, restorePurchases } from "@/lib/revenuecat";

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish (Español)" },
  { value: "fr", label: "French (Français)" },
  { value: "de", label: "German (Deutsch)" },
  { value: "it", label: "Italian (Italiano)" },
  { value: "pt", label: "Portuguese (Português)" },
  { value: "nl", label: "Dutch (Nederlands)" },
  { value: "pl", label: "Polish (Polski)" },
  { value: "sv", label: "Swedish (Svenska)" },
  { value: "hi", label: "Hindi (हिन्दी)" },
  { value: "ar", label: "Arabic (العربية)" },
  { value: "zh", label: "Mandarin (中文)" },
  { value: "ja", label: "Japanese (日本語)" },
  { value: "ko", label: "Korean (한국어)" },
  { value: "ru", label: "Russian (Русский)" },
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
  const { logout } = useAuth();
  const [familyName, setFamilyName] = useState(data.familyName);
  const [saved, setSaved] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  
  const [searchParams, setSearchParams] = useSearchParams();

  const deleteAccount = async () => {
    setDeleting(true);
    const { data: res, error } = await supabase.functions.invoke("delete-account", {
      body: { environment: getStripeEnvironment() },
    });
    if (error || !res?.deleted) {
      setDeleting(false);
      toast({ variant: "destructive", title: "Couldn't delete account", description: error?.message || res?.error || "Try again." });
      return;
    }
    toast({ title: "Account deleted", description: "Your account and data have been permanently removed." });
    await logout();
    navigate("/", { replace: true });
  };


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

  const restoreNativePurchases = async () => {
    setRestoringPurchases(true);
    try {
      await restorePurchases();
      toast({ title: "Purchases restored", description: "Refreshing your plan…" });
      setTimeout(() => void refresh(), 1500);
    } catch (e) {
      toast({ variant: "destructive", title: "Restore failed", description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setRestoringPurchases(false);
    }
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
              <span className="ml-auto text-xs uppercase tracking-wider text-muted-foreground">
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
                <p className="text-xs uppercase text-muted-foreground">Plan</p>
                <p className="font-medium">
                  {household.isInTrial ? `Trial of ${tier.label}` : isLocked ? "No active plan" : `${tier.label} · $${tier.price.toFixed(2)}/mo`}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {isCanceledScheduled ? "Ends" : household.isInTrial ? "Trial ends" : "Renews"}
                </p>
                <p className="font-medium">
                  {household.isInTrial && household.trialEndsAt
                    ? new Date(household.trialEndsAt).toLocaleDateString()
                    : renewDate ?? "—"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs uppercase text-muted-foreground mb-1">Voice usage</p>
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
                onClick={() => (!isNative() && hasActiveSub && household.isOwner ? openPortal() : navigate("/pricing"))}
                disabled={loadingPortal}
                className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loadingPortal && <Loader2 className="w-3 h-3 animate-spin" />}
                {hasActiveSub ? "Change plan" : isLocked ? "Choose a plan" : "Subscribe"}
              </button>
              {!isNative() && household.isOwner && household.stripeCustomerId && (
                <button
                  onClick={openPortal}
                  disabled={loadingPortal}
                  className="flex-1 bg-secondary text-secondary-foreground rounded-xl py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loadingPortal ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                  Manage billing
                </button>
              )}
              {isNative() && household.isOwner && (
                <button
                  onClick={restoreNativePurchases}
                  disabled={restoringPurchases}
                  className="flex-1 bg-secondary text-secondary-foreground rounded-xl py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {restoringPurchases && <Loader2 className="w-3 h-3 animate-spin" />}
                  Restore purchases
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

        <FamilyMembersCard data={data} update={update} />

        <PushNotificationCard />

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
          <p className="text-xs text-muted-foreground mt-2">
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

        <div className="flex flex-col items-center gap-2 pt-2 text-xs text-muted-foreground animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-center gap-3">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span>&middot;</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms & Conditions
            </Link>
          </div>
          <a href="mailto:support@miafamilyassistant.com" className="hover:text-foreground transition-colors">
            support@miafamilyassistant.com
          </a>
        </div>

        <div className="bg-card border border-destructive/30 rounded-2xl p-4 mt-6 animate-slide-up" style={{ animationDelay: "240ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="w-4 h-4 text-destructive" />
            <h2 className="font-medium text-sm text-destructive">Delete account</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Permanently delete your Mia account{household?.isOwner ? ", your household, and all its data" : " and leave your household"}. This cannot be undone. Any active subscription will be canceled.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={deleting}
                className="w-full bg-destructive/10 text-destructive border border-destructive/30 rounded-xl py-2 text-xs font-medium hover:bg-destructive/15 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                Delete my account
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your account
                  {household?.isOwner ? ", your household, all family members, events, tasks, groceries, receipts," : ","}
                  {" "}and cancels any active subscription. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

type FamilyData = ReturnType<typeof useFamilyData>["data"];
type FamilyUpdate = ReturnType<typeof useFamilyData>["update"];

function FamilyMembersCard({ data, update }: { data: FamilyData; update: FamilyUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Member");
  const [phone, setPhone] = useState("");

  const add = () => {
    const n = name.trim();
    if (!n) return;
    update((d) => ({
      ...d,
      members: [...d.members, { id: genId(), name: n, role, phone: phone.trim(), avatar: "👤" }],
    }));
    setName(""); setPhone(""); setRole("Member"); setShowAdd(false);
  };

  const remove = (id: string) =>
    update((d) => ({ ...d, members: d.members.filter((m) => m.id !== id) }));

  return (
    <div className="bg-card rounded-2xl p-4 border border-border animate-slide-up" style={{ animationDelay: "40ms" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Family Members
          </label>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"
          aria-label="Add family member"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showAdd && (
        <div className="space-y-2 mb-3 pb-3 border-b border-border">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {["Parent","Child","Member","Caregiver","Other"].map((r) => <option key={r}>{r}</option>)}
            </select>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              inputMode="tel"
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={add}
            disabled={!name.trim()}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            Add member
          </button>
        </div>
      )}

      {data.members.length === 0 ? (
        <p className="text-xs text-muted-foreground">No members yet. Tap + to add one.</p>
      ) : (
        <ul className="space-y-2">
          {data.members.map((m, i) => (
            <li key={m.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-base">
                {m.avatar || "👤"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {m.role}{m.phone ? ` · ${m.phone}` : ""}
                </p>
              </div>
              {i !== 0 && (
                <button
                  onClick={() => remove(m.id)}
                  aria-label={`Remove ${m.name}`}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
