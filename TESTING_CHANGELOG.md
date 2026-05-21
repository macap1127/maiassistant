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

