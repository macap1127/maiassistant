import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Mic, ScanLine, ShieldCheck, Cloud } from "lucide-react";
import { useTranslation } from "react-i18next";

const STORAGE_PREFIX = "mia_ai_consent_v2_";

export function AIConsentModal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const key = STORAGE_PREFIX + user.id;
    const stored = localStorage.getItem(key);
    if (!stored) setOpen(true);
  }, [user?.id]);

  if (!open || !user?.id) return null;

  const key = STORAGE_PREFIX + user.id;

  const accept = () => {
    localStorage.setItem(key, `accepted:${new Date().toISOString()}`);
    setOpen(false);
  };

  const decline = async () => {
    // Per Apple Guideline 5.1.1(i)/5.1.2(i): if the user does not consent to
    // AI data processing, we must not send their data to third-party AI services.
    // MIA's core value depends on those services, so we sign the user out
    // instead of continuing with a partially-working experience.
    localStorage.setItem(key, `declined:${new Date().toISOString()}`);
    setOpen(false);
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/90 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
    >
      <div className="glass-strong w-full max-w-md rounded-3xl p-6 border border-border ring-glow animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-brand flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="ai-consent-title" className="text-lg font-display font-semibold">
              {t("aiConsent.title")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("aiConsent.subtitle")}</p>
          </div>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed mb-4">
          {t("aiConsent.intro")}
        </p>

        <div className="rounded-2xl border border-border bg-muted/40 p-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70 mb-2">
            {t("aiConsent.whatWeSend.title")}
          </p>
          <ul className="space-y-1.5 text-sm text-foreground/85">
            <li>• {t("aiConsent.whatWeSend.voice")}</li>
            <li>• {t("aiConsent.whatWeSend.photos")}</li>
            <li>• {t("aiConsent.whatWeSend.text")}</li>
          </ul>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70 mt-4 mb-2">
            {t("aiConsent.whoReceives.title")}
          </p>
          <ul className="space-y-1.5 text-sm text-foreground/85">
            <li className="flex gap-2">
              <Cloud className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span><strong>Google</strong> {t("aiConsent.whoReceives.google")}</span>
            </li>
            <li className="flex gap-2">
              <Mic className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span><strong>ElevenLabs</strong> {t("aiConsent.whoReceives.elevenLabs")}</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            {t("aiConsent.processingNote")}
          </p>
        </div>

        <ul className="space-y-2.5 mb-5 text-sm text-foreground/85">
          <li className="flex gap-2.5">
            <ScanLine className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>{t("aiConsent.contentModeration")}</span>
          </li>
          <li className="flex gap-2.5">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              {t("aiConsent.reportAbusePrefix")}{" "}
              <a href="mailto:support@miafamilyassistant.com" className="text-primary underline">
                support@miafamilyassistant.com
              </a>
              {t("aiConsent.reportAbuseSuffix")}
            </span>
          </li>
        </ul>

        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
          {t("aiConsent.detailsPrefix")}{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="underline text-foreground/80">
            {t("aiConsent.privacyPolicy")}
          </a>{" "}
          {t("aiConsent.and")}{" "}
          <a href="/terms" target="_blank" rel="noreferrer" className="underline text-foreground/80">
            {t("aiConsent.terms")}
          </a>
          {t("aiConsent.declineNote")}
        </p>

        <div className="flex gap-2">
          <button
            onClick={decline}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-foreground/80 hover:bg-muted transition-colors"
          >
            {t("aiConsent.decline")}
          </button>
          <button
            onClick={accept}
            className="flex-1 h-11 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-lg hover:opacity-95 transition-opacity"
          >
            {t("aiConsent.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
