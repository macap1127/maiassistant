import { Sparkles, Mic, ShoppingCart, CheckSquare, CalendarDays, Receipt, Users, ShieldCheck } from "lucide-react";
import maiLogo from "@/assets/mai-logo.png";
import { useTranslation } from "react-i18next";

const FEATURE_ICONS = [Mic, ShoppingCart, CheckSquare, CalendarDays, Receipt, Users];
const FEATURE_KEYS = ["talkToMia", "groceryList", "todos", "calendar", "receipts", "households"] as const;

const AboutPage = () => {
  const { t } = useTranslation();
  const features = FEATURE_KEYS.map((key, i) => ({
    icon: FEATURE_ICONS[i],
    title: t(`about.features.${key}.title`),
    body: t(`about.features.${key}.body`),
  }));
  return (
    <div className="page-container">
      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-10 animate-fade-in">
        <div className="relative mb-5">
          <img src={maiLogo} alt="MIA" className="w-24 h-24 rounded-3xl relative z-10" />
          <div className="absolute inset-0 rounded-3xl blur-2xl bg-gradient-brand opacity-70 scale-110" />
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono-tech">
          {t("about.hero.eyebrow")}
        </p>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient mt-1">
          {t("about.hero.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-sm leading-relaxed">
          {t("about.hero.subtitle")}
        </p>
      </div>

      {/* Features */}
      <div className="space-y-3 mb-8">
        {features.map(({ icon: Icon, title, body }, i) => (
          <div
            key={title}
            className="bg-card border border-border rounded-2xl p-4 animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary relative z-10">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="absolute inset-0 rounded-xl blur-md bg-gradient-brand opacity-30" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-display font-semibold mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Privacy callout */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-8 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("about.privacyCallout")}
        </p>
      </div>

      {/* Powered by */}
      <div className="relative rounded-2xl p-5 text-center overflow-hidden border border-border">
        <div className="absolute inset-0 bg-gradient-brand opacity-15" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
            <Sparkles className="w-3 h-3 text-primary" />
            {t("about.poweredBy.label")}
          </div>
          <p className="text-lg font-display font-bold text-gradient">AI Blue Ribbon</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("about.poweredBy.tagline")}
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            {t("about.poweredBy.questions")}{" "}
            <a href="mailto:support@miafamilyassistant.com" className="text-primary hover:underline">
              support@miafamilyassistant.com
            </a>
          </p>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground/70 mt-6">
        {t("about.copyright")}
      </p>
    </div>
  );
};

export default AboutPage;
