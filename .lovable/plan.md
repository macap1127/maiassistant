# Align all trial and billing language

## What will change
- Update the signup screen in all 15 supported languages to clearly state that account creation starts one automatic seven-day free trial with no card or plan choice required.
- Update every pricing-page translation so it says the trial is provided at signup, the trial does not repeat, and choosing a paid plan starts billing immediately with automatic monthly or yearly renewal until canceled.
- Update the current web landing page to replace “7-day trial on every plan” with accurate signup-trial language.
- Localize the in-app trial countdown banner instead of leaving it in English, including the one-day and multiple-day versions.
- Clarify the Settings billing text so trial users understand that selecting a plan ends the free period and starts paid billing immediately.
- Update trial reminder emails so the 24-hour email explains the automatic trial accurately, and the expired-trial email clearly says payment begins immediately when a plan is selected.

## Terms and privacy
- Add a dedicated Free Trial, Subscriptions, Billing, Renewal, and Cancellation section to the Terms.
- State that the seven-day trial begins automatically at account creation, requires no card or plan selection, is limited to one per household/account, and does not create an automatic paid subscription.
- State that access is limited after expiration until a plan is selected; selecting a plan authorizes an immediate charge and recurring renewal at the displayed interval, with no second trial.
- Clarify that web purchases are managed through Stripe and mobile purchases through Apple or Google, with cancellation handled through the applicable billing provider.
- Update the Privacy Policy’s billing language and current date to match the revised trial flow; privacy language will describe data handling rather than create billing promises.

## Verification
- Search the active app, all locale files, emails, Terms, and Privacy Policy for contradictory “trial on every plan,” second-trial, and free-month wording.
- Validate all translation files and confirm the app builds successfully.
- Leave publishing and native-store submission unchanged for review.

## Technical details
- Existing historical migrations and the inactive free-month administrative tooling will not be rewritten; customer-facing active copy will be aligned without changing account eligibility or payment logic.
- The English legal pages will remain English; the app’s translated signup, pricing, and trial notices will cover all 15 supported languages.
