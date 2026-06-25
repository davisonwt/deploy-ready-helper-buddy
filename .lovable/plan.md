# Payment Entry-Point Audit

Hard rule: only **NOWPayments** and **PayPal** are allowed. Everything else (Binance Pay, Cryptomus, Solana/USDC on-chain, Stripe) must be retired or migrated.

Status legend: **LIVE** = wired end-to-end and reachable. **PARTIAL** = code exists but flow is broken, gated, or short-circuited. **DEAD** = unreachable / no UI path / orphan.

No Stripe references remain in code. No Solana SPL transfer code remains except the wallet-balance display utilities.

---

## 1. Basket / cart checkout (products)

| Entry point | Component → function | Processors | Status |
|---|---|---|---|
| Product basket checkout | `BestowalCheckout.tsx` → `create-basket-bestowal-order` | NOWPayments **+** PayPal (provider chosen client-side, server routes) | **LIVE** (compliant) |
| Webhooks that finalize | `nowpayments-webhook`, `paypal-webhook` | NOWPayments, PayPal | **LIVE** (compliant) |

---

## 2. Single-seed / orchard bestowals

| Entry point | Caller | Processors | Status |
|---|---|---|---|
| QuickBestowModal (orchard quick-bestow) | `useNowPayments` + `usePaypal` | NOWPayments, PayPal | **LIVE** (compliant) |
| `EnhancedBestowalPayment.jsx` (orchard) | `process-usdc-transfer` edge fn | Solana / on-chain USDC | **PARTIAL/BROKEN** — non-compliant |
| `OrchardPaymentWidget.jsx` | (stale, BinancePayButton removed earlier today; needs re-verify) | was Binance | **DEAD-ish** — non-compliant |
| `CreateOrchardPage.jsx` / `EditOrchardPage.jsx` / `MyOrchardsPage.jsx` / `EnhancedOrchardForm.jsx` / `QuickOrchardCreator.jsx` | references to wallet/binance terminology | mixed | needs deeper read |

---

## 3. Community library + music (S2G Library)

| Entry point | Caller | Processors | Status |
|---|---|---|---|
| `S2GCommunityLibraryPage.tsx` | `create-binance-pay-order` **and** `complete-library-bestowal` | Binance Pay; library-bestowal is now 503 short-circuit | **PARTIAL/BROKEN** — non-compliant |
| `S2GCommunityMusicPage.tsx` | same pair | Binance Pay + 503 | **PARTIAL/BROKEN** — non-compliant |
| `MusicLibrary` track buy (`useMusicPurchase` → `purchase-music-track`) | direct insert flow with pending status; no processor verifier | none real | **PARTIAL** (no rail) |
| `AlbumBuilderCart.tsx` | direct inserts `pending` | none real | **PARTIAL** (no rail) |
| `useCryptoPay` used in `SowerProfile.tsx` (buy song) and `RadioSessions.tsx` (buy session) | on-chain USDC/Solana | Solana | **PARTIAL/BROKEN** — non-compliant |

---

## 4. Premium rooms & premium room media

| Entry point | Caller | Processors | Status |
|---|---|---|---|
| `RoomAccessModal.tsx` (join paid room) | placeholder "Binance Pay coming soon" toast | none | **DEAD/non-compliant placeholder** |
| `PremiumItemPurchaseModal.tsx` | placeholder Binance Pay UI | none | **DEAD/non-compliant placeholder** |
| `PremiumRoomMedia.tsx` & `live/media/PurchaseModal.tsx` | `purchase-media` edge fn | edge fn is now 503 short-circuit (fixed earlier today) | **DISABLED** |

---

## 5. Radio bestowals & live session bestowals

| Entry point | Caller | Processors | Status |
|---|---|---|---|
| `useRadioBestowal` | (needs read — likely NOWPayments/PayPal) | TBD | likely compliant |
| `useLiveBestowal` | (needs read) | TBD | likely compliant |
| `BestowalCoin.tsx` (chat) | `useCryptomusPay` → `create-cryptomus-payment` | Cryptomus | **LIVE** — non-compliant |
| `DonateModal.tsx` (chat) | refs Binance/Cryptomus | TBD | likely non-compliant |

---

## 6. Wallet top-ups

| Entry point | Caller | Processors | Status |
|---|---|---|---|
| `MyWalletPage.tsx` → `create-wallet-topup` | NOWPayments + PayPal | **LIVE** (compliant) |
| `useBinanceWallet` → `create-binance-wallet-topup` / `link-binance-wallet` / `refresh-binance-wallet-balance` / `sync-wallet-balance` | Binance Pay merchant + Binance wallet API | **LIVE** — non-compliant |
| `FiatOnRamp.jsx` (used by `VideoGifting.jsx` in `MarketingVideosGallery`) | Binance Pay checkout | Binance Pay | **LIVE** — non-compliant |
| `AdminPaymentDashboard.jsx`, `OrganizationWalletSetup.tsx`, `OrganizationWalletCredentials.tsx` | Binance wallet admin | Binance | **LIVE** — non-compliant |

---

## 7. Gifting / tipping / misc

| Entry point | Caller | Processors | Status |
|---|---|---|---|
| `VideoGifting.jsx` | imports `FiatOnRamp` (Binance), placeholder gift handler | Binance (UI only) | **PARTIAL** — non-compliant |
| `clubhouse/RoomCreationForm.jsx` | references payment | TBD | needs read |
| `FreeWillGiftingPage.jsx`, `TithingPage.jsx`, `SupportUsPage.jsx` | references | TBD | needs read |
| `LetItRainPanel.tsx`, `MyGardenPanel.tsx` | references | TBD | needs read |

---

## 8. Test / admin / debug pages

| Page | Processor | Status |
|---|---|---|
| `PaypalTestPage.tsx` | PayPal | LIVE (compliant, dev-only) |
| `NowPaymentsTestPage.tsx` | NOWPayments | LIVE (compliant, dev-only) |
| `BinancePayTestPage.tsx` | Binance Pay | LIVE — non-compliant |
| `AdminPayoutConfirmationsPage.tsx` → `nowpayments-verify-payout` | NOWPayments payouts | LIVE (compliant) |
| `PayoutSettingsPage.tsx` + `AddPaypalEmail.tsx` + `AddNowPaymentsWallet.tsx` | PayPal + NOWPayments payout methods | LIVE (compliant) |

---

## 9. Edge functions inventory by rail

**Allowed (NOWPayments / PayPal):**
- `create-nowpayments-invoice`, `nowpayments-webhook`, `nowpayments-payout`, `nowpayments-verify-payout`, `nowpayments-list-currencies`
- `create-paypal-order`, `paypal-webhook`, `paypal-payout`, `_shared/paypal/client.ts`, `_shared/payouts/paypal.ts`, `_shared/payouts/nowpayments.ts`
- `create-basket-bestowal-order` (routes to both), `create-wallet-topup` (routes to both)
- `distribute-bestowal` (rail-agnostic)
- `complete-library-bestowal` (503 short-circuit, safe)
- `purchase-media` (503 short-circuit, safe)
- `purchase-music-track` (insert-pending only, no rail attached)

**To retire (Binance Pay):**
- `create-binance-pay-order`
- `create-binance-wallet-topup`
- `link-binance-wallet`
- `refresh-binance-wallet-balance`
- `sync-wallet-balance`
- `binance-pay-webhook`
- `manual-update-balance` (Binance wallet helper)
- `_shared/binance.ts`, `_shared/walletConfig.ts` (Binance bits), `_shared/payouts/binance.ts`

**To retire (Cryptomus):**
- `create-cryptomus-payment`
- `cryptomus-webhook`
- `_shared/cryptomus.ts`

**To retire (Solana / on-chain USDC):**
- `process-usdc-transfer` (referenced from `EnhancedBestowalPayment.jsx`; confirm deploy state)
- `treasury-balances` if Solana-only (needs read)

**No Stripe edge functions remain.**

---

## 10. Hooks / lib to retire

- `src/hooks/useBinanceWallet.ts`
- `src/hooks/useCryptomusPay.tsx`
- `src/hooks/useCryptoPay.tsx` (Solana on-chain)
- `src/lib/cronos.ts` (chain integration)
- `src/components/FiatOnRamp.jsx`
- `src/components/wallet/BinanceWalletManager.tsx` (already removed earlier? verify)
- `src/components/admin/OrganizationWalletSetup.tsx` / `OrganizationWalletCredentials.tsx` (Binance halves)
- `src/components/AdminPaymentDashboard.jsx` (Binance halves)
- `src/pages/BinancePayTestPage.tsx`
- `src/pages/GosatWalletsPage.tsx`, `src/pages/GosatTreasuryPage.tsx` (if Binance/Cryptomus-only)

---

## 11. Non-compliant UI entry points (user-reachable today)

These are the surfaces a real user can hit RIGHT NOW that still call a banned rail:

1. `BestowalCoin.tsx` (chat tip) → Cryptomus
2. `EnhancedBestowalPayment.jsx` (orchard bestowal) → Solana/USDC on-chain
3. `SowerProfile.tsx` (buy song) → Solana via `useCryptoPay`
4. `RadioSessions.tsx` (buy session) → Solana via `useCryptoPay`
5. `S2GCommunityLibraryPage.tsx` → Binance Pay
6. `S2GCommunityMusicPage.tsx` → Binance Pay
7. `RoomAccessModal.tsx` paid room join → Binance Pay placeholder
8. `PremiumItemPurchaseModal.tsx` → Binance Pay placeholder
9. `MyWalletPage.tsx` top-up (Binance path alongside compliant rails) → Binance Pay option
10. `VideoGifting.jsx` / `FiatOnRamp.jsx` → Binance Pay
11. `BinancePayTestPage.tsx` → Binance Pay
12. `AdminPaymentDashboard.jsx` + `OrganizationWallet*` admin → Binance wallet admin
13. `DonateModal.tsx` chat → Binance/Cryptomus (needs deeper read)

---

## Items still needing a deeper read before any cleanup pass

- `useRadioBestowal.tsx`, `useLiveBestowal.ts`, `DonateModal.tsx`, `LetItRainPanel.tsx`, `MyGardenPanel.tsx`, `clubhouse/RoomCreationForm.jsx`, `FreeWillGiftingPage.jsx`, `TithingPage.jsx`, `SupportUsPage.jsx`, `treasury-balances`, `MyOrchardsPage.jsx`, `EditOrchardPage.jsx`, `CreateOrchardPage.jsx`, `EnhancedOrchardForm.jsx`, `OrchardPaymentWidget.jsx`, `QuickOrchardCreator.jsx`, `GosatTreasuryPage.tsx`, `GosatWalletsPage.tsx`.

Those references may be cosmetic (currency display, terminology) rather than active calls — confirm before adding to the kill list.

---

## Proposed next phase (NOT executed yet — read-only audit only)

When you greenlight, the cleanup order would be:

1. Re-route every numbered entry in §11 to the existing NOWPayments/PayPal pickers (same UX as `BestowalCheckout` / `MyWalletPage`).
2. Delete the orphaned hooks, components, pages, and edge functions in §9 / §10.
3. Drop the `_shared/binance.ts`, `_shared/cryptomus.ts`, Solana-only modules.
4. Re-run typecheck, security scan, publish.

Awaiting your go-ahead on this map before I touch anything.
