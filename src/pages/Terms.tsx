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
            To use the Service, you must create an account with a valid email
            address or sign in via Google OAuth. You are responsible for
            maintaining the security of your account credentials, and for all
            activity that occurs under your account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Notification Terms</h2>
          <p>
            <strong>Program name:</strong> Mia Family Assistant Alerts (operated by Mia Family Assistant, Sole Proprietor).
          </p>
          <p>
            <strong>Program description:</strong> If you enable push notifications in the app, you consent to receive automated app notifications from us:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Daily event reminders:</strong> When you enable push notifications in Settings, you may receive a daily calendar digest, event reminders, and family activity alerts. This feature is off by default and may be turned off at any time in Settings or your device notification settings.
            </li>
          </ul>
          <p>
            <strong>Message frequency:</strong> Notification frequency may vary based on reminder settings, scheduled events, and household activity.
          </p>
          <p>
            <strong>One-way only:</strong> Notifications from Mia Family Assistant (Sole Proprietor) are automated reminders and alerts sent from the service to the opted-in user. Members cannot use the Service to send SMS messages to each other.
          </p>
          <p>
            <strong>Data rates may apply.</strong> Check your mobile plan for details. Delivery may depend on device, network, and operating system settings.
          </p>
          <p>
            <strong>Help:</strong> Email{" "}
            <a className="underline" href="mailto:support@miafamilyassistant.com">
              support@miafamilyassistant.com
            </a>
            .
          </p>
          <p>
            <strong>Cancellation:</strong> Turn off push notifications in Settings or in your device notification settings at any time.
          </p>
          <p>
            <strong>Privacy:</strong> Notification preferences are used only to operate reminders and alerts. See our{" "}
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

        <div className="pt-6 border-t border-border text-sm text-muted-foreground">
          <a href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </a>
        </div>
      </div>
    </main>
  );
};

export default Terms;
