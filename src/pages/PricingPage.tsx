import { Check, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tiers = [
  {
    name: "Standard",
    tagline: "Smart Family",
    price: "$7.99",
    period: "/month",
    icon: Zap,
    color: "text-blue-500",
    bgAccent: "bg-blue-500/10 border-blue-500/20",
    buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
    popular: true,
    features: [
      "Save family members",
      "Basic reminders & tasks",
      "Grocery list",
      "Calendar reminders",
      "Web/app access",
      "Limited voice interactions",
    ],
    limits: [
      "25 voice requests/month",
      "No SMS notifications",
      "No integrations",
      "No smart automations",
    ],
    voiceNote: "",
    cta: "Start Smart Family",
  },
  {
    name: "Premium",
    tagline: "AI Family Command Center",
    price: "$19.99",
    period: "/month",
    icon: Crown,
    color: "text-purple-500",
    bgAccent: "bg-purple-500/10 border-purple-500/20",
    buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
    features: [
      "Everything in Standard",
      "Unlimited reminders & tasks",
      "Grocery & chore automation",
      "SMS reminders",
      "Calendar sync",
      "Family member profiles",
      "Basic voice assistant access",
      "Shared household management",
    ],
    limits: [],
    voiceNote: "Moderate voice usage included",
    cta: "Unlock Full Power",
  },
];

const PricingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container pb-28">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        ← Back
      </button>

      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-2xl font-serif font-semibold mb-2">Choose Your Plan</h1>
        <p className="text-sm text-muted-foreground">
          Find the perfect plan for your family
        </p>
      </div>

      <div className="space-y-4">
        {tiers.map((tier, i) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.name}
              className={`relative bg-card rounded-2xl border p-5 animate-slide-up ${
                tier.popular ? "border-primary shadow-md" : "border-border"
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {tier.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full">
                  Most Popular
                </span>
              )}

              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${tier.bgAccent}`}>
                  <Icon className={`w-4.5 h-4.5 ${tier.color}`} />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">{tier.name}</h2>
                  <p className="text-xs text-muted-foreground">{tier.tagline}</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-xl font-bold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-xs text-muted-foreground">{tier.period}</span>
                  )}
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

              {tier.limits.length > 0 && (
                <div className="mb-4 pl-5">
                  {tier.limits.map((l) => (
                    <p key={l} className="text-xs text-muted-foreground leading-relaxed">
                      • {l}
                    </p>
                  ))}
                </div>
              )}

              {tier.voiceNote && (
                <p className="text-xs text-muted-foreground mb-4 pl-5">
                  🎤 {tier.voiceNote}
                </p>
              )}

              <button
                className={`w-full rounded-xl py-2.5 text-sm font-medium transition-opacity hover:opacity-90 ${tier.buttonClass}`}
              >
                {tier.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingPage;
