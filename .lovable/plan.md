
## S2G Tribe (Referral) System — IMPLEMENTED ✅

### Brand Language
- **My S2G Tribe** = your referral group (people you invited)
- **Ripples** = activity/stories from tribe members
- **Send a Ripple** = inviting someone
- **New Ripple** = new member joining your tribe

### What was built

1. **Database tables**: `user_referrals` (unique S2G-XXXXXXXX codes per user) and `referral_circle` (tracks referrer→referred relationships) with RLS policies
2. **Auto-generation trigger**: `trg_auto_create_user_referral` generates a code when any new profile is created; existing users were backfilled
3. **`process_referral` RPC**: Validates code, prevents self-referral, creates relationship, increments counter
4. **`track-referral-click` edge function**: Increments click counter when someone visits a referral link
5. **`useReferralCapture` hook + `ReferralCaptureProvider`**: Captures `?ref=CODE` from any URL, stores 30-day cookie, tracks click
6. **Signup integration**: Both `RegisterPage.jsx` and `QuickRegistration.jsx` have optional referral code field, auto-filled from cookie, processed after signup
7. **My S2G Tribe page** (`/my-s2g-tribe`): Shows tribe invitation code, copy link, QR code, stats (ripples sent/new ripples/tribe size), tribe members list, referrer info, WhatsApp/Email/native share
8. **Navigation**: Added to Dashboard quick actions sub-links and MyGardenPanel community section
