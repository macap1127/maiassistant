# Microphone Access: Onboarding Step + Permission Screen

## Goal
Make sure every user grants microphone access before they ever need it — so Mia's voice assistant works on the first tap. If permission was previously denied, give the user a dedicated screen with a button that opens the phone's app settings to the Microphone toggle.

## Approach

### 1. New "Enable Microphone" step in Onboarding
- Add a final step to `src/pages/OnboardingPage.tsx` after family setup, before `onDone()`.
- The step shows a clear explanation ("Mia listens so you can add groceries, tasks, and events hands-free") plus one button: **"Enable Microphone"**.
- Tapping the button calls `navigator.mediaDevices.getUserMedia({ audio: true })` — on Android and iOS this triggers the native permission dialog. The stream is immediately stopped after grant.
- Buttons: "Enable Microphone", "Skip for now". If permission is already granted, the step auto-passes.
- This works on web too (browser permission prompt).

### 2. New shared `useMicPermission` hook (`src/lib/useMicPermission.ts`)
- Wraps `navigator.permissions.query({ name: 'microphone' })` where available, with graceful fallback.
- Exposes: `status` (granted / denied / prompt / unsupported), `request()` (getUserMedia warm-up), and `openAppSettings()` (uses Capacitor `App` plugin's open-settings / falls back to instructions text on web).

### 3. Dedicated permission-recovery screen
- A small card/screen (shown inside Settings and as a dialog) that appears when status is `denied`:
  - Explains that the mic is off.
  - **"Open Settings"** button → uses `@capacitor/app` `App.openSettings()` (or the AppSettings plugin) to jump straight to the app's system settings page where the Microphone toggle lives (Android & iOS).
  - On web, shows instructions ("tap the lock icon in the address bar…") since browsers don't allow deep-linking.

### 4. Wire into VoiceAssistant errors
- When `VoiceAssistant.tsx` gets a `NotAllowedError` (mic denied), in addition to the existing toast it will surface this recovery dialog with the "Open Settings" button, instead of just a text message.

### 5. i18n
- Add the new strings (onboarding mic step, recovery dialog) to all 15 locale JSON files.

## Files touched
- `src/lib/useMicPermission.ts` (new)
- `src/pages/OnboardingPage.tsx` (new step)
- `src/components/MicPermissionCard.tsx` (new, reused in Settings + dialog)
- `src/components/VoiceAssistant.tsx` (recovery dialog on denial)
- `src/pages/SettingsPage.tsx` (mic status row with "Open Settings")
- `src/i18n/locales/*.json` (15 files)

## Notes
- No manifest/native changes needed — `RECORD_AUDIO` etc. were added in the last release, so the permission toggle will now appear in system settings.
- Requires a new native build afterward (Android versionCode bump + iOS build bump) since the change ships inside the web bundle — actually no native change is required; this is JS-only and rides the next app update like previous ones.
