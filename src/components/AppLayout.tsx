import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingCart, CheckSquare, CalendarDays, Users } from "lucide-react";
import { getSavedPhone } from "@/lib/store";
import ConnectPhone from "@/pages/ConnectPhone";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/grocery", icon: ShoppingCart, label: "Grocery" },
  { path: "/tasks", icon: CheckSquare, label: "Tasks" },
  { path: "/calendar", icon: CalendarDays, label: "Calendar" },
  { path: "/family", icon: Users, label: "Family" },
];

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(!!getSavedPhone());

  if (!connected) {
    return <ConnectPhone onConnected={() => setConnected(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
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
