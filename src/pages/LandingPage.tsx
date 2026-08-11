import { Navigate, Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { CalendarDays, CheckSquare, ShoppingCart, Mic, Shield, ArrowRight, Globe } from "lucide-react";
import maiLogo from "@/assets/mai-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const APP_STORE_URL = "https://apps.apple.com/us/app/mia-family-assistant/id6776078875";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.aiblueribbon.mia";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Shared family calendar",
    body: "Everyone's schedule in one view — school, work, practice, appointments.",
  },
  {
    icon: CheckSquare,
    title: "To-dos & reminders",
    body: "Never forget school pickup again. Assign tasks and get nudged on time.",
  },
  {
    icon: ShoppingCart,
    title: "Grocery lists",
    body: "Synced across the household, so whoever's at the store has the list.",
  },
  {
    icon: Mic,
    title: "AI voice assistant",
    body: "Add or check anything hands-free while you're driving or cooking.",
  },
];

const AppleIcon = () => (
  <svg viewBox="0 0 384 512" aria-hidden="true" className="w-6 h-6 fill-current">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 512 512" aria-hidden="true" className="w-6 h-6">
    <path fill="#00d3ff" d="M47 24 300 256 47 488c-9-5-15-15-15-28V52c0-13 6-23 15-28z" />
    <path fill="#00f076" d="M47 24c5-3 12-3 19 1l246 141-64 64L47 24z" />
    <path fill="#ffce00" d="M312 166l68 39c22 13 22 39 0 52l-68 39-64-65 64-65z" />
    <path fill="#ff3a44" d="M66 487c-7 4-14 4-19 1l201-201 64 64L66 487z" />
  </svg>
);

const StoreBadge = ({
  href,
  top,
  bottom,
  icon,
}: {
  href: string;
  top: string;
  bottom: string;
  icon: React.ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3 rounded-xl border border-border/80 bg-secondary/60 px-5 py-3 hover:bg-secondary transition-colors min-w-[10.5rem]"
  >
    {icon}
    <span className="text-left leading-tight">
      <span className="block text-[0.625rem] uppercase tracking-wide text-muted-foreground">{top}</span>
      <span className="block text-sm font-display font-semibold text-foreground">{bottom}</span>
    </span>
  </a>
);

const LandingPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  // Native apps skip marketing entirely.
  if (Capacitor.isNativePlatform()) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[36rem] bg-gradient-aurora pointer-events-none" />

      <main className="relative z-10 max-w-3xl mx-auto px-5">
        {/* Hero */}
        <section className="flex flex-col items-center text-center pt-14 pb-16 md:pt-20">
          <div className="relative mb-6">
            <img src={maiLogo} alt="Mia Family Assistant app icon" className="w-24 h-24 rounded-3xl relative z-10" />
            <div className="absolute inset-0 rounded-3xl blur-2xl bg-gradient-brand opacity-70 scale-110" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-3">
            Mia Family Assistant
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-gradient leading-tight">
            The all-in-one AI family organizer
          </h1>
          <p className="text-base text-muted-foreground mt-4 max-w-md leading-relaxed">
            Calendar, to-dos, reminders, grocery lists, and AI voice — everything your family needs, in one place.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
            <StoreBadge href={APP_STORE_URL} top="Download on the" bottom="App Store" icon={<AppleIcon />} />
            <StoreBadge href={PLAY_STORE_URL} top="Get it on" bottom="Google Play" icon={<PlayIcon />} />
            <Button
              asChild
              size="lg"
              className="h-[3.75rem] rounded-xl px-6 bg-gradient-brand text-primary-foreground hover:opacity-90 glow"
            >
              <Link to="/auth">
                <Globe className="w-5 h-5 mr-2" />
                Try it on Web
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground/70 mt-5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Private by default. Your family data is never sold.
          </p>
        </section>

        {/* Features */}
        <section className="pb-16">
          <h2 className="text-2xl font-display font-bold text-gradient text-center mb-8">
            Everything your household runs on
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl p-5 border border-border/80 glass">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-display font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section className="pb-16">
          <div className="glass rounded-3xl border border-primary/20 p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-brand opacity-10" />
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono-tech mb-3">
                Now available
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {["iOS", "Android", "Web"].map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-border/80 bg-secondary/60 px-4 py-1.5 text-sm font-display font-semibold"
                  >
                    Live on {p}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Built for busy families. 7-day trial on every plan.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/60 py-8 text-center">
          <p className="text-xs text-muted-foreground mb-4">
            Questions?{" "}
            <a href="mailto:support@miafamilyassistant.com" className="text-primary hover:underline">
              support@miafamilyassistant.com
            </a>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground/70">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms &amp; Conditions
            </Link>
            <a href="mailto:support@miafamilyassistant.com" className="hover:text-foreground transition-colors">
              Support
            </a>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-6">
            © {new Date().getFullYear()} Mia Family Assistant
          </p>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
