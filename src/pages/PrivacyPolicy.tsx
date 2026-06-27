const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: June 27, 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p>
            <strong>Mia Family Assistant (Sole Proprietor)</strong> ("Mia Family Assistant", "we", "us", "our") is the
            operating entity and data controller for this service. Mia is a household management application that helps
            families coordinate groceries, tasks, receipts, and calendar events. This Privacy Policy explains what
            information we collect, how we use it, who we share it with, and the choices you have.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account info:</strong> Email address and authentication identifiers (Supabase / Google OAuth).
              Password is never stored in plain text.
            </li>
            <li>
              <strong>Household content:</strong> Grocery items, tasks, calendar events, household and family member
              names, and notes you create in the app.
            </li>
            <li>
              <strong>Phone numbers (optional):</strong> Only if you choose to save one on a household member profile.
              Phone numbers are not used to send SMS.
            </li>
            <li>
              <strong>Photos & files:</strong> Receipt images you upload for scanning, and calendar files (ICS, PDF,
              images) you import for event extraction. Images are processed for text extraction and then stored in your
              account's private storage bucket.
            </li>
            <li>
              <strong>Voice/audio:</strong> If you use the voice assistant, microphone audio is streamed to our
              speech-to-text and assistant provider (ElevenLabs) and is not retained by Mia after the conversation
              ends.
            </li>
            <li>
              <strong>Push notification token:</strong> A device push token issued by Firebase Cloud Messaging (FCM)
              when you enable push notifications, used solely to deliver the reminders you opt in to.
            </li>
            <li>
              <strong>Subscription & purchase info:</strong> Plan, status, and renewal dates. Payment card details are
              handled by Stripe (web) or Apple/Google + RevenueCat (mobile). We never see or store full card numbers.
            </li>
            <li>
              <strong>Usage & diagnostic data:</strong> Basic technical information such as device type, app version,
              and timestamps for security and reliability.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. How We Use Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Authenticate you and keep your account secure.</li>
            <li>Operate the household features (groceries, tasks, calendar, receipts, family members).</li>
            <li>Send push notification reminders and household activity alerts only when you opt in.</li>
            <li>Process subscriptions and renewals.</li>
            <li>Improve reliability, prevent abuse, and comply with legal obligations.</li>
          </ul>
          <p>We do not sell your personal information and we do not use it for advertising.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Push Notifications & Consent</h2>
          <p>
            Push notifications are strictly opt-in and OFF by default. When you enable them in Settings, you can
            individually toggle:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Daily calendar digest</strong> — a morning summary of today's events.</li>
            <li><strong>Event reminders</strong> — 30 minutes before timed events.</li>
            <li><strong>Family activity</strong> — when a member adds a task, grocery item, or event.</li>
            <li><strong>Account &amp; billing</strong> — trial ending, payment issues, plan changes.</li>
          </ul>
          <p>
            You can turn any category off, or disable push entirely, from Settings or from your device notification
            settings. Notification tokens and preferences are never shared with third parties for marketing. Members
            cannot use Mia to send SMS or push notifications to each other.
          </p>
          <p>
            <strong>Data rates may apply.</strong> Delivery depends on device, network, and operating system settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Third-Party Service Providers</h2>
          <p>
            We use the following processors strictly to operate the service. Each receives only the data needed for its
            function and is contractually bound to protect it.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase</strong> — managed Postgres database, authentication, and storage (account data, household content, receipt images).</li>
            <li><strong>Google Firebase Cloud Messaging (FCM)</strong> — push notification delivery (device token + notification payload).</li>
            <li><strong>Google OAuth</strong> — optional sign-in (email and basic profile when you choose Google sign-in).</li>
            <li><strong>ElevenLabs</strong> — voice assistant speech-to-text and text-to-speech (audio streams, not retained by Mia).</li>
            <li><strong>OpenAI / Lovable AI Gateway</strong> — AI extraction from receipts and calendar files (image or text content of the file you upload).</li>
            <li><strong>Stripe</strong> — payment processing on the web (billing details).</li>
            <li><strong>RevenueCat + Apple App Store / Google Play Billing</strong> — payment processing in the mobile app (subscription state).</li>
            <li><strong>Resend</strong> — transactional email (invites, password reset, billing).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Data Sharing</h2>
          <p>
            We share data only with the processors listed above, and only as required to deliver the service. We do not
            sell or rent personal information, and we do not share data with third parties for advertising or marketing.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Data Retention &amp; Deletion</h2>
          <p>
            We retain your account and household data for as long as your account is active. You may delete your
            account at any time from Settings → Delete account. Deletion permanently removes your profile, household
            content, receipts, device tokens, and notification preferences, and cancels any active subscription.
            Backups are purged on a rolling 30-day schedule.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Security</h2>
          <p>
            Data is encrypted in transit (TLS) and at rest. Access to household content is enforced at the database
            level via row-level security so members of one household cannot read another household's data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Children</h2>
          <p>
            Mia is not directed to children under 13. We do not knowingly collect personal information from children.
            If you believe a child has provided us information, contact us and we will delete it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Your Rights</h2>
          <p>
            You can access, correct, export, or delete your information from inside the app. EU, UK, and California
            residents may have additional rights (access, portability, erasure, objection). Contact us to exercise
            them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Updates will be posted here with a revised
            "Last updated" date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">12. Contact</h2>
          <p>
            Questions? Contact us at{" "}
            <a className="underline" href="mailto:support@miafamilyassistant.com">
              support@miafamilyassistant.com
            </a>
            .
          </p>
        </section>

        <div className="pt-6 border-t border-border text-sm text-muted-foreground">
          <a href="/terms" className="underline hover:text-foreground">
            Terms &amp; Conditions
          </a>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
