# Next Release — Pending Changes

A running list of changes made in the codebase that have **not yet been shipped** to a new build of the web app or the native apps (Android / iOS). Roll these into the next release notes / changelog.

---

## 2026-06-19

### Compliance / SMS (Twilio A2P 10DLC)
- **Privacy Policy** — added the required Twilio-compliant section stating that mobile phone numbers and SMS opt-in consent are not shared with third parties or affiliates for marketing purposes.
- **Public SMS opt-in page** (`/sms-opt-in`) — now linked from the public Auth page footer, the Privacy Policy footer, and the Terms & Conditions footer so the Twilio campaign reviewer can reach it without logging in.

### Native apps (Android + iOS)
- **Removed "Continue with Google" button** from the Auth screen on native builds (Android and iOS). Native users sign in with email/password (Apple Sign-In also still available cross-platform). Web and PWA builds are unchanged and still show Google.
