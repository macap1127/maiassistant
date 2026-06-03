# iOS App Store Submission Guide — Mia Family Assistant

App ID / Bundle ID: `com.aiblueribbon.mia` · App Name: `Mia Family Assistant`

Backend is shared with Android — no separation needed. Lovable Cloud handles both.

---

## 1. Sign in with Apple (now wired — native on iOS, web fallback elsewhere)

The auth page now does the right thing on every platform:

| Platform | Apple button behavior |
|---|---|
| iOS native app | Native system sheet via `@capacitor-community/apple-sign-in`, token exchanged with backend via `signInWithIdToken` |
| Web / PWA | Lovable Cloud managed OAuth (browser redirect) |
| Android | Lovable Cloud managed OAuth (browser redirect) |

Google is shown on web only and hidden in the native app (Apple's review guideline 4.8 — if any third-party social login exists, Sign in with Apple must be offered, and it now is).

### One required backend setup step (5 min, do once)

Native iOS uses your **bundle ID** (`com.aiblueribbon.mia`) as the OAuth audience, while web uses a **Services ID**. You need to add the bundle ID as an additional allowed audience in the Supabase Apple provider config:

1. Open Lovable Cloud → Users → Authentication Settings → Sign In Methods → Apple
2. In "Additional Client IDs", add: `com.aiblueribbon.mia`
3. Save

Without this, native sign-in returns "invalid audience" on first use.

### Xcode capability (required for native flow)

In Xcode → target App → Signing & Capabilities → **+ Capability** → add **Sign In with Apple**. Apple Developer membership is required for this to work on a real device.

---

## 2. Add the iOS platform (run on your Mac)

```bash
git pull
npm install
npx cap add ios
npx cap update ios
npm run build
npx cap sync ios
npx cap open ios   # opens Xcode
```

After every code change, repeat the last four lines.

---

## 3. Info.plist permission strings (REQUIRED — app rejected without these)

Audited the app: it uses the **microphone** (voice assistant) and **camera / photo library** (receipt scanning + calendar imports). Add these in Xcode (`ios/App/App/Info.plist`):

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Mia uses your microphone so you can talk to your family assistant.</string>

<key>NSCameraUsageDescription</key>
<string>Mia uses the camera to scan grocery receipts and calendar screenshots.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Mia needs photo access to import receipts and calendars from your library.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Mia saves processed receipts back to your photo library when you ask.</string>
```

---

## 4. App icons & splash

```bash
npm i -D @capacitor/assets
mkdir -p resources
# Drop a 1024x1024 PNG at resources/icon.png and a 2732x2732 splash at resources/splash.png
npx @capacitor/assets generate --ios
```

Generates every required iOS icon and splash size into `ios/App/App/Assets.xcassets/`.

---

## 5. Apple Developer / App Store Connect checklist

- [ ] Register App ID `com.aiblueribbon.mia` with **Sign In with Apple** capability enabled
- [ ] Create app record in App Store Connect with the same bundle ID
- [ ] Privacy policy URL: `https://miafamilyassistant.com/privacy`
- [ ] Terms URL: `https://miafamilyassistant.com/terms`
- [ ] App Privacy / Data Use disclosures:
  - Contact Info → Email (linked to identity)
  - User Content → Audio (voice, not linked, not used for tracking)
  - User Content → Photos (receipts, linked to identity)
  - Identifiers → User ID
- [ ] Encryption export compliance: **No** (standard HTTPS only)
- [ ] Provide reviewer test account credentials in App Review notes
- [ ] Screenshots: 6.9" (iPhone 16 Pro Max) and 6.5" required, optionally 5.5" + iPad
- [ ] Age rating questionnaire (likely 4+)
- [ ] Subscriptions: if you ship Stripe-backed plans in v1, hide upgrade UI on iOS or move to App Store In-App Purchase. Apple rejects digital-good subscriptions sold outside IAP.

---

## 6. Subscription gotcha (read before submitting)

The current Pricing page sends users to Stripe. Apple rejects this for digital subscriptions consumed inside the app. Options:
- **Easiest**: Hide the upgrade/pricing UI inside the iOS app (`Capacitor.getPlatform() === 'ios'`) and let users upgrade from the web.
- **Compliant long-term**: Add Apple In-App Purchase via `@revenuecat/purchases-capacitor` and mirror your tiers.

If you want, I can ship the "hide pricing on iOS" change now — it's a 5-minute edit and unblocks submission.

---

## 7. Deploy loop

```bash
git pull && npm install && npm run build && npx cap sync ios
# Xcode → Product → Archive → Distribute App → App Store Connect
```
