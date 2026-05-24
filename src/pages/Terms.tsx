const Terms = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Terms and Conditions</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: May 8, 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Mia Family Assistant ("the Service"), you agree to be
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
          <h2 className="text-xl font-semibold">4. SMS Communications</h2>
          <p>
            By providing your phone number and requesting a code, you consent
            to receive a one-time verification SMS at that number. Message and
            data rates may apply. Reply <strong>STOP</strong> to opt out, or{" "}
            <strong>HELP</strong> for assistance. We do not send marketing or
            promotional messages.
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

export default Terms;
