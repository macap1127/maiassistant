import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, ArrowRight, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import maiLogo from "@/assets/mai-logo.png";
import { useTranslation } from "react-i18next";

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setVerifying(false);
      }
    });

    (async () => {
      // Supabase recovery links can land with token_hash in the query string
      // (our custom direct link) or with a session already in place.
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
      const type = searchParams.get("type") || hashParams.get("type");

      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "recovery",
        });
        if (!mounted) return;
        if (verifyError) {
          setError(verifyError.message || t("resetPassword.couldNotUpdate"));
          setVerifying(false);
        } else {
          setReady(true);
          setVerifying(false);
          window.history.replaceState({}, "", "/reset-password");
        }
        return;
      }

      // No token in URL: if we already have a session, allow password update.
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        setReady(true);
      } else {
        setError(t("resetPassword.invalidLink"));
      }
      setVerifying(false);
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [t]);

  const submit = async () => {
    if (password.length < 6) {
      setError(t("resetPassword.minLengthError"));
      return;
    }
    if (password !== confirm) {
      setError(t("resetPassword.passwordsDontMatch"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Ensure we have a live session before updating; if the user submitted
      // before the recovery event fired, wait briefly for it.
      let attempts = 0;
      while (!ready && attempts < 5) {
        await new Promise((r) => setTimeout(r, 300));
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
          break;
        }
        attempts++;
      }
      if (!ready) {
        throw new Error(t("resetPassword.invalidLink"));
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/", { replace: true }), 1500);
    } catch (err: any) {
      setError(err.message || t("resetPassword.couldNotUpdate"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-start sm:items-center justify-center overflow-y-auto px-6 py-8" style={{ paddingTop: "max(2rem, env(safe-area-inset-top))", paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
      <div className="w-full max-w-sm text-center animate-fade-in">
        <img src={maiLogo} alt="Mia Family Assistant" className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl shadow-sm mx-auto mb-4 sm:mb-6" />
        <h1 className="text-2xl font-serif font-semibold mb-2">{t("resetPassword.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {verifying
            ? t("resetPassword.verifyingLink")
            : t("resetPassword.enterNewPassword")}
        </p>

        {success ? (
          <p className="text-sm text-primary">{t("resetPassword.updatedRedirecting")}</p>
        ) : (
          <div className="space-y-4 relative">
            {verifying && (
              <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/80 pt-12 rounded-xl">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            <div className="relative text-left">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder={t("resetPassword.newPasswordPlaceholder")}
                autoComplete="new-password"
                className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative text-left">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={t("resetPassword.confirmPasswordPlaceholder")}
                autoComplete="new-password"
                className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              onClick={submit}
              disabled={loading || !ready}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t("resetPassword.updatePassword")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            {!ready && !verifying && (
              <button
                onClick={() => navigate("/auth")}
                className="w-full border border-border text-foreground rounded-xl py-3 text-base font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {t("resetPassword.requestNewLink")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
