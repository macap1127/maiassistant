import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SmsOptInPage = () => {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false); // MUST be unchecked by default
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\+?[0-9\s\-()]{7,20}$/.test(phone)) {
      setError("Enter a valid phone number with country code (e.g. +15551234567).");
      return;
    }
    if (!consent) {
      setError("You must check the consent box to opt in.");
      return;
    }
    setSubmitting(true);
    const { error: insErr } = await supabase.from("public_sms_optins").insert({
      phone: phone.trim(),
      consent: true,
      user_agent: navigator.userAgent,
    });
    setSubmitting(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setDone(true);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-xl mx-auto px-6 py-12">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-primary mb-3">
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider">Mia Family Assistant (Sole Proprietor) — SMS Sign-Up</span>
          </div>
          <h1 className="text-3xl font-bold">Mia Family Assistant SMS Reminders</h1>
          <p className="text-sm text-muted-foreground mt-3">
            Enter your mobile number and check the consent box below to opt in to recurring
            text messages from <strong>Mia Family Assistant (Sole Proprietor)</strong> with daily
            household calendar reminders.
          </p>
        </header>

        {done ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
            <h2 className="text-lg font-semibold">You're signed up!</h2>
            <p className="text-sm text-muted-foreground">
              We'll send a confirmation text shortly. Reply <strong>STOP</strong> at
              any time to cancel, or <strong>HELP</strong> for support.
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="bg-card border border-border rounded-2xl p-6 space-y-5"
          >
            <div className="space-y-4 text-sm">
              <div>
                <h2 className="font-semibold mb-1">What you'll receive</h2>
                <ul className="text-muted-foreground list-disc pl-5 space-y-1">
                  <li>
                    <strong>Account verification codes (one-time passcodes)</strong> —
                    sent only when you request a sign-in to your Mia Family
                    Assistant account.
                  </li>
                  <li>
                    Up to <strong>one (1) recurring SMS per day</strong> with your
                    household's scheduled events, including event titles, times,
                    and locations.
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold mb-1">Message frequency</h2>
                <p className="text-muted-foreground">
                  Recurring messages — up to 1 message per day. Message frequency may vary
                  based on your reminder settings and whether you have events scheduled.
                </p>
              </div>
              <div>
                <h2 className="font-semibold mb-1">Standard disclaimers</h2>
                <p className="text-muted-foreground">
                  Message and data rates may apply. Carriers are not liable for
                  delayed or undelivered messages.
                </p>
              </div>
              <div>
                <h2 className="font-semibold mb-1">HELP & STOP</h2>
                <p className="text-muted-foreground">
                  Reply <strong>HELP</strong> for support, or email{" "}
                  <a className="underline" href="mailto:support@miafamilyassistant.com">
                    support@miafamilyassistant.com
                  </a>
                  . Reply <strong>STOP</strong> at any time to cancel future
                  messages.
                </p>
              </div>
            </div>

            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Mobile phone number
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                required
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm mt-1.5"
              />
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-primary shrink-0"
                required
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                By checking this box and submitting this form, I consent to receive recurring
                automated SMS text messages from <strong> Mia Family Assistant (Sole Proprietor)</strong>
                at the mobile number provided for (1) account verification one-time passcodes sent
                when I request sign-in, and (2) opt-in once-daily household calendar event reminders.
                Consent is not a condition of purchase. Message frequency varies, up to one
                message per day. Message and data rates may apply. Reply STOP to cancel and HELP
                for help. I have read and agree to the{" "}
                <Link to="/terms" className="text-primary underline">
                  Mia Family Assistant Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Agree and sign up for SMS reminders
            </button>

            <p className="text-[11px] text-muted-foreground text-center">
              By submitting, you confirm the number entered is yours and that
              you authorize Mia Family Assistant (Sole Proprietor) to send SMS to it.
            </p>
          </form>
        )}

        <div className="flex items-center justify-center gap-3 mt-6 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-foreground">Terms &amp; Conditions</Link>
        </div>
      </div>
    </main>
  );
};

export default SmsOptInPage;
