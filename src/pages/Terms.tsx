const Terms = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Terms and Conditions</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: May 24, 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p>
            <strong>Mia Family Assistant (Sole Proprietor)</strong> ("Mia Family Assistant", "we", "us", "our") is the
            provider and operator of this service ("the Service"). By accessing or using the Service, you agree to be
            bound by these Terms and Conditions. If you do not agree, do not
            use the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. The Service</h2>
          <p>
            Mia Family Assistant is a household management application that lets users
            share groceries, tasks, and calendar events with members of their
            household.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Accounts and Authentication</h2>
          <p>
            To use the Service, you must provide a valid mobile phone number
            and verify it via SMS one-time passcode. You are responsible for
            maintaining the security of your phone and account, and for all
            activity that occurs under your account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. SMS Program Terms</h2>
          <p>
            <strong>Program name:</strong> Mia Family Assistant Alerts (operated by Mia Family Assistant, Sole Proprietor).
          </p>
          <p>
            <strong>Program description:</strong> By providing your mobile phone
            number to Mia Family Assistant (Sole Proprietor), you consent to receive SMS messages
            from us in two categories:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account verification:</strong> One-time passcodes sent
              only when you request to sign in.
            </li>
            <li>
              <strong>Daily event reminders (opt-in):</strong> When you enable
              "Daily event SMS reminders" in Settings, you will receive{" "}
              <strong>one SMS per day</strong> at your chosen time summarizing
              your household's calendar events. This feature is off by default
              and may be turned off at any time in Settings or by replying STOP.
            </li>
          </ul>
          <p>
            <strong>Message frequency:</strong> Verification messages are sent
            only on sign-in request. Daily reminders are sent at most once per
            day per opted-in user.
          </p>
          <p>
            <strong>Message and data rates may apply.</strong> Check your mobile
            plan for details. Carriers (including but not limited to AT&T,
            T-Mobile, Verizon) are not liable for delayed or undelivered
            messages.
          </p>
          <p>
            <strong>Help:</strong> Reply <strong>HELP</strong> to any message
            for assistance, or email{" "}
            <a className="underline" href="mailto:support@miafamilyassistant.com">
              support@miafamilyassistant.com
            </a>
            .
          </p>
          <p>
            <strong>Cancellation:</strong> Reply <strong>STOP</strong> to any
            message at any time to opt out of SMS messages. You will receive a
            one-time confirmation that you have been unsubscribed; no further
            messages will be sent.
          </p>
          <p>
            <strong>Privacy:</strong> Your mobile phone number and SMS opt-in
            consent are never shared, sold, or transferred to third parties or
            affiliates for marketing purposes. See our{" "}
            <a className="underline" href="/privacy">Privacy Policy</a> for
            details.
          </p>
          <p>
            We do not send marketing or promotional messages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the Service for any unlawful purpose.</li>
            <li>Attempt to gain unauthorized access to other accounts or data.</li>
            <li>Interfere with or disrupt the Service or its infrastructure.</li>
            <li>Upload content that is illegal, harmful, or infringing.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. User Content</h2>
          <p>
            You retain ownership of any content you create in the Service
            (groceries, tasks, events, etc.). You grant us a limited license to
            store and process this content solely to operate the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service at any time
            if you violate these Terms. You may stop using the Service and
            request deletion of your data at any time.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Disclaimers</h2>
          <p>
            The Service is provided "as is" without warranties of any kind. We
            do not guarantee that the Service will be uninterrupted, error-free,
            or that any data will not be lost.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Mia Family Assistant shall not be
            liable for any indirect, incidental, special, or consequential
            damages arising out of or in connection with your use of the
            Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the
            Service after changes are posted constitutes acceptance of the
            updated Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Contact</h2>
          <p>
            Questions about these Terms? Contact us at{" "}
            <a className="underline" href="mailto:support@miafamilyassistant.com">
              support@miafamilyassistant.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
};

export default Terms;
