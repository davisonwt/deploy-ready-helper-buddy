# Vercel environment variables

Every `VITE_*` variable the build actually reads (`import.meta.env.VITE_*`, grepped across `src/`, not assumed). No secret values in this file — names and where to copy each one from.

## Required

| Variable | Where to get it | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → the project → **Project Settings → API** → "Project URL" | Has a hardcoded fallback in `src/integrations/supabase/client.ts` (the current production project's URL) — the app still runs if this is unset, but set it explicitly so a future project/environment change doesn't silently point at the wrong backend. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase dashboard → **Project Settings → API** → "Project API keys" → the publishable/anon key (older dashboards label it "anon public") | Same fallback caveat as above — also has a hardcoded fallback. `VITE_SUPABASE_ANON_KEY` is accepted as an alternate name for this same value (legacy alias, checked first as `PUBLISHABLE_KEY`, falls back to `ANON_KEY`) — set one, not both. |
| `VITE_SUPABASE_PROJECT_ID` | The project ref — the subdomain segment of the Project URL (e.g. the `xxxxx` in `https://xxxxx.supabase.co`), also shown at **Project Settings → General** → "Reference ID" | **No fallback exists for this one** (`src/pages/BulkUploadWizardPage.tsx`'s bulk-parse-products call breaks without it — the URL becomes `https://undefined.supabase.co/...`). Must be set. |

## Optional (internal feature flags — not copied from any external dashboard)

| Variable | Purpose | Default if unset |
|---|---|---|
| `VITE_REQUIRE_VERIFICATION` | Gates `RequireVerification` — set to `"true"` to require the verification flow before certain pages | Unset/anything else = verification not required |
| `VITE_VERIFICATION_REDIRECT` | Path to send an unverified member to (only read when the flag above is `"true"`) | `/chatapp` |
| `VITE_S2G_BALANCE_ENABLED` | Feature flag for the S2G balance display — set to `"true"` to enable | Unset/anything else = disabled |

## What's deliberately NOT here

- **No Paystack key.** Checkout is entirely server-initiated — the `paystack-initialize` edge function returns a Paystack-hosted `authorization_url` the client just redirects to. There is no client-embedded Paystack public key anywhere in this codebase to set.
- **No PayPal client ID as a `VITE_*` var.** Same shape — order creation and capture happen in edge functions (`create-paypal-order`, `create-booking-paypal-order`, etc.); the client only ever receives a redirect URL.
- **Supabase service-role key, Paystack secret key, PayPal secret, Resend API key, Daily.co API key**, etc. — all Supabase Edge Function secrets (`supabase secrets set ...` / Supabase dashboard → **Edge Functions → Secrets**), a completely separate system from Vercel's build-time env vars. Nothing here needs to move to Vercel; the edge functions keep running on Supabase regardless of where the frontend is hosted.

## Where to set these in Vercel

Project → **Settings → Environment Variables**. Set for all three environments (Production, Preview, Development) unless you specifically want a Preview deploy pointed at a different Supabase project.
