# Android Play Store Submission Guide — Mia Family Assistant

Package ID: `com.aiblueribbon.mia` · App Name: `Mia Family Assistant`

Backend is shared with iOS — no separation needed. Lovable Cloud handles both.

---

## 1. One-time setup already done

- `capacitor.config.ts` is configured with `appId: 'com.aiblueribbon.mia'` and `appName: 'Mia Family Assistant'`.
- Android App Links (password reset deep linking) are configured:
  - `public/.well-known/assetlinks.json` is live at `https://www.miafamilyassistant.com/.well-known/assetlinks.json`
  - `android/app/src/main/AndroidManifest.xml` has the deep-link intent filter for `miafamilyassistant.com` and `www.miafamilyassistant.com`.
- Firebase Cloud Messaging is configured for push notifications.
- RevenueCat Android public API key is already set in `src/lib/revenuecat.ts`.

---

## 2. Build and sync (run on your machine)

```bash
git pull
npm install
npm run build
npx cap sync android
```

If you need to inspect the native project, open it in Android Studio:

```bash
npx cap open android
```

---

## 3. Generate a signed release AAB

In Android Studio:

1. **Build → Generate App Bundle / APK → App Bundle**.
2. Select **Release**.
3. Choose or create your upload keystore. Google Play will re-sign the app with its own app signing key, so this keystore only needs to be valid for upload.
4. Finish and note the output `.aab` path (usually `android/app/release/app-release.aab`).

---

## 4. Upload to Google Play Console

1. Go to **Google Play Console → Mia Family Assistant → Test and release → Production** (or Internal testing / Closed testing).
2. Click **Create new release**.
3. Upload the `.aab` file.
4. Fill in the release notes:
   - Bug fixes and improvements.
   - Any user-facing changes from `NEXT_RELEASE.md`.
5. Review the release. If there are no policy errors, click **Save** then **Review release**.

---

## 5. Deep-link verification after release

Once the release is live and installed on a device:

```bash
adb shell pm get-app-links com.aiblueribbon.mia
```

You should see:

```
com.aiblueribbon.mia:
  ID: 01234567-89ab-cdef-0123-456789abcdef
  Signatures: [06:43:B6:01:...:30:79]
  Domain verification state:
    miafamilyassistant.com: verified
    www.miafamilyassistant.com: verified
```

If it says `asked` or `verified` only for `www`, uninstall and reinstall the app, or run:

```bash
adb shell pm verify-app-links --re-verify com.aiblueribbon.mia
```

---

## 6. Deploy loop

For every future release:

```bash
git pull && npm install && npm run build && npx cap sync android
# Android Studio → Build → Generate App Bundle → upload to Play Console
```
