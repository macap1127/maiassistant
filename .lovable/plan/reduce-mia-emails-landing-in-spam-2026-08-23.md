# Reduce Mia emails landing in spam

## What I checked

Your sending setup is already mostly correct:

- Sender domain `notify.miafamilyassistant.com` is verified, with SPF (Mailgun) and DKIM published in the delegated zone.
- A DMARC record exists at `_dmarc.miafamilyassistant.com` (`p=none`).
- Emails are sent from `Mia Family Assistant <noreply@notify.miafamilyassistant.com>`, so From, SPF and DKIM align.

So the authentication side is not the problem. What remains are content and reputation signals — and one real mismatch: the confirmation email's button links to the raw backend verify host (a `supabase.co` URL), not to your own domain. Sending a branded email whose only link points at an unrelated domain is one of the strongest spam signals at Yahoo/AOL, which is exactly where your unconfirmed signup came from.

## Changes to make

1. **Same-domain confirmation links.** Build the signup/magic-link/email-change/invite links the same way the password reset link is already built: point them at `https://miafamilyassistant.com/auth/confirm?token_hash=...&type=...` and verify the token on that page, instead of linking to the backend host. All links in the email then match the sending domain.

2. **A confirm landing page.** New browser route `/auth/confirm` that reads `token_hash` + `type`, verifies it, and shows success / expired / invalid states with a link into the app. Mirrors the existing web reset-password page.

3. **Email content clean-up (all auth templates).**
   - Add a visible plain-text backup link under each button (helps clients that strip buttons and reduces "link-hiding" scoring).
   - Add a short footer with your business name and a "you received this because you signed up at miafamilyassistant.com" line — Yahoo/Gmail score anonymous mail harder.
   - Keep subjects plain and transactional (no "free", "trial", exclamation marks).
   - Set `Reply-To` to a real monitored address (e.g. `support@miafamilyassistant.com` or your Gmail) instead of leaving the mail unreplyable; replies to a real address are a positive reputation signal.

4. **Tighten DMARC after a week of clean sending.** Once the above is live and reports look clean, move the policy from `p=none` to `p=quarantine`. This is a DNS change at your registrar; I will give you the exact record when we get there.

5. **Optional but effective:** add a "check your spam folder / mark as not spam" hint on the post-signup screen in the app, plus a "resend confirmation" button, so a filtered first email is recoverable.

## Not changing

- No change to the sending domain, DNS delegation, or provider — those are healthy.
- Nothing in the native iOS/Android builds is required for this; item 5 touches the shared web/app signup screen only.

## Technical notes

- `supabase/functions/auth-email-hook/index.ts`: extend the existing `token_hash` extraction (already used for `recovery`) to `signup`, `magiclink`, `invite`, and `email_change`; add per-type landing URLs on `miafamilyassistant.com`; add a `reply_to` on the send payload.
- New `src/pages/AuthConfirmPage.tsx` + route in `src/App.tsx`, calling `supabase.auth.verifyOtp({ token_hash, type })`.
- Templates in `supabase/functions/_shared/email-templates/*.tsx`: backup anchor link + identity footer, using the plain `<a>` button style already proven to work in AOL Mail on `recovery.tsx`.
- Redeploy `auth-email-hook`, then publish the web app so the new confirm route is live before any new confirmation email is sent.
