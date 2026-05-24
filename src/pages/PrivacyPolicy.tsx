const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: May 8, 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p>
            Mia Family Assistant ("we", "us", "our") provides a household management
            application that helps families coordinate groceries, tasks, and
            calendar events. This Privacy Policy explains how we collect, use,
            and protect your information when you use our service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Phone number:</strong> Used to authenticate your account
              via SMS one-time passcodes.
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
            <li>Send one-time SMS verification codes when you sign in.</li>
            <li>Provide and improve the household management features.</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. SMS Messaging</h2>
          <p>
            By entering your phone number and requesting a code, you consent to
            receive a one-time SMS verification code at that number. Message and
            data rates may apply. Reply <strong>STOP</strong> to opt out at any
            time, or <strong>HELP</strong> for assistance. We do not send
            marketing messages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Sharing of Information</h2>
          <p>
            We do not sell your personal information. We share data only with
            service providers required to operate the app (such as our SMS
            provider and cloud infrastructure) and only as needed to deliver the
            service.
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
            <a className="underline" href="mailto:support@miafamilyasistant.com">
              support@miafamilyasistant.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
