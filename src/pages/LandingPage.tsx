import { Navigate, Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import {
  Sparkles,
  Users,
  CalendarDays,
  CheckSquare,
  Bell,
  ArrowRight,
  Check,
  Home,
  ShoppingCart,
  Calendar,
  Shield,
  Receipt,
  Mic,
} from "lucide-react";
import maiLogo from "@/assets/mai-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
    icon: Receipt,
    title: "Receipt tracking",
    body: "Snap photos of receipts and keep spending records organized by household.",
  },
];

const screenshots = [
  { label: "Home", icon: Home, image: "/screenshots/dashboard.png", color: "from-cyan-500/20 to-blue-500/20" },
  { label: "Meet MIA", icon: Sparkles, image: "/screenshots/about.png", color: "from-violet-500/20 to-fuchsia-500/20" },
  { label: "Grocery List", icon: ShoppingCart, image: "/screenshots/grocery.png", color: "from-emerald-500/20 to-teal-500/20" },
  { label: "Receipts", icon: Receipt, image: "/screenshots/receipts.png", color: "from-rose-500/20 to-pink-500/20" },
  { label: "Calendar", icon: Calendar, image: "/screenshots/calendar.png", color: "from-amber-500/20 to-orange-500/20" },
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
  // On the native iOS app, skip marketing and route straight to sign-in.
  if (Capacitor.getPlatform() === "ios") {
    return <Navigate to="/auth" replace />;
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
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-3">
            Mia Family Assistant
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-gradient leading-tight">
            One app for your family's groceries, calendar, tasks, and reminders
          </h1>
          <p className="text-base text-muted-foreground mt-4 max-w-sm leading-relaxed">
            Finally keep your whole family organized in one place. Shared lists, schedules, chores, and AI help — all working together.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button asChild size="lg" className="rounded-full px-8 bg-gradient-brand text-primary-foreground hover:opacity-90 transition-opacity glow">
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 border-border/80 hover:bg-muted">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-4 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Your data stays private and is never sold.
          </p>
        </div>

        {/* Screenshots */}
        <div className="mb-16 -mx-5">
          <div className="text-center mb-8 px-5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
              See the app
            </p>
            <h2 className="text-2xl font-display font-bold text-gradient">
              Built for the way families actually work
            </h2>
          </div>
          <Carousel opts={{ align: "center", loop: true }} className="w-full">
            <CarouselContent className="-ml-4">
              {screenshots.map(({ label, icon: Icon, color, image }, i) => (
                <CarouselItem
                  key={label}
                  className="pl-4 basis-[80%] sm:basis-[65%] md:basis-[50%] lg:basis-[38%]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="group relative aspect-[9/19.5] rounded-[2.25rem] overflow-hidden ring-1 ring-border/80 bg-muted/50 shadow-card">
                    {image ? (
                      <>
                        <img
                          src={image}
                          alt={`MIA ${label} screenshot`}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/95 via-background/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <p className="text-sm font-display font-semibold text-foreground">{label}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-60 group-hover:opacity-80 transition-opacity`} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center mb-3 shadow-sm">
                            <Icon className="w-7 h-7 text-primary" />
                          </div>
                          <p className="text-sm font-display font-semibold text-foreground/90">{label}</p>
                        </div>
                      </>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex items-center justify-center gap-4 mt-6 px-5">
              <CarouselPrevious className="static translate-y-0 left-0 top-0 h-11 w-11 rounded-full bg-gradient-brand text-primary-foreground border-0 hover:opacity-90 shadow-glow" />
              <CarouselNext className="static translate-y-0 right-0 top-0 h-11 w-11 rounded-full bg-gradient-brand text-primary-foreground border-0 hover:opacity-90 shadow-glow" />
            </div>
          </Carousel>
        </div>

        {/* Voice Assistant Highlight */}
        <div className="mt-16 mb-16">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
              Voice powered
            </p>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-gradient">
              Just say what your family needs
            </h2>
          </div>
          <div className="glass rounded-3xl p-6 md:p-8 border border-primary/20 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-56 h-56 bg-gradient-brand opacity-15 blur-3xl rounded-full" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5 ring-1 ring-primary/20">
                <Mic className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl md:text-2xl font-display font-bold mb-3">
                MIA listens, then gets it organized
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm mx-auto">
                Tap the mic while you cook, drive, or pack the kids up. Add groceries, create calendar events, set tasks, and ask what's happening today — without typing a thing.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {[
                  "Add items to the grocery list",
                  "Create calendar events by voice",
                  "Set reminders and assign tasks",
                  "Ask what's scheduled today",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-foreground/90">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
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

        {/* Final CTA */}
        <div className="mb-16 text-center">
          <div className="glass rounded-3xl p-8 border border-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-brand opacity-10" />
            <div className="relative z-10">
              <h2 className="text-2xl font-display font-bold text-gradient mb-3">
                Ready to get your family organized?
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Create your free account and invite your family in minutes.
              </p>
              <Button asChild size="lg" className="rounded-full px-8 bg-gradient-brand text-primary-foreground hover:opacity-90 transition-opacity glow">
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground/70 mt-4 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Your data is private and never sold.
              </p>
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
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/70">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-6">
            © 2026 Mia Family Assistant. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
