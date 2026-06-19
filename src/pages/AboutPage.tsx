import { Sparkles, Mic, ShoppingCart, CheckSquare, CalendarDays, Receipt, Users, ShieldCheck } from "lucide-react";
import maiLogo from "@/assets/mai-logo.png";

const features = [
  {
    icon: Mic,
    title: "Talk to MIA",
    body: "Just speak — add groceries, schedule events, or check in on the day. MIA listens, understands, and acts in seconds.",
  },
  {
    icon: ShoppingCart,
    title: "Shared Grocery List",
    body: "A single, smart list that everyone in the household can update from anywhere — voice or tap.",
  },
  {
    icon: CheckSquare,
    title: "To-Do, Done",
    body: "Assign tasks, track progress, and finally clear the mental load. MIA keeps the family in sync.",
  },
  {
    icon: CalendarDays,
    title: "Family Calendar",
    body: "Two-way voice sync, AI imports from PDFs and screenshots, and gentle reminders that actually land on time.",
  },
  {
    icon: Receipt,
    title: "Receipts, Decoded",
    body: "Snap a photo — MIA extracts the items, totals, and categories. Goodbye shoebox.",
  },
  {
    icon: Users,
    title: "Built for Households",
    body: "Invite the whole family. Everyone stays connected with one shared brain — and one quiet voice.",
  },
];

const AboutPage = () => {
  return (
    <div className="page-container">
      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-10 animate-fade-in">
        <div className="relative mb-5">
          <img src={maiLogo} alt="MIA" className="w-24 h-24 rounded-3xl relative z-10" />
          <div className="absolute inset-0 rounded-3xl blur-2xl bg-gradient-brand opacity-70 scale-110" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech">
          Meet MIA
        </p>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient mt-1">
          Your Family's AI Co-Pilot
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-sm leading-relaxed">
          MIA is the always-on assistant that turns the chaos of family life into something quietly, beautifully effortless.
          Speak to it. Trust it. Reclaim your weekends.
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
          Your family's data stays yours. Encrypted in transit, isolated by household, and never sold.
        </p>
      </div>

      {/* Powered by */}
      <div className="relative rounded-2xl p-5 text-center overflow-hidden border border-border">
        <div className="absolute inset-0 bg-gradient-brand opacity-15" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
            <Sparkles className="w-3 h-3 text-primary" />
            Powered by
          </div>
          <p className="text-lg font-display font-bold text-gradient">AI Blue Ribbon</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Premium intelligence, tuned for the people who matter most.
          </p>
          <p className="text-[11px] text-muted-foreground mt-3">
            Questions? Email{" "}
            <a href="mailto:support@miafamilyassistant.com" className="text-primary hover:underline">
              support@miafamilyassistant.com
            </a>
          </p>
        </div>
      </div>

      <p className="text-[10px] text-center text-muted-foreground/70 mt-6">
        © 2026 Mia Family Assistant. All rights reserved.
      </p>
    </div>
  );
};

export default AboutPage;
