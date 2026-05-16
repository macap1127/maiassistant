import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import maiLogo from "@/assets/mai-logo.png";

const AuthPage = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite");
    if (code) {
      setInviteCode(code.toUpperCase());
      setMode("signup");
    }
  }, []);

  const submit = async () => {
    if (!email || password.length < 6) {
      setError("Enter a valid email and password (min 6 chars)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: inviteCode ? `${window.location.origin}/invite/${inviteCode}` : `${window.location.origin}/` },
        });
        if (error) throw error;
        if (data.user && !inviteCode) await ensureHousehold(data.user.id);
        if (data.user && inviteCode) {
          window.location.href = `/invite/${inviteCode}`;
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (inviteCode) {
          window.location.href = `/invite/${inviteCode}`;
          return;
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const ensureHousehold = async (userId: string) => {
    try {
      const { data: existing } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", userId)
        .limit(1);
      if (existing && existing.length > 0) return;
      const { error } = await supabase.from("households").insert({
        owner_user_id: userId,
        primary_phone: email,
        name: "My Family",
      });
      if (error) console.error("Household create error:", error);
    } catch (err) {
      console.error("ensureHousehold error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center animate-fade-in">
        <img src={maiLogo} alt="Mia Assistant" className="w-28 h-28 rounded-2xl shadow-sm mx-auto mb-6" />
        <h1 className="text-2xl font-serif font-semibold mb-2">
          {mode === "signin" ? "Welcome Back" : "Create Your Account"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {mode === "signin"
            ? "Sign in with your email and password."
            : "Enter your email and a password to create an account."}
        </p>

        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="you@example.com"
              className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Password"
              className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {mode === "signin" ? "Sign In" : "Create Account"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => { setMode("signup"); setError(""); }}
                  className="text-primary font-medium hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("signin"); setError(""); }}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          Temporary email login while SMS verification is pending approval.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
