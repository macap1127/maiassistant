import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Track the last applied identity so token refreshes (which fire every time
    // the native app returns to the foreground, e.g. after the photo picker)
    // don't hand down a brand-new `user` object and remount the whole tree.
    let lastUserId: string | null = null;

    const applySession = (s: Session | null) => {
      setSession(s);
      const nextId = s?.user?.id ?? null;
      if (nextId !== lastUserId) {
        lastUserId = nextId;
        setUser(s?.user ?? null);
      }
    };

    // Set listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      applySession(s);
      setLoading(false);

      // Auto-create a household for first-time sign-ins (covers Google OAuth
      // users who never go through the email signup form). Defer to avoid
      // deadlocks inside the auth callback.
      if (event === "SIGNED_IN" && s?.user) {
        const u = s.user;
        // Identify the user to RevenueCat on native so webhook events map back.
        setTimeout(() => {
          import("@/lib/revenuecat")
            .then((m) => m.initRevenueCat(u.id))
            .catch((e) => console.warn("[revenuecat] init failed", e));
        }, 0);
        setTimeout(async () => {
          const { data: existing } = await supabase
            .from("household_members")
            .select("household_id")
            .eq("user_id", u.id)
            .limit(1);
          if (existing && existing.length > 0) return;
          await supabase.from("households").insert({
            owner_user_id: u.id,
            primary_phone: u.email ?? "",
            name: "My Family",
          });
        }, 0);
      }
      if (event === "SIGNED_OUT") {
        import("@/lib/revenuecat")
          .then((m) => m.logoutRevenueCat())
          .catch(() => {});
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      applySession(s);
      setLoading(false);
    });


    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
