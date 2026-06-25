## 1. PayPal webhook URL

Set this in PayPal Developer Dashboard → Webhooks for your live app:

```
https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/paypal-webhook
```

After PayPal creates the subscription, copy the resulting **Webhook ID** and store it as the `PAYPAL_WEBHOOK_ID` secret (it's required for signature verification in `supabase/functions/_shared/paypal/client.ts`).

## 2. PayPal secrets status

Current state of PayPal-related secrets:

| Secret | Status |
|---|---|
| `PAYPAL_CLIENT_ID` | ✅ Present |
| `PAYPAL_CLIENT_SECRET` | ✅ Present |
| `PAYPAL_ENV` | ❌ **Still missing** (code defaults to `sandbox`) |
| `PAYPAL_WEBHOOK_ID` | ❌ **Still missing** (webhook verification will fail) |
| `PAYPAL_PAYOUTS_ENABLED` | ❌ **Still missing** (`paypal-payout` will refuse to dispatch) |

The secrets tool does not expose last-updated timestamps, so I can't tell from here whether `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` were rotated recently. To verify live credentials are actually in place, the only reliable check is to set `PAYPAL_ENV=live` and call a small live endpoint (e.g. `paypalFetch('/v1/identity/oauth2/userinfo?schema=paypalv1.1', { method: 'GET' })` from a debug edge function) — happy to wire a tiny one-shot diagnostic if you want.

To finish PayPal setup, add (via Project Settings → Secrets):
- `PAYPAL_ENV` = `live` (or `sandbox`)
- `PAYPAL_WEBHOOK_ID` = (value from PayPal after creating the webhook subscription above)
- `PAYPAL_PAYOUTS_ENABLED` = `true`

## 3. Stripe / Cryptomus / Binance / Solana / VAPID audit — finished

| Subsystem | Verdict |
|---|---|
| **Stripe** | ❌ DEAD — edge function `create-stripe-payment` never invoked from `src/`; the "Card" tab in `PurchaseModal` is static placeholder text with no `onClick`. Safe to remove. |
| **Cryptomus** | ⚠️ PARTIALLY WIRED — `BestowalCoin` → `useCryptomusPay` → `create-cryptomus-payment` → `cryptomus-webhook` is fully live in chat/bestow flows. Only `CryptomusPayButton.tsx` is orphaned. **Do NOT remove the rail.** |
| **Binance Pay** (payment provider) | ⚠️ PARTIALLY WIRED — `BinancePayTestPage` (`/binance-pay-test`) + `binance-pay-webhook` are live. `BinancePayButton`/`useBinancePay` are orphaned. `PremiumItemPurchaseModal`, `RoomAccessModal`, `DonateModal` contain "Binance Pay integration coming soon" TODO stubs. |
| **Binance Wallet Balance** (different concern) | ✅ LIVE — `/wallet-settings`, `/gosat/wallets`, `OrganizationWalletSetup`, `useBinanceWallet`, `refresh-binance-wallet-balance` all actively used. **Do not touch.** |
| **Solana** | ❌ DEAD — zero `@solana/*` deps installed; no `SolanaProvider`, `TransactionTracker`, `EnhancedPaymentWidget`, or Phantom/Solflare code exists. The `UsdcPayment` component is a Binance Pay wrapper, not Solana. `process-usdc-transfer` edge function is self-disabled (returns HTTP 410). The only Solana mention is the string `"USDC-SOL"` as a NOWPayments payout currency label. Safe to remove (just `process-usdc-transfer` + the `README-PAYMENT-SYSTEM.md` claims). |
| **VAPID / Web Push** | ⚠️ LEGITIMATE WEB-PUSH INFRA — **not payment-related**. Client-side subscription, service worker, `NotificationBanner`, and Realtime → toast path are all live globally for every authenticated user. Only the server-side push dispatch in `send-notification/index.ts` is a `console.log` stub (no `web-push` npm package installed; the VAPID public key in `pushNotifications.ts:96` is the demo placeholder). **Do NOT remove.** This needs finishing, not deleting. |

## Proposed Phase 2 — removal plan (awaiting approval)

Only removing things that are unambiguously dead. Per your scope-lock and checkpoint rules, listing exact changes before touching anything:

**A. Stripe (full removal)**
- Delete `supabase/functions/create-stripe-payment/index.ts` (+ call `supabase--delete_edge_functions(["create-stripe-payment"])`)
- Edit `src/components/live/media/PurchaseModal.tsx` — remove the `"stripe"` tab and its `TabsContent` block (leaving the rest of the modal intact)
- Edit `src/utils/inputSanitization.ts` — remove `js.stripe.com` and `checkout.stripe.com` from CSP `script-src` / `frame-src` allowlists
- Edit `.env.example` — remove `STRIPE_SECRET_KEY`
- **NOT touching**: `src/integrations/supabase/types.ts` (auto-generated), DB columns `stripe_*` (would need a migration — flagging only, not doing)

**B. Solana (full removal)**
- Delete `supabase/functions/process-usdc-transfer/index.ts` (+ delete deployed function)
- Delete `src/README-PAYMENT-SYSTEM.md` (the entire doc is about a Solana payment system that does not exist in the code)
- **NOT touching**: the string `"USDC-SOL"` in `AddNowPaymentsWallet.tsx` (that's a real NOWPayments payout rail, not Solana code)

**C. Orphaned payment buttons (safe deletions, no UI impact)**
- Delete `src/components/payment/CryptomusPayButton.tsx` (zero importers)
- Delete `src/components/payment/BinancePayButton.tsx` (zero importers)
- Delete `src/hooks/useBinancePay.tsx` (only used by the orphaned `BinancePayButton`)

**D. Flagging — NOT removing without your explicit go-ahead**
- The "Binance Pay coming soon" TODO stubs in `PremiumItemPurchaseModal.tsx`, `RoomAccessModal.tsx`, `DonateModal.tsx` — these are user-visible placeholder UI. Leave them, or replace with another rail?
- `BinancePayTestPage` (`/binance-pay-test`) — works, but is a dev test page exposed to any logged-in user. Keep, gate to admins, or delete?
- The orphaned `NotificationSettings` component (zero importers) — keep for future use, or delete?
- VAPID server-side push is half-built. Finish (install `web-push`, real dispatch, real VAPID key) or accept the client-only path?
- DB columns `stripe_connect_account_id`, `stripe_payment_intent_id`, `stripe_transaction_id` — would need a migration to drop. Leave alone unless you say so.

**E. Verification after each removal**
- After A: ensure project still typechecks/builds.
- After B: ensure project still typechecks/builds.
- After C: ensure project still typechecks/builds.

Approve and I'll execute A + B + C only. D items will only happen if you say which ones.