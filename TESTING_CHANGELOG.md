# Google Play Testing Changelog

A running log of changes made in response to issues found during Google Play closed testing. Share this with Google Play review if asked what was changed between builds.

---

## 2026-05-21 — Build after first alpha install

Issues reported by tester:
1. Mia's voice is choppy — pauses / skips occasionally during playback.
2. Mia could not answer "what's on the grocery list?" — she had no way to read app data.
3. When asked to add "broccoli", Mia started adding random words from the conversation to the grocery list instead of just the requested item.

Changes made:

- **Voice transport switched from WebSocket → WebRTC.** ElevenLabs' WebRTC transport has lower latency and is more resilient to network jitter, which fixes the choppy / skipping playback. The `elevenlabs-token` edge function is now called with `mode: "voice"` to mint a WebRTC conversation token, and `startSession` uses `connectionType: "webrtc"`.

- **Mia can now read app data back to the user.** Added three new client tools to the voice assistant:
  - `getGroceryList` — returns the current grocery list (optionally filtered by store), grouped by completed / not completed.
  - `getTasks` — returns open and recently completed to-do items, optionally filtered by assignee.
  - `getUpcomingEvents` — returns calendar events for the next N days (default 7).
  These tools let Mia answer questions like "what's on the grocery list?", "what do I have to do today?", and "what's coming up this week?".

- **Stopped Mia from auto-adding random words to the grocery list.** Removed the transcript-based fallback that parsed the user's raw speech and inserted anything that looked like a grocery word. Items are now added **only** when Mia explicitly calls the `addGrocery` tool with a real item name, which eliminates the false positives reported during testing.

- **Registered the 3 new client tools (`getGroceryList`, `getTasks`, `getUpcomingEvents`) in the ElevenLabs agent dashboard.** Each tool configured with: Wait for response = ON, Disable interruptions = OFF, Pre-tool speech = Auto, Execution mode = Immediate, Response timeout = 5s. Parameters are all optional (store / assignee / days). This makes the client-side tool handlers actually reachable by the agent so Mia can read live grocery, task, and calendar data back to the user.

---

## 2026-05-24 — Follow-up fixes & polish

Issues / requests addressed:

- **Mic disconnected immediately on tap.** Removed the client-side `overrides.agent.prompt` from the ElevenLabs `startSession` call in `VoiceAssistant.tsx`. ElevenLabs rejects the connection when "Prompt overrides" isn't explicitly enabled in the agent's Security settings, which was causing the session to drop the instant it opened. The full Mia system prompt is now configured directly in the ElevenLabs dashboard, and the client only passes dynamic variables (user name, family members, etc.) — which don't require the override toggle.

- **Updated support email across the app.** Replaced the placeholder `support@maiassistant.lovable.app` with the real address **support@miafamilyasistant.com** on the Privacy Policy page, Terms of Service page, About page, and Settings page footer so testers and users have a working contact.

- **Cleaned up test/demo accounts in the database.** Removed leftover test accounts (`michael@aiblueribbon.com` and an anonymous demo account with placeholder family members "Sarah/Mike/Emma/Liam"). Kept only the real owner account (`michaeldmacri@gmail.com`) and the Google Play review account (`review@miaassistant.com`).

- **Confirmed household / multi-user sharing model for reviewers.** Verified that one household links multiple logins via the `household_members` table — all members see the same grocery list, tasks, calendar, and receipts via RLS (`is_household_member`). Member limits per tier: Basic = 1, Family = 4, Family Plus = 6. Invite links are generated from the **Family** page (`HouseholdLogins` component) using one-time codes routed through `/invite/:code`. Noted for a future paid-tier feature: optional "private to me" visibility flag on tasks/events (deferred — not in this build).

