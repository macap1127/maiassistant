import { Sparkles, Mic, Users, CalendarDays, CheckSquare, Bell, ArrowRight, Smartphone, MessageSquare, Play } from "lucide-react";
import maiLogo from "@/assets/mai-logo.png";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Join the Google Group",
    body: "Join our private testers community to share feedback, report bugs, and get early access to new features before anyone else.",
    cta: "Join Google Group",
    href: "https://groups.google.com/g/mia-family-assistant-testers",
  },
  {
    number: "02",
    icon: Smartphone,
    title: "Opt into the Beta",
    body: "Become an official beta tester on Google Play. Your opt-in lets us deliver beta builds directly to your device.",
    cta: "Opt into Beta",
    href: "https://play.google.com/apps/testing/com.aiblueribbon.mia",
  },
  {
    number: "03",
    icon: Play,
    title: "Install from the Play Store",
    body: "Once you're opted in, install Mia Family Assistant from the Play Store and start simplifying your family life today.",
    cta: "Install Now",
    href: "https://play.google.com/store/apps/details?id=com.aiblueribbon.mia",
  },
];

const benefits = [
  {
    icon: Mic,
    title: "Voice-first",
    body: "Add groceries, schedule events, and check your day — just by talking.",
  },
  {
    icon: Users,
    title: "Built for households",
    body: "One shared brain for the whole family. Everyone stays in sync.",
  },
  {
    icon: CalendarDays,
    title: "Smart calendar",
    body: "AI imports events from screenshots and PDFs, then reminds you before they start.",
  },
  {
    icon: CheckSquare,
    title: "Shared to-do's",
    body: "Assign tasks, track progress, and clear the mental load together.",
  },
  {
    icon: Bell,
    title: "Push notifications",
    body: "Daily digests and 30-minute event reminders delivered straight to your phone.",
  },
  {
    icon: Sparkles,
    title: "AI inside",
    body: "Powered by AI Blue Ribbon — premium intelligence tuned for busy families.",
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Aurora background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[60vh] bg-[radial-gradient(ellipse_at_center,hsl(250_90%_66%_/_0.22),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[80vw] h-[50vh] bg-[radial-gradient(ellipse_at_center,hsl(200_100%_60%_/_0.15),transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 py-16 md:py-24">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-14 animate-fade-in">
          <div className="relative mb-6">
            <img src={maiLogo} alt="Mia Family Assistant" className="w-28 h-28 rounded-3xl relative z-10" />
            <div className="absolute inset-0 rounded-3xl blur-2xl bg-gradient-brand opacity-70 scale-110" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-3">
            Private Beta Now Open
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-gradient leading-tight">
            Mia Family Assistant
          </h1>
          <p className="text-base text-muted-foreground mt-4 max-w-sm leading-relaxed">
            The AI co-pilot that turns family chaos into calm. Voice, calendar, tasks, groceries, and reminders — all in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button asChild size="lg" className="rounded-full px-8 shadow-glow bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 text-white hover:opacity-90 transition-opacity">
              <a href="#join">
                Join the Beta
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 border-border/80 hover:bg-muted">
              <a href="/auth">Sign in</a>
            </Button>
          </div>
        </div>

        {/* Why join */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
              Why join the beta
            </p>
            <h2 className="text-2xl font-display font-bold text-gradient">
              Shape the future of family AI
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {benefits.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="bg-card/80 border border-border/80 rounded-2xl p-4 backdrop-blur-sm animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary relative z-10">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-display font-semibold mb-1">{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div id="join" className="mb-16 scroll-mt-24">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
              Get started in 3 steps
            </p>
            <h2 className="text-2xl font-display font-bold text-gradient">
              Be the first to experience Mia
            </h2>
          </div>
          <div className="space-y-4">
            {steps.map(({ number, icon: Icon, title, body, cta, href }, i) => (
              <div
                key={title}
                className="group relative bg-card/90 border border-border/80 rounded-2xl p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-card animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="absolute top-4 right-4 text-[10px] font-mono-tech text-muted-foreground/50">
                  {number}
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-display font-semibold mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{body}</p>
                    <Button asChild variant="outline" className="rounded-full px-5 border-border/80 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors">
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {cta}
                        <ArrowRight className="w-3.5 h-3.5 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-border/60 pt-8">
          <p className="text-xs text-muted-foreground mb-4">
            Questions? Email{" "}
            <a href="mailto:support@miafamilyassistant.com" className="text-primary hover:underline">
              support@miafamilyassistant.com
            </a>
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/70">
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-6">
            © 2026 Mia Family Assistant. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
