
## S2G Referral Circle System — IMPLEMENTED ✅

### What was built

1. **Database tables**: `user_referrals` (unique S2G-XXXXXXXX codes per user) and `referral_circle` (tracks referrer→referred relationships) with RLS policies
2. **Auto-generation trigger**: `trg_auto_create_user_referral` generates a code when any new profile is created; existing users were backfilled
3. **`process_referral` RPC**: Validates code, prevents self-referral, creates relationship, increments counter
4. **`track-referral-click` edge function**: Increments click counter when someone visits a referral link
5. **`useReferralCapture` hook + `ReferralCaptureProvider`**: Captures `?ref=CODE` from any URL, stores 30-day cookie, tracks click
6. **Signup integration**: Both `RegisterPage.jsx` and `QuickRegistration.jsx` have optional referral code field, auto-filled from cookie, processed after signup
7. **My Referral Circle page** (`/my-referral-circle`): Shows referral code, copy link, QR code, stats (clicks/signups/circle size), circle members list, referrer info, WhatsApp/Email/native share
8. **Navigation**: Added to Dashboard quick actions sub-links and MyGardenPanel community section
