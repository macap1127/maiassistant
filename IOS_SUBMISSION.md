# iOS App Store Submission Guide — Mia Family Assistant

App ID: `com.aiblueribbon.mia` · App Name: `Mia Family Assistant`

Backend is shared with Android — no separation needed. Lovable Cloud handles both.

---

## 1. Apple Sign In (done in code)

The auth page now shows **Continue with Apple** on both web and native iOS, and **Continue with Google** on web only (Google is hidden inside the native app per Apple's review guidance). Apple is enabled in Lovable Cloud's managed auth — no extra config required for the web flow.

For native iOS, you can either:
- **Use the managed web flow** (works today, opens Apple sheet in an in-app browser), OR
- **Use native Sign in with Apple** (recommended for App Store) — install `@capacitor-community/apple-sign-in`, enable the "Sign In with Apple" capability in Xcode, and exchange the identity token via `supabase.auth.signInWithIdToken({ provider: 'apple', token })`.

If you want native Apple Sign-In wired up, say the word and I'll add it.

---

## 2. Add the iOS platform (run locally on your Mac)

```bash
git pull
npm install
npx cap add ios
npx cap update ios
npm run build
npx cap sync ios
npx cap open ios   # opens Xcode
```

---

## 3. Info.plist permission strings (REQUIRED — app will be rejected without these)

In Xcode, open `ios/App/App/Info.plist` and add:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Mia uses your microphone so you can talk to your family assistant.</string>

<key>NSCameraUsageDescription</key>
<string>Mia uses the camera to scan grocery receipts.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Mia needs photo access to import receipts and calendar screenshots.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Mia saves processed receipts back to your photo library when you ask.</string>
```

---

## 4. App icons & splash screen

```bash
npm i -D @capacitor/assets
# Place a 1024x1024 PNG at resources/icon.png and a 2732x2732 splash at resources/splash.png
npx @capacitor/assets generate --ios
```

This auto-generates every required iOS icon and splash size into `ios/App/App/Assets.xcassets/`.

---

## 5. Apple Developer / App Store Connect checklist

- [ ] Create App ID `com.aiblueribbon.mia` with **Sign In with Apple** capability
- [ ] Create app record in App Store Connect with same bundle ID
- [ ] Privacy policy URL: `https://miafamilyassistant.com/privacy`
- [ ] Terms URL: `https://miafamilyassistant.com/terms`
- [ ] Data Use disclosures: email, voice audio, photos (receipts), name (optional)
- [ ] Encryption export compliance: usually "No" (only standard HTTPS)
- [ ] Test account credentials for reviewers
- [ ] Screenshots: 6.7" (iPhone 15 Pro Max) and 6.5" required

---

## 6. After every code change

```bash
git pull && npm install && npm run build && npx cap sync ios
```

Open in Xcode → Product → Archive → Distribute → App Store Connect.
