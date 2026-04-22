import { useState, useRef } from "react";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import maiLogo from "@/assets/mai-logo.png";

/**
 * Normalize a phone input to E.164. Defaults to US (+1) if no country code.
 */
function toE164(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s()\-.]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    if (!/^\d{8,15}$/.test(digits)) return null;
    return "+" + digits;
  }
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return null;
}

const AuthPage = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendCode = async () => {
    const formatted = toE164(phone);
    if (!formatted) {
      setError("Enter a valid phone number (e.g. +16465551234)");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
      });
      if (error) throw error;
      setE164(formatted);
      setStep("otp");
    } catch (err: any) {
      console.error("SMS send error:", err);
      setError(err.message || "Failed to send verification code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Enter the full 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: e164,
        token: code,
        type: "sms",
      });
      if (error) throw error;
      if (!data.user) throw new Error("Verification failed");

      // For new signups, ensure a household exists
      if (mode === "signup") {
        await ensureHousehold(data.user.id, e164);
      } else {
        // For sign-in, also create household if none exists yet
        await ensureHousehold(data.user.id, e164);
      }
      // AuthProvider listener handles routing
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ensureHousehold = async (userId: string, phoneE164: string) => {
    try {
      // Check if user already has a household membership
      const { data: existing } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", userId)
        .limit(1);

      if (existing && existing.length > 0) return;

      // Create new household; trigger auto-adds owner as member
      const { error } = await supabase.from("households").insert({
        owner_user_id: userId,
        primary_phone: phoneE164,
        name: "My Family",
      });
      if (error) console.error("Household create error:", error);
    } catch (err) {
      console.error("ensureHousehold error:", err);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setError("");

    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && otp.join("").length === 6) verifyCode();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center animate-fade-in">
        <img src={maiLogo} alt="Mai Assistant" className="w-16 h-16 rounded-2xl shadow-sm mx-auto mb-6" />
        <h1 className="text-2xl font-serif font-semibold mb-2">
          {step === "phone"
            ? mode === "signin"
              ? "Welcome Back"
              : "Create Your Account"
            : "Enter Verification Code"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {step === "phone"
            ? mode === "signin"
              ? "Sign in with your phone number."
              : "Enter your phone number to create a new account."
            : `We sent a 6-digit code to ${e164}`}
        </p>

        {step === "phone" ? (
          <div className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
                placeholder="+1 (646) 555-1234"
                className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              onClick={sendCode}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Send Code" : "Create Account"}
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
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg font-semibold bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ))}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              onClick={verifyCode}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Sign In"}
            </button>
            <button
              onClick={() => {
                setStep("phone");
                setOtp(["", "", "", "", "", ""]);
                setError("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Use a different number
            </button>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-8">
          By signing in, you agree to receive SMS messages for verification.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
