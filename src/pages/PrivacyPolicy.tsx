const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: May 24, 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p>
            <strong>Mia Family Assistant (Sole Proprietor)</strong> ("Mia Family Assistant", "we", "us", "our") is the
            operating entity and data controller for this service. We provide a household management
            application that helps families coordinate groceries, tasks, and
            calendar events. This Privacy Policy explains how Mia Family Assistant (Sole Proprietor) collects, uses,
            and protects your information when you use our service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Phone number:</strong> Collected only if you choose to save one for household member details.
            </li>
            <li>
              <strong>Household data:</strong> Grocery items, tasks, calendar
              events, and household member information you create in the app.
            </li>
            <li>
              <strong>Usage data:</strong> Basic technical information such as
              device type and timestamps for security and reliability.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. How We Use Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Authenticate you and keep your account secure.</li>
            <li>Send push notification reminders and household activity alerts only when you opt in.</li>
            <li>Provide and improve the household management features.</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Push Notifications & Consent</h2>
          <p>
            Mia Family Assistant (Sole Proprietor) uses push notifications for one-way, opt-in reminders and household alerts. Members cannot use the Service to send SMS messages to each other:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Daily event reminders:</strong> If you turn on push notifications in Settings, you consent to receive automated notifications with your household's calendar events, upcoming event reminders, and family activity alerts. This is strictly opt-in — the setting is off by default, and you can disable it at any time from Settings or your device notification settings.
            </li>
          </ul>
          <p>
            <strong>Notification frequency:</strong> Notification frequency may vary based on reminder settings, scheduled events, and household activity.
          </p>
          <p>
            <strong>Data rates may apply.</strong> Delivery may depend on device, network, and operating system settings.
          </p>
          <p>
            <strong>Notification information sharing:</strong> Notification tokens and preferences are not shared with third parties or affiliates for marketing purposes. Information sharing to subcontractors in support of the services we provide is permitted only as required to operate the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Sharing of Information</h2>
          <p>
            We do not sell your personal information. We share data only with
            service providers required to operate the app (such as notification delivery,
            payment processing, and cloud infrastructure) and only as
            needed to deliver the service. As stated above, notification data is not shared, sold, or transferred to third parties or affiliates for marketing purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Data Retention</h2>
          <p>
            We retain your account and household data for as long as your
            account is active. You may request deletion of your data at any
            time by contacting us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Security</h2>
          <p>
            We use industry-standard safeguards to protect your data, including
            encryption in transit and access controls. No method of transmission
            over the internet is 100% secure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Your Rights</h2>
          <p>
            You may access, correct, or delete your information at any time
            from within the app or by contacting us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Updates will be
            posted on this page with a revised "Last updated" date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Contact</h2>
          <p>
            Questions about this Privacy Policy? Contact us at{" "}
            <a className="underline" href="mailto:support@miafamilyassistant.com">
              support@miafamilyassistant.com
            </a>
            .
          </p>
        </section>

        <div className="pt-6 border-t border-border text-sm text-muted-foreground">
          <a href="/terms" className="underline hover:text-foreground">
            Terms & Conditions
          </a>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
