# iOS App Store Submission Guide — Mia Family Assistant

> **Want to use Xcode Cloud instead of archiving locally?** See `XCODE_CLOUD_SETUP.md` for the cloud-build workflow.


App ID / Bundle ID: `com.aiblueribbon.mia` · App Name: `Mia Family Assistant`

Backend is shared with Android — no separation needed. Lovable Cloud handles both.

---

## 1. Sign in with Apple (native iOS + web/Android fallback)

The auth page now handles Apple sign-in correctly on every platform:

| Platform | Apple sign-in behavior |
|---|---|
| iOS native app | Native system sheet via `@capacitor-community/apple-sign-in`, token exchanged with backend via `signInWithIdToken` |
| Web / PWA | Lovable Cloud managed OAuth (browser redirect) |
| Android | Lovable Cloud managed OAuth (browser redirect to public domain) |

Google is shown on web only and hidden in the native app (Apple's review guideline 4.8).

### Required backend setup (do once)

Native iOS uses your **bundle ID** (`com.aiblueribbon.mia`) as the OAuth audience. Add it as an additional allowed audience in the Supabase Apple provider config:

1. Open Lovable Cloud → Users → Authentication Settings → Sign In Methods → Apple
2. In "Additional Client IDs", add: `com.aiblueribbon.mia`
3. Save

Without this, native sign-in returns "invalid audience" on first use.

### Xcode capability (required for native flow)

In Xcode → target **App** → **Signing & Capabilities** → **+ Capability** → add **Sign In with Apple**. Apple Developer membership is required for this to work on a real device.

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

## 3. iOS Universal Links (password reset / invite deep links)

For iOS to open the app when a user taps `https://miafamilyassistant.com/reset-password#...` from their email, you need:

1. **Apple Developer Team ID** — find it in Apple Developer top-right corner (10-character string, e.g. `ABCDE12345`).
2. Replace `<TEAM_ID>` in `public/.well-known/apple-app-site-association` with your real Team ID.
3. In Xcode → target **App** → **Signing & Capabilities** → **+ Capability** → add **Associated Domains** with:
   ```
   applinks:miafamilyassistant.com
   applinks:www.miafamilyassistant.com
   ```
4. Re-publish the web app so `https://www.miafamilyassistant.com/.well-known/apple-app-site-association` is live.

The app-side handler (`src/lib/deepLinks.tsx`) is already wired; it will route reset-password and invite links into the app.

---

## 4. Info.plist permission strings (REQUIRED — app rejected without these)

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

## 5. App icons & splash

```bash
npm i -D @capacitor/assets
mkdir -p resources
# Drop a 1024x1024 PNG at resources/icon.png and a 2732x2732 splash at resources/splash.png
npx @capacitor/assets generate --ios
```

Generates every required iOS icon and splash size into `ios/App/App/Assets.xcassets/`.

---

## 6. RevenueCat / subscriptions (native iOS billing)

RevenueCat is already integrated in `src/lib/revenuecat.ts`. **Android is already live** with its key. For iOS, you must add your RevenueCat iOS public API key:

1. In RevenueCat → Project settings → API keys, copy the **iOS** public key (starts with `appl_`).
2. Replace `REVNUECAT_IOS_KEY` in `src/lib/revenuecat.ts` with your real key.
3. In RevenueCat, create iOS App Store products with the same entitlement IDs (`basic`, `family`, `family_plus`) used for Android.

Do **not** ship the iOS app with the placeholder key — purchases will fail.

---

## 7. Apple Developer / App Store Connect checklist

- [ ] Register App ID `com.aiblueribbon.mia` with **Sign In with Apple** capability enabled
- [ ] Create app record in App Store Connect with the same bundle ID
- [ ] Privacy policy URL: `https://miafamilyassistant.com/privacy`
- [ ] Terms URL: `https://miafamilyassistant.com/terms`
- [ ] App Privacy / Data Use disclosures:
  - Contact Info → Email (linked to identity)
  - User Content → Audio (voice, not linked, not used for tracking)
  - User Content → Photos (receipts, linked to identity)
  - Identifiers → User ID
  - Purchases → Subscription purchase history
- [ ] Encryption export compliance: **No** (standard HTTPS only)
- [ ] Provide reviewer test account credentials in App Review notes
- [ ] Screenshots: 6.9" (iPhone 16 Pro Max) and 6.5" required, optionally 5.5" + iPad
- [ ] Age rating questionnaire (likely 4+)
- [ ] In-App Purchases: create the same subscription tiers in App Store Connect and link them to RevenueCat

---

## 8. Push notifications setup (iOS native)

Android push works via Firebase. iOS requires two extra one-time steps before notifications will arrive on a real device or TestFlight build.

### A. Upload APNs Auth Key to Firebase
1. In Apple Developer → **Certificates, Identifiers & Profiles → Keys → +**
2. Name it "Mia APNs", check **Apple Push Notifications service (APNs)**, click Continue → Register.
3. Download the `.p8` file (you can only download it once). Note the **Key ID** and your **Team ID**.
4. Firebase Console → **Project settings → Cloud Messaging → Apple app configuration**.
5. Upload the `.p8`, paste Key ID + Team ID, Save.

### B. Enable Push capability in Xcode
1. Open `ios/App/App.xcworkspace` in Xcode.
2. Select the **App** target → **Signing & Capabilities**.
3. Click **+ Capability** and add:
   - **Push Notifications**
   - **Background Modes** → check **Remote notifications**
4. Confirm your team is selected and provisioning profile rebuilds without errors.
5. `npx cap sync ios`, then Product → Archive → upload to TestFlight to test on a real device (push doesn't work in the simulator).

### C. Verify
- Sign in on an iOS device build, accept the notification prompt.
- Have another household member add a grocery item → push should arrive within seconds.
- Daily digest fires at **9:00 AM ET**.

---

## 9. Deploy loop

```bash
git pull && npm install && npm run build && npx cap sync ios
# Xcode → Product → Archive → Distribute App → App Store Connect
```
