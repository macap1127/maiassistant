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
    // Set listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      // Auto-create a household for first-time sign-ins (covers Google OAuth
      // users who never go through the email signup form). Defer to avoid
      // deadlocks inside the auth callback.
      if (event === "SIGNED_IN" && s?.user) {
        const u = s.user;
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
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
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
