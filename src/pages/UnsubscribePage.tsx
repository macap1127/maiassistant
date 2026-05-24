import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | "validating"
  | "ready"
  | "already"
  | "invalid"
  | "submitting"
  | "done"
  | "error";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("validating");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } },
        );
        const data = await res.json();
        if (data.valid === true) setState("ready");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    const { data, error } = await supabase.functions.invoke(
      "handle-email-unsubscribe",
      { body: { token } },
    );
    if (error) {
      setErrorMsg(error.message);
      setState("error");
      return;
    }
    if (data?.success) setState("done");
    else if (data?.reason === "already_unsubscribed") setState("already");
    else setState("error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Email preferences</h1>

        {state === "validating" && (
          <p className="text-sm text-muted-foreground">Checking your link…</p>
        )}

        {state === "ready" && (
          <>
            <p className="text-sm text-muted-foreground mb-5">
              Unsubscribe from emails from Mia Family Assistant?
            </p>
            <button
              onClick={confirm}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90"
            >
              Confirm unsubscribe
            </button>
          </>
        )}

        {state === "submitting" && (
          <p className="text-sm text-muted-foreground">Updating…</p>
        )}

        {state === "done" && (
          <p className="text-sm text-foreground">
            You've been unsubscribed. We won't send you any more emails.
          </p>
        )}

        {state === "already" && (
          <p className="text-sm text-foreground">
            You've already unsubscribed — no further action needed.
          </p>
        )}

        {state === "invalid" && (
          <p className="text-sm text-destructive">
            This unsubscribe link is invalid or has expired.
          </p>
        )}

        {state === "error" && (
          <p className="text-sm text-destructive">
            Something went wrong{errorMsg ? `: ${errorMsg}` : ""}.
          </p>
        )}
      </div>
    </div>
  );
}
