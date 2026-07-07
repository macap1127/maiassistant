# Xcode Cloud Setup Guide — Mia Family Assistant

This guide is for **Xcode Cloud builds** so you can submit to the App Store without keeping a modern Mac around. Your 2019 Intel MacBook is fine for everyday code changes; you only need a modern Mac **once** to create the iOS project and the Xcode Cloud workflow.

---

## What you need once

- Any Mac that can run **Xcode 15+** (friend, family, MacInCloud rental, Apple Store, etc.).
- About **60–90 minutes** of that Mac's time.
- Your Apple Developer account (team **AI Blue Ribbon LLC**).

After that one-time setup, **every future release is just `git push`** from your old Mac.

---

## Part 1 — Generate the iOS project (on the modern Mac)

Your repo currently does **not** contain the `ios/` folder, so Xcode Cloud has nothing to build yet. Create it:

```bash
# On the modern Mac
git clone https://github.com/macap1127/maiassistant.git
cd maiassistant
git checkout main
npm install
npx cap add ios
```

This creates the `ios/` folder and runs the initial `pod install`. If it prompts for a team/bundle ID, use:
- **Bundle ID:** `com.aiblueribbon.mia`
- **Team:** `AI Blue Ribbon LLC`
- **App Name:** `Mia Family Assistant`

---

## Part 2 — Configure the project in Xcode

Open the project:

```bash
npx cap open ios
```

In Xcode, select the **App** target → **Signing & Capabilities**:

1. **Team:** choose `AI Blue Ribbon LLC`.
2. **Bundle Identifier:** `com.aiblueribbon.mia`.
3. Click **+ Capability** and add:
   - **Sign In with Apple**
   - **Push Notifications**
   - **Background Modes** → check **Remote notifications**
   - **Associated Domains** → add:
     ```
     applinks:miafamilyassistant.com
     applinks:www.miafamilyassistant.com
     ```

In **Info.plist** (`ios/App/App/Info.plist`), add these four usage strings:

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

Replace `<TEAM_ID>` in `public/.well-known/apple-app-site-association` with your real Apple Team ID, then re-publish the web app so the file is live at `https://www.miafamilyassistant.com/.well-known/apple-app-site-association`.

---

## Part 3 — Add the Xcode Cloud build script

Create this file so Xcode Cloud builds the web app before compiling the native iOS project:

`ios/ci_scripts/ci_post_clone.sh`

```bash
#!/bin/sh
set -e

# Xcode Cloud sets this to the repo root
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Install Node 20 via Homebrew (Xcode Cloud images include brew)
brew install node@20
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Build the web app and sync Capacitor
npm ci
npm run build
npx cap sync ios
```

Make it executable:

```bash
chmod +x ios/ci_scripts/ci_post_clone.sh
```

---

## Part 4 — Create the Xcode Cloud workflow

Still in Xcode:

1. **Product → Xcode Cloud → Create Workflow**.
2. Select the **App** target.
3. Sign in with your Apple ID and grant Xcode Cloud access to the GitHub repo.
4. Configure the workflow:
   - **Name:** `TestFlight Release`
   - **Start Conditions:** Branch Changes → `main`
   - **Environment:** Xcode 15+ / macOS latest
   - **Actions:** **Archive** → iOS → **TestFlight (Internal Testing)**
5. Save the workflow.

Xcode Cloud writes the workflow configuration to the repo (`.xcode-version` and `.ci/` files may appear). Commit those too.

---

## Part 5 — Commit and push

```bash
git add ios/
git add ios/ci_scripts/ci_post_clone.sh
git add public/.well-known/apple-app-site-association
git add .xcode-version .ci/ 2>/dev/null || true
git commit -m "Add iOS project and Xcode Cloud workflow"
git push origin main
```

The first push will trigger Xcode Cloud automatically. Build time is usually **15–25 minutes**.

---

## Part 6 — Submit for review

After the build succeeds and appears in App Store Connect:

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Apps → Mia Family Assistant → App Store tab**.
2. Add a new version (e.g., `1.0.0`).
3. Fill in: what's new, screenshots (6.9" + 6.5"), promo text, keywords.
4. In the **Build** section, select the Xcode Cloud build.
5. Complete the required sections: Privacy policy URL, App Privacy disclosures, encryption compliance (No), age rating, IAP subscriptions.
6. **Add for Review → Submit for Review**.

---

## Future releases (no modern Mac needed)

From your old MacBook:

```bash
git pull
npm install
npm run build
npx cap copy ios        # copies web assets, no Xcode needed
git add ios/App/App/public ios/App/App/capacitor.config.json package-lock.json
git commit -m "Release: update iOS web assets"
git push origin main
```

Xcode Cloud will automatically build, archive, and upload to TestFlight.

---

## Common gotchas

- **RevenueCat iOS key:** replace `REVNUECAT_IOS_KEY` in `src/lib/revenuecat.ts` with your real `appl_...` key before the first release.
- **Apple Sign-In:** native iOS uses bundle ID `com.aiblueribbon.mia` as the OAuth audience. In Lovable Cloud → Users → Authentication Settings → Apple → **Additional Client IDs**, add `com.aiblueribbon.mia`.
- **Push notifications:** upload the Apple APNs Auth Key `.p8` to Firebase Cloud Messaging for iOS.

For full iOS submission details, see `IOS_SUBMISSION.md`.
