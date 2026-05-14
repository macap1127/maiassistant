# Mai Pricing & Tier System Build Plan

## Tiers (Option A)
| Tier | Price | Logins | Voice/month |
|---|---|---|---|
| Basic | $9/mo | 1 | 30 min |
| Family | $29/mo | 4 | 120 min shared |
| Family Plus | $49/mo | 6 | 240 min shared |

No free tier. Quotas reset on each household's billing anniversary.

---

## Step 1 — Database schema

Add to `households` table:
- `subscription_tier` text — `'basic' | 'family' | 'family_plus'` (default `'basic'`)
- `subscription_status` text — `'trialing' | 'active' | 'past_due' | 'canceled'`
- `stripe_customer_id`, `stripe_subscription_id` text
- `current_period_start`, `current_period_end` timestamptz (drives quota reset)
- `voice_seconds_used` integer (default 0) — reset each period
- `voice_seconds_limit` integer — derived from tier but stored for overrides

New table `household_invites`:
- `household_id`, `email` (or `phone`), `invite_code` (random), `expires_at`, `accepted_at`, `invited_by`

New table `voice_usage_log` (audit trail):
- `household_id`, `user_id`, `seconds`, `started_at`, `ended_at`, `conversation_id`

RLS: members can read their own household; only owner can invite/remove members and change tier.

---

## Step 2 — Login limit enforcement

Add a DB trigger on `household_members` insert: count members vs tier limit (1/4/6); reject if exceeded with clear error.

Update auth flow so when a user signs up via an invite code, they auto-join that household instead of creating a new one.

---

## Step 3 — Family invite flow

Owner-only **Family** page section:
- "Invite member" button → enter email/phone → generates invite code → shows shareable link `/?invite=ABC123`
- List of pending invites with revoke button
- List of current members with remove button (owner can't remove self)

New `/invite/:code` route: shows household name, prompts sign in or create account, then auto-adds to household.

---

## Step 4 — Voice quota tracking

In `VoiceAssistant.tsx`:
- On `onConnect`: check `voice_seconds_used < voice_seconds_limit`. If over, refuse to start and show upgrade toast.
- On `onDisconnect`: compute session duration, call edge function `log-voice-usage` to increment `voice_seconds_used` and write to `voice_usage_log`.
- Show a small "Voice: 12 / 30 min used this month" indicator near the mic button.

Edge function `reset-voice-quotas` (cron-style, called daily): for any household where `current_period_end < now()`, reset `voice_seconds_used` to 0 and roll the period forward by 1 month.

---

## Step 5 — Stripe billing (seamless via Lovable)

Use Lovable's built-in Stripe Payments (no API key needed). Three products created via `batch_create_product`:
- Basic — $9/mo recurring
- Family — $29/mo recurring
- Family Plus — $49/mo recurring

Edge functions:
- `create-checkout` — owner picks tier, redirects to Stripe Checkout
- `customer-portal` — manage/cancel subscription
- `stripe-webhook` — listens for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Updates `subscription_tier`, `subscription_status`, `stripe_*` IDs, period dates, and `voice_seconds_limit` on the household.

Tax handling: **calculation only** (Stripe `automatic_tax: { enabled: true }`) — simpler than full managed payments and works for digital subscriptions worldwide.

---

## Step 6 — Pricing page rewrite

Update `/pricing` with the three tiers in a clean comparison grid:
- Show price, login count, voice minutes, full feature list
- "Get started" buttons trigger the checkout flow when logged in, or send to signup first
- Highlight Family as the recommended tier
- Add FAQ: "what happens at the limit", "can I upgrade later", "annual discount" (deferred), "cancel anytime"

---

## Step 7 — Settings page additions

In `/settings`, add a **Billing** section (owner only):
- Current tier + renewal date + minutes used
- "Manage billing" → Stripe Customer Portal
- "Upgrade tier" → checkout for higher tier
- Past-due/canceled banner if `subscription_status` is unhealthy

---

## Build order (to keep it shippable in chunks)
1. **Schema migration** (Step 1)
2. **Login limit + invite flow** (Steps 2–3) — household becomes multi-user
3. **Voice quota tracking + UI indicator** (Step 4)
4. **Stripe enable + checkout + webhook** (Step 5)
5. **Pricing page + Settings billing section** (Steps 6–7)

I'll need you to:
- **Approve the database migration** in Step 1
- **Confirm Lovable Cloud is enabled** (it is — good)
- **Fill out the Stripe enable form** when we get to Step 4 (just business name + email)

Ready to start with the schema migration?
