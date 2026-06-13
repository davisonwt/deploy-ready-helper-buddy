# Private Onboarding & Security-Questions Gate

Replace email/phone verification with a mandatory in-app security-questions setup. Until completed, the user can only access the 1-on-1 ChatApp.

## 1. Database (Supabase migration)

- Add `profiles.security_setup_complete boolean not null default false`.
- Add `profiles.failed_recovery_attempts int not null default 0` and `recovery_locked_until timestamptz`.
- Reuse existing `user_security_questions` table (already present, 10 cols, 3 policies). Verify columns; if missing, add: `user_id uuid`, `question_key text`, `answer_hash text`, `created_at`. Hash answers with `crypt()` (pgcrypto) — never store plaintext.
- RPC `public.set_security_questions(questions jsonb)` — security definer, hashes each answer with `crypt(answer, gen_salt('bf'))`, inserts 3+ rows for `auth.uid()`, sets `security_setup_complete = true`. Requires `>= 3` entries.
- RPC `public.verify_security_answers(p_email text, p_answers jsonb)` — checks hashes for the user matching `p_email`, increments `failed_recovery_attempts`, locks for 30 min after 3 fails. Returns a short-lived recovery token (stored in `password_reset_requests`).

## 2. Registration changes

- `QuickRegistration.jsx` and `RegisterPage.jsx`: remove any email-verification messaging; immediately sign user in (already does). Do NOT call `send-welcome-email`. Remove any phone-number fields if present.
- After signup success, navigate to `/onboarding/security` instead of `/`.

## 3. Route gate

New component `src/components/auth/RequireSecuritySetup.tsx`:
- If `loading` → spinner.
- If not authenticated → render children (ProtectedRoute handles redirect).
- Fetch `profiles.security_setup_complete` for `auth.uid()`.
- If `false` and current path is not `/onboarding/security` or `/chatapp` (1-on-1 only) → `<Navigate to="/onboarding/security" replace />`.
- If `true` → render children.

Wrap every protected route in `src/App.tsx` with `RequireSecuritySetup` (compose inside `ProtectedRoute` for simplicity — add an `enforceSecuritySetup` default-true prop).

## 4. Onboarding screen

`src/pages/OnboardingSecurityPage.tsx`:
- Fullscreen, non-dismissable.
- Explanatory copy about in-house comms / no phone/email sharing.
- List of 7 canonical questions (keys + labels). User picks 3 distinct, answers each (min 2 chars, trimmed, lowercased before hashing client-side? No — send plaintext over HTTPS to RPC, hash server-side with bcrypt).
- Submit → call `set_security_questions` RPC → on success invalidate profile cache → redirect `/dashboard`.

## 5. ChatApp onboarding banner

In the 1-on-1 ChatApp page, if `security_setup_complete = false`, show a top banner linking to `/onboarding/security`. User can chat but nothing else.

## 6. Password recovery

`src/pages/ForgotPasswordPage.tsx` (replace or add):
- Step 1: enter email.
- Step 2: fetch chosen question keys (RPC `get_security_questions_for_email`), prompt answers.
- Step 3: on success use returned recovery token + new password → RPC `complete_password_reset(token, new_password)` which calls `auth.admin.update_user_by_id` from an edge function `reset-password-via-questions` (service role).
- After 3 fails → show "Account locked. Contact support via in-app ChatApp."

Edge function `reset-password-via-questions` (verify_jwt = false): validates token from `password_reset_requests`, updates password using service role.

## 7. Disable welcome email

- Remove invocation of `send-welcome-email` from signup paths (search & strip).
- Leave the function file in place (no-op) to avoid breaking other callers.

## 8. Files touched

- new: `supabase/migrations/<ts>_security_setup.sql`
- new: `supabase/functions/reset-password-via-questions/index.ts`
- new: `src/pages/OnboardingSecurityPage.tsx`
- new: `src/pages/ForgotPasswordPage.tsx` (or update existing)
- new: `src/components/auth/RequireSecuritySetup.tsx`
- new: `src/lib/securityQuestions.ts` (canonical question list)
- edit: `src/App.tsx` (routes + gate wrapping)
- edit: `src/components/ProtectedRoute.jsx` (compose security gate)
- edit: `src/components/auth/QuickRegistration.jsx` (redirect to onboarding, drop welcome email + any phone field)
- edit: `src/pages/RegisterPage.jsx` (same)
- edit: ChatApp page (banner when not complete)

## 9. Out of scope (will not touch)

- Existing `is_chatapp_verified` flow stays as-is unless it conflicts; we gate on the new `security_setup_complete` field instead. `RequireVerification` left in place but bypassed by feature flag if already disabled.
- No phone number field is added; if any exists I will only remove from registration UI, not drop DB columns.

Confirm and I'll implement in this order: migration → gate component → onboarding page → register redirects → password recovery → app route wiring.
