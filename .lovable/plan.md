# Family invite experience: current vs. desired

## What your app does today

1. User signs up, then is forced to `/pricing` and must pick a plan (Basic, Family, Family Plus).
2. After payment, onboarding starts: **Step 1** enter your name + optional family member names/phones, **Step 2** turn on the microphone. Then the dashboard.
3. Inviting real logins is *not* part of that flow. It only exists later, buried at the bottom of the **Family** page in the "Household logins" card.
4. That card allows **one email at a time** — type an email, press Invite, repeat. No multi-invite field.
5. Explanation is one short line of text. Nothing tells the user the difference between a "family member" (just a name in the app) and an "invited login" (a person with their own account), which is the single most confusing part today.
6. Seat limits are already correct: Basic = 1 login (no invites), Family = 4 logins (owner + 3), Family Plus = 6 logins (owner + 5). At the limit, the card swaps to an "Upgrade" button.

## Gaps vs. the experience you described

| You want | Today |
|---|---|
| Invite screen immediately after choosing a plan | Missing — goes straight to name entry, then mic |
| Send 3 invites at once (Family) / 5 at once (Plus) | One email at a time only |
| Clear plain-language explanation of what and why | One short sentence, no guidance |
| Obvious link between plan seats and invites | Only a small "2 of 4 · Family" counter |

## What I'll build

**1. New onboarding step: "Invite your family"**
Inserted into the existing onboarding sequence, after the name step and before the microphone step. Skipped automatically for Basic (1 seat) — those users see an "Add more seats" upsell line instead.

The screen shows:
- Headline: "Invite your family" + plain-English explainer: each person you invite gets their own login on their own phone, and everyone sees the same calendar, lists, groceries and receipts instantly.
- Numbered 1-2-3 steps: type their email → they get an email with a join link → they create a password and land in your family.
- Exactly N email fields, where N = plan seats minus 1 (Family = 3 fields, Family Plus = 5 fields).
- One "Send invites" button that sends all filled-in emails in a single action, with a per-row success/failure indicator.
- "Skip for now — you can invite anyone later from the Family tab" secondary link, so nobody is trapped.

**2. Upgrade the existing Family page card**
Same multi-email behaviour and same explainer copy, so the later path matches the onboarding path. Keeps pending-invite list, copy-link and revoke as they are. Adds a clear line distinguishing "family members" (names Mia recognises) from "logins" (people with their own account).

**3. Copy and languages**
All new text goes through i18next and is translated into the existing 15 languages.

## Technical notes

- New component `src/components/InviteFamilyStep.tsx`; `src/pages/OnboardingPage.tsx` gains an `invite` step between `family` and `mic`, gated on `TIER_INFO[tier].logins > 1`.
- Batch send reuses today's logic per email: insert into `household_invites`, then invoke `send-transactional-email` with the `household-invite` template. Sent sequentially with per-row status; a failure on one row does not block the others.
- Seat maths comes from `TIER_INFO` in `src/lib/useHousehold.ts` (`logins - 1` invitable seats); pending invites already count toward the cap via the existing member-limit trigger, so the form disables rows beyond remaining capacity.
- Invite links keep using the `https://miafamilyassistant.com` origin fix already in `HouseholdLogins.tsx`, so links work from the native apps.
- Web, iOS and Android all pick this up (shared React code). No native version bumps in this change — say the word when you want new store builds.
