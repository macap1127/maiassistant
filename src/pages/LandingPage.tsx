import { Navigate, Link } from "react-router-dom";
import {
  Sparkles,
  Mic,
  Users,
  CalendarDays,
  CheckSquare,
  Bell,
  ArrowRight,
  Smartphone,
  MessageSquare,
  Play,
  Check,
  Star,
  Quote,
  Heart,
  Home,
  ShoppingCart,
  Calendar,
  ListTodo,
  Bot,
  Shield,
} from "lucide-react";
import maiLogo from "@/assets/mai-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const steps = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Join Our Beta Community",
    subtitle: "Hosted through Google Groups",
    body: "Share feedback, report bugs, and get early access to new features before anyone else.",
    cta: "Join Community",
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

const foundingPerks = [
  "12 months free after launch",
  "Early access to new features",
  "Direct influence on future updates",
  "Exclusive Founding Family badge",
];

const expectations = [
  "Use MIA with your family for 3–4 weeks",
  "Create grocery lists",
  "Add reminders",
  "Use shared tasks",
  "Try the calendar",
  "Report anything confusing or broken",
];

const screenshots = [
  { label: "Dashboard", icon: Home, color: "from-cyan-500/20 to-blue-500/20" },
  { label: "Grocery List", icon: ShoppingCart, color: "from-violet-500/20 to-fuchsia-500/20" },
  { label: "Calendar", icon: Calendar, color: "from-emerald-500/20 to-teal-500/20" },
  { label: "Voice Assistant", icon: Mic, color: "from-amber-500/20 to-orange-500/20" },
  { label: "Shared Tasks", icon: ListTodo, color: "from-rose-500/20 to-pink-500/20" },
  { label: "Notifications", icon: Bell, color: "from-sky-500/20 to-indigo-500/20" },
];

const testimonials = [
  {
    quote: "MIA finally got my whole family on the same page without the group-text chaos.",
    family: "Beta family of 5",
  },
  {
    quote: "The voice assistant is a game changer while I'm cooking with messy hands.",
    family: "Beta family of 4",
  },
];

const LandingPage = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="relative z-10 max-w-lg mx-auto px-5 py-16 md:py-24">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-14 animate-fade-in">
          <div className="relative mb-6">
            <img src={maiLogo} alt="Mia Family Assistant" className="w-28 h-28 rounded-3xl relative z-10" />
            <div className="absolute inset-0 rounded-3xl blur-2xl bg-gradient-brand opacity-70 scale-110" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-3">
            Limited Founding Family Beta
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-gradient leading-tight">
            Spend less time organizing your family
          </h1>
          <p className="text-base text-muted-foreground mt-4 max-w-sm leading-relaxed">
            —and more time enjoying it. Shared grocery lists, calendars, reminders, chores and AI assistance all in one app.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button asChild size="lg" className="rounded-full px-8 bg-gradient-brand text-primary-foreground hover:opacity-90 transition-opacity glow">
              <a href="#join">
                Become a Founding Family
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 border-border/80 hover:bg-muted">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>

        {/* Founding Family */}
        <div className="mb-16">
          <div className="glass rounded-3xl p-6 md:p-8 border border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-brand opacity-20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-mono-tech">
                  Become a Founding Family
                </p>
              </div>
              <h2 className="text-2xl font-display font-bold text-gradient mb-3">
                Help us build the future of family organization
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                We're inviting 50 families to use MIA before public launch and help shape the app through real-world feedback.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {foundingPerks.map((perk) => (
                  <div key={perk} className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-foreground/90">{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Founder Story */}
        <div className="mb-16">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center text-primary-foreground font-display font-bold text-xl">
                M
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
                From our founder
              </p>
              <h2 className="text-xl font-display font-bold text-gradient mb-3">Hi, I'm Michael.</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                I'm a father of four who was constantly switching between grocery apps, shared calendars, reminder apps, and sticky notes. So I built MIA. Now I'm looking for a small group of families to help shape it before launch.
              </p>
            </div>
          </div>
        </div>

        {/* Why beta */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border/60 mb-4">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Why we're in beta</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            We're in a limited beta because we want feedback from real families before launching publicly. MIA is already built and working — we're just making sure it fits the way families actually live.
          </p>
        </div>

        {/* Screenshots */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
              See the app
            </p>
            <h2 className="text-2xl font-display font-bold text-gradient">
              Built for the way families actually work
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {screenshots.map(({ label, icon: Icon, color }, i) => (
              <div
                key={label}
                className="group relative aspect-[9/16] rounded-2xl overflow-hidden border border-border/80 bg-muted/50 animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-60 group-hover:opacity-80 transition-opacity`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center mb-3 shadow-sm">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-xs font-display font-semibold text-foreground/90">{label}</p>
                </div>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-foreground/10" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-center text-muted-foreground/60 mt-3">
            App screenshots coming soon — previews shown above.
          </p>
        </div>

        {/* What we ask */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
              What we ask
            </p>
            <h2 className="text-2xl font-display font-bold text-gradient">
              During beta, we'd love for you to
            </h2>
          </div>
          <div className="glass rounded-2xl p-5 border border-border/80">
            <div className="space-y-3">
              {expectations.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-foreground/90">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-border/60">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-primary" />
                You'll probably spend about 5–10 minutes a day.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
              Features
            </p>
            <h2 className="text-2xl font-display font-bold text-gradient">
              Everything your family needs
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {benefits.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="rounded-2xl p-4 border border-border/80 glass animate-slide-up"
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

        {/* Social proof */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
              Already helping families
            </p>
            <h2 className="text-2xl font-display font-bold text-gradient">
              Join our growing community of beta families
            </h2>
          </div>
          <div className="space-y-3">
            {testimonials.map(({ quote, family }, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-5 border border-border/80 animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Quote className="w-5 h-5 text-primary/40 mb-2" />
                <p className="text-sm text-foreground/90 leading-relaxed mb-3">"{quote}"</p>
                <p className="text-xs text-muted-foreground">{family}</p>
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
            {steps.map(({ number, icon: Icon, title, subtitle, body, cta, href }, i) => (
              <div
                key={title}
                className="group relative glass rounded-2xl p-5 transition-all hover:border-primary/40 hover:shadow-card animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="absolute top-4 right-4 text-[10px] font-mono-tech text-muted-foreground/50">
                  {number}
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-display font-semibold mb-1">{title}</h3>
                    {subtitle && (
                      <p className="text-[10px] text-muted-foreground/80 font-mono-tech mb-1">{subtitle}</p>
                    )}
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

        {/* Final CTA */}
        <div className="mb-16 text-center">
          <div className="glass rounded-3xl p-8 border border-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-brand opacity-10" />
            <div className="relative z-10">
              <h2 className="text-2xl font-display font-bold text-gradient mb-3">
                Ready to become a Founding Family?
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Spots are limited. Join the beta community today and help shape MIA before public launch.
              </p>
              <Button asChild size="lg" className="rounded-full px-8 bg-gradient-brand text-primary-foreground hover:opacity-90 transition-opacity glow">
                <a href="#join">
                  Reserve My Spot
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
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
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
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
