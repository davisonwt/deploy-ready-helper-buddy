

## Current State

You already have a **partial** referral system in place, but it's designed for the **Whisperer (marketing agent)** role — not for general users:

1. **`affiliates` table** — stores `referral_code`, `earnings`, `commission_rate` per user. Used by `CommissionDashboard.tsx` at `/commissions`.
2. **`referrals` table** — tracks `referrer_id`, `referred_id`, `commission_amount`, `status`, `orchard_id`. Tied to orchard/product commissions.
3. **`whisperer_referral_links` table** — product-specific referral links for Whisperers.

None of these implement a **general user-to-user referral circle** where every user gets a code on signup and builds a personal network. There is no referral cookie tracking, no referral code field on the signup form, and no "My Referral Circle" page.

---

## Plan: Build the S2G Referral Circle System

### 1. Database Migration

Create two new tables (separate from the existing affiliate/whisperer system):

**`user_referrals`** — one row per user, auto-created on signup
- `id` (uuid PK), `user_id` (FK → profiles.user_id, unique), `referral_code` (unique, format `S2G-XXXXXXXX`), `total_clicks` (int default 0), `total_signups` (int default 0), `created_at`

**`referral_circle`** — tracks who referred whom
- `id` (uuid PK), `referrer_id` (FK → profiles.user_id), `referred_user_id` (FK → profiles.user_id, unique — each user can only be referred once), `status` (text: 'active'), `referred_at` (timestamptz)

**Database trigger**: `trg_auto_create_user_referral` — on INSERT to `profiles`, auto-generate a `S2G-` + 8-char alphanumeric code and insert into `user_referrals`.

**Migration for existing users**: Generate codes for all existing profiles that don't have one yet.

**RLS policies**:
- Users can read their own `user_referrals` row
- Users can read `referral_circle` rows where they are the referrer (to see their circle)
- Users can read their own row as `referred_user_id` (to see who referred them)
- Admins can read all via `has_role()`

### 2. Signup Flow Integration

**`RegisterPage.jsx` and `QuickRegistration.jsx`**:
- On page load, check URL for `?ref=CODE` query param
- Store referral code in a cookie (`s2g_ref`, 30 days expiry)
- Add an optional "Referral Code" input field, auto-filled from cookie
- After successful signup, call a new edge function or RPC to:
  - Validate the code exists and isn't the user's own
  - Increment `total_signups` on the referrer's `user_referrals`
  - Create a `referral_circle` relationship row

**Root `App.tsx`**: Add a top-level hook/component that captures `?ref=` from any landing URL and stores the cookie.

### 3. Click Tracking

Create a lightweight edge function `track-referral-click`:
- Accepts `{ code }`, increments `total_clicks` on `user_referrals`
- Called when someone lands on a referral link (from the App.tsx capture component)
- Prevents duplicate counting via sessionStorage flag

### 4. "My Referral Circle" Page

New page at `/my-referral-circle` with:
- **Referral link** with copy button (`sow2growapp.lovable.app/?ref=S2G-XXXXXXXX`)
- **QR code** (using existing `qrcode` package) with download button
- **Stats cards**: Total clicks, Total signups, Circle size
- **Circle members list**: Names/avatars of referred users (joined via `referral_circle` → `profiles`)
- **"My Referrer"** section showing who invited them (if applicable)
- **Share buttons**: WhatsApp, Email, copy link
- Themed with inline theme colors, mobile responsive

### 5. Admin Panel Integration

Add a "Referral Activity" tab to the existing admin dashboard (`/admin/dashboard`):
- Top referrers leaderboard
- Total referral stats across platform
- Ability to view/export referral data

### 6. Notifications

- In-app toast notification when a referred user signs up (via realtime subscription or on next dashboard load)
- Integrate with existing notification system if present

### 7. Navigation

- Add "My Referral Circle" link to the dashboard's community section (in `DashboardPage.jsx` and `MyGardenPanel.tsx`)
- Add route in `App.tsx` as a protected route

---

### Files to Create
- `src/pages/MyReferralCirclePage.tsx` — main referral dashboard
- `src/components/referral/ReferralStats.tsx` — stats cards
- `src/components/referral/ReferralCircleList.tsx` — circle members
- `src/components/referral/ReferralShareTools.tsx` — QR code + share buttons
- `src/hooks/useReferralCapture.ts` — captures `?ref=` from URL, stores cookie, tracks click
- `supabase/functions/track-referral-click/index.ts` — click tracking edge function

### Files to Edit
- `src/pages/RegisterPage.jsx` — add referral code field + post-signup linking
- `src/components/auth/QuickRegistration.jsx` — same referral integration
- `src/hooks/useAuth.jsx` — pass referral code through registration flow
- `src/App.tsx` — add route + referral capture hook at top level
- `src/pages/DashboardPage.jsx` — add navigation link
- `src/components/MyGardenPanel.tsx` — add navigation link
- `src/components/admin/AdminDashboardPage.jsx` — add referral activity tab

### Database Migration
- Create `user_referrals` and `referral_circle` tables with RLS
- Create trigger for auto-code generation on profile creation
- Backfill codes for existing users

