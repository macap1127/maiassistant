# Android App Links — Password Reset Deep Linking

This makes tapping the password-reset email on Android open **inside the app**
instead of the browser. (iOS Universal Links follow the same pattern with an
`apple-app-site-association` file — not set up here.)

The app already:

- Sends reset links to `https://miafamilyassistant.com/reset-password`
  (see `src/pages/AuthPage.tsx`).
- Listens for `appUrlOpen` and routes the path/hash inside the app
  (see `src/lib/deepLinks.tsx`).
- Serves `/.well-known/assetlinks.json` from `public/.well-known/assetlinks.json`.

You still need to do **two** things locally before deep linking works on a
real device:

---

## 1. Get your release SHA‑256 fingerprint(s)

If you sign the APK/AAB locally with your release keystore:

```powershell
keytool -list -v -keystore "C:\path\to\your-release.keystore" -alias your-alias
```

Copy the line that starts with `SHA256:` — it looks like
`AB:CD:12:...:EF` (64 hex chars separated by colons).

If you use **Google Play App Signing** (recommended), Google re-signs your
upload. Get the *app signing* SHA‑256 from:

  Google Play Console → your app → **Test and release → App integrity → App signing**

Copy the **"App signing key certificate" SHA‑256**. Also keep the **"Upload
key certificate" SHA‑256** so installs from Android Studio still verify.

Paste both into `public/.well-known/assetlinks.json`, replacing the two
`REPLACE_WITH_...` placeholders. Then rebuild and republish the website so
`https://miafamilyassistant.com/.well-known/assetlinks.json` returns the file.

Verify with:

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://miafamilyassistant.com&relation=delegate_permission/common.handle_all_urls
```

---

## 2. Add the intent‑filter to AndroidManifest.xml

After `npx cap add android` (or in your existing `android/` folder), open
`android/app/src/main/AndroidManifest.xml` and add this **inside** the
`<activity android:name=".MainActivity" …>` block, alongside the existing
launcher intent-filter:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https"
          android:host="miafamilyassistant.com" />
    <data android:scheme="https"
          android:host="www.miafamilyassistant.com" />
</intent-filter>
```

`autoVerify="true"` tells Android to fetch your `assetlinks.json` at install
time. If the fingerprints match, Android opens links to those domains in your
app automatically — no "Open with…" picker.

---

## 3. Rebuild and test

```powershell
npm run build
npx cap sync android
npx cap open android
```

Build a release (or release-signed debug) APK, install it on a device, then:

```powershell
adb shell pm get-app-links com.aiblueribbon.mia
```

You should see `miafamilyassistant.com: verified`. Trigger a password reset
from the app and tap the link in the email — it should open straight into the
in-app reset screen.

If it still opens the browser:
- `assetlinks.json` must be reachable over HTTPS with `Content-Type: application/json`.
- Fingerprints must match the signing key used for the installed build.
- After updating fingerprints, uninstall + reinstall (or run
  `adb shell pm verify-app-links --re-verify com.aiblueribbon.mia`).
