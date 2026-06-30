import { Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Home, ShoppingCart, CheckSquare, CalendarDays, Users, LogOut, Menu, Settings, CreditCard, Receipt, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import AuthPage from "@/pages/AuthPage";
import OnboardingPage from "@/pages/OnboardingPage";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import maiLogo from "@/assets/mai-logo.png";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { usePushNotifications } from "@/hooks/usePushNotifications";


const navItems = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/grocery", icon: ShoppingCart, label: "Grocery" },
  { path: "/tasks", icon: CheckSquare, label: "To Do" },
  { path: "/calendar", icon: CalendarDays, label: "Calendar" },
  { path: "/receipts", icon: Receipt, label: "Receipts" },
];

const menuItems = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/grocery", icon: ShoppingCart, label: "Grocery List" },
  { path: "/tasks", icon: CheckSquare, label: "To Do List" },
  { path: "/calendar", icon: CalendarDays, label: "Calendar" },
  { path: "/receipts", icon: Receipt, label: "Receipts" },
  { path: "/family", icon: Users, label: "Family" },
  { path: "/about", icon: Sparkles, label: "About MIA" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/pricing", icon: CreditCard, label: "Pricing" },
];

const titleFor = (path: string) => {
  const map: Record<string, string> = {
    "/dashboard": "Home",
    "/grocery": "Grocery",
    "/tasks": "To Do",
    "/calendar": "Calendar",
    "/receipts": "Receipts",
    "/family": "Family",
    "/about": "About",
    "/settings": "Settings",
    "/pricing": "Pricing",
  };
  return map[path] ?? "MIA";
};

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState<null | { householdId: string }>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  usePushNotifications(user?.id);

  useEffect(() => {
    if (!user) {
      setNeedsOnboarding(null);
      setCheckingOnboarding(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setCheckingOnboarding(true);
      const { data: mem } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (!mem?.household_id) {
        setNeedsOnboarding(null);
        setCheckingOnboarding(false);
        return;
      }
      const { count } = await supabase
        .from("family_members")
        .select("*", { count: "exact", head: true })
        .eq("household_id", mem.household_id);
      if (cancelled) return;
      setNeedsOnboarding((count ?? 0) === 0 ? { householdId: mem.household_id } : null);
      setCheckingOnboarding(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || (user && checkingOnboarding)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (needsOnboarding) {
    return (
      <OnboardingPage
        householdId={needsOnboarding.householdId}
        onDone={() => setNeedsOnboarding(null)}
      />
    );
  }

  const pageTitle = titleFor(location.pathname);


  return (
    <div className="min-h-screen bg-background">
      {/* Top header bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 glass-strong border-b border-border">
        <div className="max-w-lg mx-auto h-full flex items-center justify-between px-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center justify-center w-10 h-10 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted transition-all">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 glass-strong border-r border-border">
              <div className="flex items-center gap-3 p-5 border-b border-border">
                <div className="relative">
                  <img src={maiLogo} alt="Mia" className="w-11 h-11 rounded-xl relative z-10" />
                  <div className="absolute inset-0 rounded-xl blur-lg bg-gradient-brand opacity-60" />
                </div>
                <div>
                  <p className="font-display font-semibold text-base text-gradient">MIA</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Assistant</p>
                </div>
              </div>
              <nav className="p-3 space-y-1">
                {menuItems.map(({ path, icon: Icon, label }) => {
                  const active = location.pathname === path;
                  return (
                    <button
                      key={path}
                      onClick={() => { navigate(path); setOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" strokeWidth={active ? 2.5 : 1.8} />
                      {label}
                    </button>
                  );
                })}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border space-y-3">
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  Sign out
                </button>
                <p className="text-[10px] text-center text-muted-foreground/70 leading-relaxed">
                  © 2026 Mia Family Assistant.<br />All rights reserved.
                </p>
              </div>
            </SheetContent>
          </Sheet>

          {/* Centered page title */}
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-display font-semibold tracking-wide text-gradient pointer-events-none">
            {pageTitle}
          </h1>

          {/* Logo on the right */}
          <button onClick={() => navigate("/dashboard")} className="relative w-9 h-9 shrink-0">
            <img src={maiLogo} alt="MIA" className="w-9 h-9 rounded-lg relative z-10" />
            <div className="absolute inset-0 rounded-lg blur-md bg-gradient-brand opacity-50" />
          </button>
        </div>
      </header>

      <Outlet />
      <VoiceAssistant />

      <nav className="fixed bottom-3 left-3 right-3 z-50 glass-strong rounded-2xl ring-glow">
        <div className="max-w-lg mx-auto flex items-center justify-around h-[var(--nav-height)] px-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-brand shadow-[0_0_12px_hsl(var(--primary))]" />
                )}
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
