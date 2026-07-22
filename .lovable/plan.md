# Plan: Resolve Apple Rejection (Submission cd656e92)

## Issue 1 — Guideline 2.2 "beta / limited functionality"
Reviewer likely landed on empty screens. Fix:
- Seed the `appreview@miafamilyassistant.com` household with realistic content (family member, groceries, tasks already exist; add 4 upcoming calendar events).
- Reviewer notes in App Store Connect must list the demo login and tell them to open Grocery, Tasks, Calendar, and tap the voice mic on Home.

## Issue 2 — Guideline 1.2 "UGC / AI content moderation"
Apple requires an in-app AI/UGC consent + moderation surface. Add `AIConsentModal`:
- Shown once per user on first authenticated session.
- Accept / Decline buttons.
- Lists: content is processed by AI providers, objectionable content is filtered, users can report abuse via support@miafamilyassistant.com within 24 hours.
- Links to Terms & Privacy.

## Issue 3 — Guideline 2.1 "iPad bottom nav clipping"
Constrain the bottom nav to `max-w-lg` on tablets so it renders as a centered pill instead of edge-to-edge, matching the content column. Bottom nav stays (user requirement).

## Bonus cleanup
- Add `ITSAppUsesNonExemptEncryption=false` to `Info.plist` so the encryption compliance popup no longer appears for future builds.

## Files touched
- `ios/App/App/Info.plist` — add encryption key.
- `src/components/AIConsentModal.tsx` — new.
- `src/components/AppLayout.tsx` — mount modal, iPad nav width fix.
- DB seed — 4 events in appreview household.

## Next build steps
1. Bump `CFBundleVersion` in Xcode (build number, e.g. 2).
2. Archive → Upload to App Store Connect from your Mac.
3. In the version page, reply to the rejection with:
   - "Added AI content consent modal shown on first launch with Accept/Decline, moderation policy, and 24-hour abuse reporting to support@miafamilyassistant.com."
   - "Demo household is now populated with family member, groceries, tasks, and calendar events."
   - "Bottom navigation now renders as a centered pill on iPad and no longer clips content."
4. Attach the new build and Submit for Review.
