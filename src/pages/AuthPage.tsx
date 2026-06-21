import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { AppleSignIn, SignInScope } from "@capawesome/capacitor-apple-sign-in";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import maiLogo from "@/assets/mai-logo.png";

const platform = Capacitor.getPlatform();
const isWeb = platform === "web";
const isIOS = platform === "ios";
const isAndroid = platform === "android";


const AuthPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Redirect away from /auth once authenticated (unless mid-signup or handling invite)
  if (!authLoading && user && !signupSuccess && !inviteCode) {
    return <Navigate to="/" replace />;
  }


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
        // If no session was returned, the user needs to verify their email first
        if (!data.session) {
          setSignupSuccess(true);
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

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <img src={maiLogo} alt="Mia Family Assistant" className="w-28 h-28 rounded-2xl shadow-sm mx-auto mb-6" />
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-serif font-semibold mb-3">Check your email</h1>
          <p className="text-sm text-muted-foreground mb-2">
            We sent a verification link to
          </p>
          <p className="text-sm font-medium mb-6 break-all">{email}</p>
          <p className="text-xs text-muted-foreground mb-8">
            Click the link in the email to verify your account, then come back here to sign in. Don't see it? Check your spam folder.
          </p>
          <button
            onClick={() => { setSignupSuccess(false); setMode("signin"); setPassword(""); }}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center animate-fade-in">
        <img src={maiLogo} alt="Mia Family Assistant" className="w-28 h-28 rounded-2xl shadow-sm mx-auto mb-6" />
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

          <>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {isWeb && (
            <button
              type="button"
              onClick={async () => {
                setError("");
                setLoading(true);
                try {
                  const redirect = inviteCode
                    ? `${window.location.origin}/invite/${inviteCode}`
                    : `${window.location.origin}/`;
                  const result = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: redirect,
                  });
                  if (result.error) throw new Error(result.error.message || "Google sign-in failed");
                  if (result.redirected) return;
                } catch (err: any) {
                  console.error("Google auth error:", err);
                  setError(err.message || "Google sign-in failed. Try again.");
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full bg-card border border-border rounded-xl py-3 text-sm font-medium hover:bg-secondary/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            )}

            {(isWeb || isIOS) && (
            <button
              type="button"
              onClick={async () => {
                setError("");
                setLoading(true);
                try {
                  if (isIOS) {
                    // Native Sign in with Apple — uses the system sheet, required for App Store
                    const result = await AppleSignIn.signIn({
                      scopes: [SignInScope.Email, SignInScope.FullName],
                    });
                    const idToken = result.idToken;
                    if (!idToken) throw new Error("No identity token returned from Apple");
                    const { error } = await supabase.auth.signInWithIdToken({
                      provider: "apple",
                      token: idToken,
                    });
                    if (error) throw error;
                    if (inviteCode) {
                      window.location.href = `/invite/${inviteCode}`;
                      return;
                    }
                  } else {
                    // Web — managed Lovable OAuth flow
                    const redirect = inviteCode
                      ? `${window.location.origin}/invite/${inviteCode}`
                      : `${window.location.origin}/`;
                    const result = await lovable.auth.signInWithOAuth("apple", {
                      redirect_uri: redirect,
                    });
                    if (result.error) throw new Error(result.error.message || "Apple sign-in failed");
                    if (result.redirected) return;
                  }
                } catch (err: any) {
                  console.error("Apple auth error:", err);
                  setError(err.message || "Apple sign-in failed. Try again.");
                  setLoading(false);
                }
              }}

              disabled={loading}
              className="w-full bg-foreground text-background rounded-xl py-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>
            )}
          </>


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

        <div className="flex items-center justify-center gap-3 mt-4 text-xs text-muted-foreground flex-wrap">
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span>&middot;</span>
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Terms & Conditions
          </Link>
          <span>&middot;</span>
          <Link to="/sms-opt-in" className="hover:text-foreground transition-colors">
            SMS Reminders Sign-Up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
