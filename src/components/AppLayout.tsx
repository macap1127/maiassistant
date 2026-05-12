import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingCart, CheckSquare, CalendarDays, Users, LogOut, Menu, Settings, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import AuthPage from "@/pages/AuthPage";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import maiLogo from "@/assets/mai-logo.png";
import { VoiceAssistant } from "@/components/VoiceAssistant";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/grocery", icon: ShoppingCart, label: "Grocery" },
  { path: "/tasks", icon: CheckSquare, label: "Tasks" },
  { path: "/calendar", icon: CalendarDays, label: "Calendar" },
  { path: "/family", icon: Users, label: "Family" },
];

const menuItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/grocery", icon: ShoppingCart, label: "Grocery List" },
  { path: "/tasks", icon: CheckSquare, label: "Tasks" },
  { path: "/calendar", icon: CalendarDays, label: "Calendar" },
  { path: "/family", icon: Users, label: "Family" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/pricing", icon: CreditCard, label: "Pricing" },
];

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 pointer-events-none">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="pointer-events-auto flex items-center justify-center w-9 h-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="w-4.5 h-4.5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex items-center gap-3 p-5 border-b border-border">
              <img src={maiLogo} alt="Mai" className="w-10 h-10 rounded-xl" />
              <div>
                <p className="font-serif font-semibold text-sm">Mai</p>
                <p className="text-xs text-muted-foreground">Family Assistant</p>
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
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
              <button
                onClick={() => { logout(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4.5 h-4.5" />
                Sign out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Outlet />

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="max-w-lg mx-auto flex items-center justify-around h-[var(--nav-height)] px-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[11px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
