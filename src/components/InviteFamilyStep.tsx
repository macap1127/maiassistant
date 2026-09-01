import { useState } from "react";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHousehold, TIER_INFO } from "@/lib/useHousehold";
import InviteEmailsForm from "@/components/InviteEmailsForm";

interface Props {
  onDone: () => void;
}

/**
 * Onboarding step shown right after the family names step: explains what an
 * invite does and lets the owner send every seat's invite in one go.
 */
export default function InviteFamilyStep({ onDone }: Props) {
  const { t } = useTranslation();
  const { household } = useHousehold();
  const [sentAny, setSentAny] = useState(false);

  const tier = household ? TIER_INFO[household.subscriptionTier] : TIER_INFO.basic;
  const seats = tier.logins;
  const remaining = Math.max(0, seats - (household?.memberCount ?? 1));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-lg mx-auto w-full px-5 pt-10 pb-24 flex-1 flex flex-col">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center relative z-10">
              <Users className="w-9 h-9 text-primary" />
            </div>
            <div className="absolute inset-0 rounded-2xl blur-2xl bg-gradient-brand opacity-70 scale-110" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono-tech">
            {t("invites.eyebrow")}
          </p>
          <h1 className="text-2xl font-display font-bold tracking-tight mt-1">
            {t("invites.titlePrefix")} <span className="text-gradient">{t("invites.titleAccent")}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{t("invites.subtitle")}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <ol className="space-y-2.5">
            {[t("invites.step1"), t("invites.step2"), t("invites.step3")].map((step, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 shrink-0 rounded-full bg-primary/15 text-primary text-[11px] font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          {t("invites.seatsLeft", { count: remaining, total: seats, label: tier.label })}
        </p>

        <InviteEmailsForm maxInvites={remaining} onSent={() => setSentAny(true)} />

        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{t("invites.difference")}</p>

        <div className="mt-auto pt-6">
          <button
            onClick={onDone}
            className="w-full h-10 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {sentAny ? t("invites.continue") : t("invites.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
