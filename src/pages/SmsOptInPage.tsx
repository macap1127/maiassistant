import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const SmsOptInPage = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-2xl mx-auto px-5 py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <article className="prose-invert space-y-6">
        <h1 className="text-3xl font-display font-bold text-gradient">
          Mia Family Assistant SMS Reminders — Opt-In
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Program operated by <strong className="text-foreground">Mia Family Assistant (Sole Proprietor)</strong>.
          Enter your mobile phone number and check the consent box in the app to opt in to recurring automated
          SMS text messages from Mia Family Assistant (Sole Proprietor).
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-display font-semibold">What you will receive</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
            <li>
              <strong className="text-foreground">Account verification one-time passcodes (OTPs)</strong> — sent only
              when you request a sign-in to your Mia Family Assistant account.
            </li>
            <li>
              <strong className="text-foreground">Opt-in once-daily automated household calendar reminders</strong> —
              up to one (1) recurring SMS per day summarizing your household's scheduled events (event titles, times,
              and locations).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-display font-semibold">Message frequency</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Recurring messages, up to 1 reminder message per day, plus account verification codes only when you
            request sign-in.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-display font-semibold">Standard disclaimers</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Msg &amp; data rates may apply. Carriers are not liable for delayed or undelivered messages. Consent is
            not a condition of purchase.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-display font-semibold">HELP and STOP instructions</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Reply <strong className="text-foreground">HELP</strong> for support, or email{" "}
            <a href="mailto:support@miafamilyassistant.com" className="text-primary hover:underline">
              support@miafamilyassistant.com
            </a>
            . Reply <strong className="text-foreground">STOP</strong> at any time to cancel future messages.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-display font-semibold">Consent language</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By checking the consent box and submitting the form, I consent to receive recurring automated SMS text
            messages from Mia Family Assistant (Sole Proprietor) at the mobile number provided for (1) account
            verification one-time passcodes sent when I request sign-in, and (2) opt-in once-daily household calendar
            event reminders. Consent is not a condition of purchase. Message frequency varies, up to one message per
            day. Message and data rates may apply. Reply STOP to cancel and HELP for help.
          </p>
        </section>

        <p className="text-sm text-muted-foreground leading-relaxed">
          See our{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="text-primary hover:underline">
            Terms &amp; Conditions
          </Link>
          . Phone numbers and SMS consent are never shared with third parties for marketing.
        </p>
      </article>
    </div>
  </div>
);

export default SmsOptInPage;
