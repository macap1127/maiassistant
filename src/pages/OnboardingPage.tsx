import { useEffect, useState } from "react";
import { Plus, Trash2, Sparkles, Mic, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import maiLogo from "@/assets/mai-logo.png";
import { useTranslation } from "react-i18next";
import { useMicPermission } from "@/lib/useMicPermission";

interface Row {
  name: string;
  phone: string;
}

interface Props {
  householdId: string;
  onDone: () => void;
}

const firstNameFrom = (s?: string | null) => {
  const first = String(s || "").trim().split(/[\s._-]+/)[0] || "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
};

const OnboardingPage = ({ householdId, onDone }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [extras, setExtras] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const meta = (user.user_metadata || {}) as Record<string, unknown>;
    const guess =
      (meta.full_name as string) ||
      (meta.name as string) ||
      (meta.first_name as string) ||
      firstNameFrom(user.email);
    setOwnerName(guess || "");
    setOwnerPhone((user.phone as string) || (meta.phone as string) || "");
  }, [user]);

  const addRow = () => setExtras((r) => [...r, { name: "", phone: "" }]);
  const updateRow = (i: number, patch: Partial<Row>) =>
    setExtras((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const removeRow = (i: number) => setExtras((r) => r.filter((_, idx) => idx !== i));

  const handleSubmit = async (skipExtras = false) => {
    if (!user) return;
    if (!ownerName.trim()) {
      toast({ variant: "destructive", title: t("onboarding.enterYourNameToast") });
      return;
    }
    setSaving(true);
    try {
      const rows = [
        {
          household_id: householdId,
          user_id: user.id,
          name: ownerName.trim(),
          phone: ownerPhone.trim(),
          role: "owner",
        },
        ...(skipExtras
          ? []
          : extras
              .filter((r) => r.name.trim())
              .map((r) => ({
                household_id: householdId,
                name: r.name.trim(),
                phone: r.phone.trim(),
                role: "Member",
              }))),
      ];
      const { error } = await supabase.from("family_members").insert(rows);
      if (error) throw error;
      toast({ title: t("onboarding.allSetToast"), description: t("onboarding.welcomeToMia") });
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("onboarding.couldNotSave");
      toast({ variant: "destructive", title: t("onboarding.somethingWentWrong"), description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-lg mx-auto w-full px-5 pt-10 pb-24 flex-1">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <img src={maiLogo} alt="MIA" className="w-20 h-20 rounded-2xl relative z-10" />
            <div className="absolute inset-0 rounded-2xl blur-2xl bg-gradient-brand opacity-70 scale-110" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono-tech">
            {t("onboarding.welcome")}
          </p>
          <h1 className="text-2xl font-display font-bold tracking-tight mt-1">
            {t("onboarding.letsSetUpPrefix")} <span className="text-gradient">{t("onboarding.family")}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xs leading-relaxed">
            {t("onboarding.subtitle")}
          </p>
        </div>

        {/* Owner */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("onboarding.you")}</p>
          </div>
          <label className="block text-xs text-muted-foreground mb-1">{t("onboarding.yourName")}</label>
          <input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder={t("onboarding.yourNamePlaceholder")}
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <label className="block text-xs text-muted-foreground mb-1">
            {t("onboarding.phoneNumber")} <span className="opacity-60">({t("onboarding.optional")})</span>
          </label>
          <input
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="+1 555 123 4567"
            inputMode="tel"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {t("onboarding.optionalDetailHint")}
          </p>
        </div>

        {/* Extra members */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("onboarding.familyMembers")}</p>
            <button
              type="button"
              onClick={addRow}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> {t("onboarding.add")}
            </button>
          </div>

          {extras.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("onboarding.emptyMembersHint")}
            </p>
          ) : (
            <div className="space-y-3">
              {extras.map((row, i) => (
                <div key={i} className="space-y-2 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                      placeholder={t("onboarding.name")}
                      className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    value={row.phone}
                    onChange={(e) => updateRow(i, { phone: e.target.value })}
                    placeholder={t("onboarding.phoneOptional")}
                    inputMode="tel"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-gradient-brand text-primary-foreground font-medium text-sm shadow-glow disabled:opacity-50 mb-2"
        >
          {saving ? t("onboarding.saving") : t("onboarding.continue")}
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="w-full h-10 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("onboarding.skipMembers")}
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;
