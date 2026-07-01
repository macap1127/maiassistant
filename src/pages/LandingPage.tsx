import { Navigate, Link } from "react-router-dom";
import {
  Sparkles,
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
  Heart,
  Home,
  ShoppingCart,
  Calendar,
  ListTodo,
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


const steps = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Join Our Beta Community",
    subtitle: "Hosted through Google Groups",
    body: "Share feedback, report bugs, and get early access to new features before anyone else.",
    cta: "Join Community",
    href: "https://groups.google.com/g/mia-family-assistant-testers",
    time: "30 seconds",
  },
  {
    number: "02",
    icon: Smartphone,
    title: "Opt into the Beta",
    body: "Become an official beta tester on Google Play. Your opt-in lets us deliver beta builds directly to your device.",
    cta: "Opt into Beta",
    href: "https://play.google.com/apps/testing/com.aiblueribbon.mia",
    time: "15 seconds",
  },
  {
    number: "03",
    icon: Play,
    title: "Install from the Play Store",
    body: "Once you're opted in, install Mia Family Assistant from the Play Store and start simplifying your family life today.",
    cta: "Install Now",
    href: "https://play.google.com/store/apps/details?id=com.aiblueribbon.mia",
    time: "1 minute",
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
  "6 months free after launch",
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
  { label: "Home", icon: Home, image: "/screenshots/dashboard.png", color: "from-cyan-500/20 to-blue-500/20" },
  { label: "Meet MIA", icon: Sparkles, image: "/screenshots/about.png", color: "from-violet-500/20 to-fuchsia-500/20" },
  { label: "Grocery List", icon: ShoppingCart, image: "/screenshots/grocery.png", color: "from-emerald-500/20 to-teal-500/20" },
  { label: "Calendar", icon: Calendar, image: "/screenshots/calendar.png", color: "from-amber-500/20 to-orange-500/20" },
];

const whatYoullTest = [
  { label: "Grocery Lists", icon: ShoppingCart },
  { label: "Shared Tasks", icon: ListTodo },
  { label: "AI Voice Assistant", icon: Mic },
  { label: "Calendar", icon: Calendar },
  { label: "Family Reminders", icon: Bell },
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            <span className="text-xs font-medium text-primary">Early testers get 6 months of Premium free</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-3">
            Limited Founding Family Beta
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-gradient leading-tight">
            One app for your family's groceries, calendar, tasks, and reminders
          </h1>
          <p className="text-base text-muted-foreground mt-4 max-w-sm leading-relaxed">
            Finally keep your whole family organized in one place. Shared lists, schedules, chores, and AI help — all working together.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button asChild size="lg" className="rounded-full px-8 bg-gradient-brand text-primary-foreground hover:opacity-90 transition-opacity glow">
              <a href="#join">
                Join the Beta Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
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
          <div className="text-center mb-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
              From the founder
            </p>
            <h2 className="text-2xl font-display font-bold text-gradient">
              Built for families, by a parent who needed it.
            </h2>
          </div>
          <div className="glass rounded-2xl p-6 border border-border/80">
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Hi. I'm the founder of MIA. Like a lot of parents, I was juggling grocery apps, shared calendars, reminder lists, sticky notes, and group texts — and my family still felt out of sync. So I built one place where everything lives together: groceries, schedules, tasks, reminders, and an AI assistant that actually helps.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              MIA is already working. Now I'm looking for a small group of families to test it in the real world, share feedback, and help shape it before we launch publicly. If that sounds like you, I'd love to have you in the beta.
            </p>
          </div>
        </div>

        {/* Why beta */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border/60 mb-4">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Why we're in beta</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            MIA is fully functional — we're simply testing it with real families before public launch. Your feedback helps us get it right.
          </p>
        </div>

        {/* Screenshots */}
        <div className="mb-16 -mx-5">
          <div className="text-center mb-8 px-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
              See the app
            </p>
            <h2 className="text-2xl font-display font-bold text-gradient">
              Built for the way families actually work
            </h2>
          </div>
          <Carousel
            opts={{
              align: "center",
              loop: true,
            }}
            className="w-full"
          >
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
          <p className="text-[10px] text-center text-muted-foreground/60 mt-3 px-5">
            Swipe or use arrows to browse real screenshots from MIA Family Assistant.
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

        {/* What you'll help us test */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-2">
              What you'll help us test
            </p>
            <h2 className="text-2xl font-display font-bold text-gradient">
              Real features. Real feedback.
            </h2>
          </div>
          <div className="glass rounded-2xl p-5 border border-border/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {whatYoullTest.map(({ label, icon: Icon }, i) => (
                <div
                  key={label}
                  className="flex items-center gap-3 text-sm animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <Icon className="w-4 h-4 text-primary/70" />
                  <span className="text-foreground/90">{label}</span>
                </div>
              ))}
            </div>
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
            {steps.map(({ number, icon: Icon, title, subtitle, body, cta, href, time }, i) => (
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
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-display font-semibold">{title}</h3>
                      <span className="text-[10px] font-mono-tech text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {time}
                      </span>
                    </div>
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
                Ready to start testing MIA?
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Join the beta free today and get 6 months of Premium after launch. Spots are limited.
              </p>
              <Button asChild size="lg" className="rounded-full px-8 bg-gradient-brand text-primary-foreground hover:opacity-90 transition-opacity glow">
                <a href="#join">
                  Join the Beta Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <p className="text-xs text-muted-foreground/70 mt-4 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Your data is private. You can leave the beta at any time.
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
