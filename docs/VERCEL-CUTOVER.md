# Vercel cutover checklist

Ordered — do these in sequence. Domain stays `sow2growapp.com` throughout (DNS moves, the name doesn't), so most third-party dashboard config turns out **not** to need changing — see the evidence in step 4 before assuming otherwise.

## 1. Vercel import

- [ ] New Vercel project → Import Git Repository → `davisonwt/deploy-ready-helper-buddy`
- [ ] Branch: `ruflo-integration` (not `main` — this is where the live work has been happening)
- [ ] Framework preset: Vite (auto-detected; `vercel.json` in this repo also pins it explicitly)
- [ ] Build command / output directory: read from `vercel.json` (`npm run build` / `dist`) — don't override in the Vercel UI
- [ ] Do **not** connect this Vercel project to auto-deploy on every push yet if Lovable is also auto-deploying from the same branch — decide explicitly whether both run in parallel during testing (recommended) or Vercel deploys are triggered manually until cutover

## 2. Environment variables

- [ ] Set every variable listed in `docs/VERCEL-ENV.md` under Vercel project → Settings → Environment Variables
- [ ] At minimum set for Preview + Production; Development only if you'll run `vercel dev` locally
- [ ] Double check `VITE_SUPABASE_PROJECT_ID` specifically — it has no fallback in code and one real call site breaks without it (see the doc)

## 3. Test on the `*.vercel.app` URL

- [ ] Smoke-test the golden path: sign in, land on the Cockpit/stall, browse, open a hotspot sheet
- [ ] **Known gap before you start** — two edge functions hardcode a CORS origin allowlist that does **not** include `*.vercel.app`, so calls to them will fail with a browser CORS error on the preview URL specifically (works fine once DNS is actually on `sow2growapp.com`, and works fine locally where the same allowlists include `localhost`):
  - `supabase/functions/_shared/security.ts` (`getSecureCorsHeaders`) — used by `create-eft-payment`
  - `supabase/functions/verify-chatapp/index.ts` — its own separate allowlist, no localhost entry either
  - Fix for testing: temporarily add your specific `https://<project>.vercel.app` preview URL to both files' `allowedOrigins` arrays, deploy, test, then decide whether to leave it (harmless if left — see step 4) or remove it before the real cutover
- [ ] Everything else payment-related (Paystack, PayPal, NOWPayments, wallet top-up, content/orchard/gift bestowals) needs **no** code change to work on the preview URL — every one of those edge functions receives `redirectBaseUrl: window.location.origin` from the client already (`src/hooks/useGiftBestowal.ts`, `useContentPurchase.ts`, `usePaypal.tsx`, `BestowalCheckout.tsx`, `MyWalletPage.tsx`, and others — checked directly, not assumed), so the post-payment redirect lands back on whatever origin initiated it, `*.vercel.app` included
- [ ] Test a real card/EFT/PayPal checkout on the preview URL if you want end-to-end payment confidence before DNS cutover (Paystack and PayPal both receive a per-transaction callback/return URL from the request itself, not a dashboard-configured static one — see step 4, item 2)
- [ ] Test a Daily.co video call (1:1 call, live room) — token minting is server-side with no domain restriction in code; if it fails, the restriction is in Daily's own dashboard, not this codebase (see step 4, item 4)

## 4. Everywhere `sow2growapp.com` is registered — verify or update

Grepped across `src/`, `supabase/functions/`, and `supabase/migrations/` directly — this list is evidence-based, not assumed.

### Needs a real decision about whether to change

| Where | What it does | Action |
|---|---|---|
| `supabase/functions/_shared/security.ts` (`allowedOrigins`) | Strict CORS allowlist: `sow2growapp.com`, `www.sow2growapp.com`, `app.sow2grow.com`, `localhost:5173`/`3000`, plus a `*.lovable.app`/`*.lovable.dev` pattern | Domain doesn't change (still `sow2growapp.com`), so **no change needed for the final cutover** — only add `*.vercel.app` temporarily if testing `create-eft-payment` pre-DNS (step 3) |
| `supabase/functions/verify-chatapp/index.ts` (`allowedOrigins`) | Same shape, own separate list: `sow2growapp.com`, `www.sow2growapp.com`, `app.sow2grow.com` — no localhost, no Lovable pattern | Same conclusion — no change for cutover itself, temporary addition only if testing this function pre-DNS |
| `supabase/functions/send-auth-email/index.ts` (`ALLOWED_HOSTS`) | Validates the `site_url`/`redirect_to` a Supabase Auth email (confirmation, magic link, password reset) is allowed to point at: `sow2grow.online`, `sow2growapp.com`, `www.sow2growapp.com`, `sow2growapp.lovable.app`, plus any `*.lovable.app`/`*.lovable.dev` | No change needed — domain unchanged. Only relevant if you send a real auth email while testing on the raw `*.vercel.app` URL pre-DNS (the link in the email would point at `sow2growapp.com`, not the preview URL, since that's the fallback — expected, not a bug) |
| `supabase/functions/send-notification/index.ts` (`sanitizeActionUrl`'s regex) | Allows push-notification deep-link URLs on `sow2grow.online`, `sow2growapp.com`, `lovable.app`, `lovable.dev` | No change needed — domain unchanged |

**Bottom line: because the plan is DNS-only (same domain, new host), none of the four hardcoded allowlists above actually need a permanent code change.** They only matter during step 3's pre-DNS testing window.

### Verify only, dashboard-side, unrelated to this move

| Service | What's actually registered | Why it's unaffected |
|---|---|---|
| **Paystack** | The Paystack dashboard has your API keys but — checked directly — **no static callback/webhook URL pointing at the frontend**. `_shared/paystack/initialize.ts` sends a per-transaction `callback_url` built from the request's own `redirectBaseUrl` (`${redirectBase}/pay/paystack/return`) | Nothing to update. Still verify: the Paystack **webhook** (`paystack-webhook` function, server-to-server) is configured in Paystack's dashboard pointing at the Supabase function URL directly (`https://<project>.supabase.co/functions/v1/paystack-webhook`), not at `sow2growapp.com` — confirm it's still correct, but it was never domain-dependent |
| **PayPal** | Same shape: `create-paypal-order`/`create-booking-paypal-order` build `return_url`/`cancel_url` from the request's `redirectBaseUrl`, not a stored value | Nothing to update for checkout. The `paypal-webhook` function (payment capture confirmation) is registered in PayPal's Developer Dashboard pointing at the Supabase function URL — verify it's still correct, unaffected by the frontend move. **Exception**: `paypal-connect` (a sower connecting their own PayPal account) takes a client-supplied `redirect_uri` with no fallback — if PayPal's OAuth app config on their dashboard pre-registers allowed redirect URIs (standard OAuth practice), confirm `sow2growapp.com`'s relevant path is still on that allowlist |
| **Daily.co** (video calls) | No domain/origin restriction found anywhere in this codebase — `create-daily-meeting-token` mints a token server-side with Daily's API key; the client only ever gets a room URL + token | If Daily's own dashboard has an "allowed domains" setting for embedding, verify `sow2growapp.com` is still on it — but that's a dashboard check, not a code dependency |
| **Supabase Auth** | Dashboard → Authentication → URL Configuration → Site URL / Redirect URLs | No `redirectTo`/`emailRedirectTo` calls with a literal domain were found in `src/` (grepped directly) — but Supabase's own dashboard config always needs the serving domain listed for auth emails to link back correctly. Since the domain doesn't change, **verify it already lists `sow2growapp.com`** rather than assuming a change is needed |

### CSP / frontend

- [ ] `index.html`'s CSP meta tag and `vercel.json`'s CSP header (identical, verified byte-for-byte) both already scope to `'self'` plus the real third-party origins (Stripe, Supabase, Lovable, Daily.co) — no `sow2growapp.com`-specific entry to update, since `'self'` covers whatever domain serves the page

## 5. DNS change

- [ ] Add `sow2growapp.com` (and `www.sow2growapp.com` if served) as a custom domain on the Vercel project first — Vercel will show the required DNS records (typically an `A`/`ALIAS` record to Vercel's IP, or a `CNAME` for `www`)
- [ ] Lower the DNS TTL on the existing record(s) ahead of time if it's currently high, so the eventual cutover propagates fast
- [ ] Point DNS at Vercel's provided records
- [ ] Watch propagation (`dig sow2growapp.com`, or Vercel's own domain status page) until Vercel reports the domain as verified/active with a valid SSL cert issued

## 6. Stall invite link previews (WhatsApp/Facebook/iMessage)

Built alongside this doc, not a step to perform -- documented here because it's Vercel-specific plumbing (`api/stall.ts` + `vercel.json`) that only works once this repo is actually served BY Vercel, same as everything else in this checklist.

**The problem**: this app is a pure SPA -- `/stall/<username>` always serves the same `index.html`, so a crawler (WhatsApp, Facebook, iMessage, Slack, Twitter, ...) scraping Open Graph tags for a link preview only ever sees the app's generic, stall-agnostic title -- never the real stall name or front photo.

**The fix**: `vercel.json`'s `rewrites` array has a new FIRST entry (evaluated before the catch-all SPA rewrite, which stays last and unchanged): `/stall/:username` rewrites to the new `api/stall.ts` serverless function, but ONLY when the request's `User-Agent` header matches a known crawler pattern (`has: [{ type: "header", key: "user-agent", value: "...facebookexternalhit|Twitterbot|WhatsApp|..." }]`). A real browser's request never matches that condition, so it falls through to the existing catch-all and gets the normal SPA exactly as before -- **this changes nothing about how a real visitor experiences `/stall/:username`**.

`api/stall.ts` does the same public, anon-readable lookup `StallVisitPage.tsx` already does (`get_stall_owner_id_by_username` RPC, then a `stalls` select scoped to `published = true`) via plain `fetch()` against Supabase's REST/RPC endpoints directly -- no supabase-js import (that client reads Vite's `import.meta.env` and sets up browser-only auth persistence, neither of which apply in this isolated serverless runtime). It returns a minimal HTML page with real `og:title`/`og:description`/`og:image`/`twitter:card` tags (stall name, tagline or "A stall on Sow2Grow", `front_image_path`) plus a `<meta http-equiv="refresh">` back to the real app URL (including `?ref=` if present), for the rare crawler that does follow it. An unresolvable/unpublished username falls back to generic Sow2Grow tags rather than erroring.

- [ ] After the Vercel cutover, verify: `curl -A "facebookexternalhit/1.1" https://sow2growapp.com/stall/<a real published username>` returns the OG HTML (not the SPA's `index.html`) with a real `og:image` URL
- [ ] Verify a real browser still gets the normal app: `curl -A "Mozilla/5.0" https://sow2growapp.com/stall/<username>` returns `index.html` (the rewrite's `has` condition correctly excludes it)
- [ ] Optional real-world check: paste a stall link into WhatsApp/iMessage/a Slack channel and confirm the preview card shows the stall's name and front photo

## 7. Rollback plan

- [ ] Keep the Lovable deployment untouched and running throughout (this whole task was written under "Keep Lovable untouched" — nothing in `vercel.json` or the doc changes touches Lovable's own build/deploy path)
- [ ] If anything breaks post-DNS-cutover: point DNS back at Lovable's original records (keep a copy of the pre-cutover DNS record values before changing anything in step 5)
- [ ] Because the domain never changed hosts-wise in the app's own config (no code assumed "now on Vercel" anywhere), rolling DNS back is the entire rollback — no code revert, no edge function redeploy, no dashboard un-registration needed
