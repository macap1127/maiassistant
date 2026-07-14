# App Privacy — Answers to enter in App Store Connect

This is a walkthrough, not a code change. Answers are derived from your live Privacy Policy and the integrations Mia actually uses (Lovable Cloud/Supabase, Firebase FCM, Google OAuth, ElevenLabs, OpenAI, Stripe, RevenueCat, Apple/Google Billing, Resend).

## Step 1 — First screen

**"Do you or your third-party partners collect data from this app?"** → **Yes**

## Step 2 — Data types to add

For each item below: **Collected → Yes**, **Linked to user → Yes**, **Used for tracking → No** (Mia does no cross-app/website tracking or advertising).

### Contact Info
- **Email Address**
  - Purposes: **App Functionality**, **Account Management**

### User Content
- **Photos or Videos** (receipt images, imported calendar images/PDFs)
  - Purposes: **App Functionality**
- **Audio Data** (voice assistant mic input, streamed to ElevenLabs, not retained)
  - Purposes: **App Functionality**
- **Other User Content** (groceries, tasks, calendar events, household/member names, notes)
  - Purposes: **App Functionality**

### Identifiers
- **User ID** (Supabase auth ID, Google OAuth sub)
  - Purposes: **App Functionality**, **Account Management**
- **Device ID** — only if you want to be strict about FCM push tokens. Apple's questionnaire treats FCM tokens as device identifiers.
  - Purposes: **App Functionality**

### Purchases
- **Purchase History** (plan, status, renewal dates via RevenueCat / Apple Billing)
  - Purposes: **App Functionality**

### Usage Data
- **Product Interaction** (basic app usage, timestamps for reliability)
  - Purposes: **Analytics**, **App Functionality**

### Diagnostics
- **Crash Data**, **Performance Data** (device type, app version, error logs)
  - Purposes: **App Functionality**

### Financial Info — **DO NOT declare**
Stripe / Apple / Google Billing handle card data; Mia never sees it. Apple explicitly says not to declare data that only the payment processor sees.

### Health, Location, Browsing History, Search History, Sensitive Info, Contacts — **Not collected**

## Step 3 — For every item above, on the follow-up screen

- **Is this data linked to the user's identity?** → **Yes** (everything ties to their account)
- **Is this data used to track the user?** → **No**

## Step 4 — Privacy Policy URL

Enter: `https://www.miafamilyassistant.com/privacy`

## After you save

Apple shows a preview labels card ("Data Linked to You", "Data Not Linked to You", "Data Used to Track You"). Yours should show:
- Data Linked to You: Contact Info, User Content, Identifiers, Purchases, Usage Data, Diagnostics
- Data Used to Track You: **None**

Reply **"done"** when saved and I'll walk you through **Pricing & Availability** next.
