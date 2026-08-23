import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Status = "verifying" | "success" | "error";

/**
 * Browser landing page for email links (signup confirmation, magic link,
 * invite, email change). The link is built on our own domain so every URL in
 * the email matches the sending domain — this avoids the "link points at an
 * unrelated host" spam signal at Gmail/Yahoo/AOL.
 *
 * This path is deliberately NOT in the iOS associated-domains file, so it
 * always opens in the browser instead of being swallowed by the native app.
 */
const AuthConfirmPage = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string>("");

  const tokenHash = params.get("token_hash");
  const type = params.get("type") || "signup";

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!tokenHash) {
        if (!cancelled) {
          setStatus("error");
          setMessage("This link is missing its confirmation code. Please request a new email.");
        }
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        // Supabase accepts signup | magiclink | invite | email_change | recovery
        type: type as "signup" | "magiclink" | "invite" | "email_change" | "recovery",
      });

      if (cancelled) return;

      if (error) {
        setStatus("error");
        setMessage(
          error.message?.toLowerCase().includes("expired")
            ? "This link has expired. Please request a new confirmation email."
            : "This link is no longer valid. It may have already been used."
        );
        return;
      }

      setStatus("success");
      setMessage(
        type === "email_change"
          ? "Your new email address is confirmed."
          : "Your email is confirmed. You're all set."
      );
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [tokenHash, type]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-6">
        {status === "verifying" && (
          <>
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Confirming your email…</h1>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">Email confirmed</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">
              If you signed up on your phone, you can now open the Mia app and sign in.
            </p>
            <Button asChild className="w-full">
              <Link to="/dashboard">Continue to Mia</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-semibold text-foreground">Link not valid</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button asChild variant="secondary" className="w-full">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
};

export default AuthConfirmPage;
