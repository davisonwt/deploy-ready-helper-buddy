# Plan: Expose USDC / XRP / SOLANA as bestower crypto choices (all via NOWPayments)

## Goal

At checkout, a bestower picks **Crypto** or **PayPal (fiat)**. If they pick Crypto, they then choose one of three coins — **USDC on Solana (default)**, **XRP**, or **SOLANA (SOL)** — all routed through the existing NOWPayments invoice flow. The sower's payout wallet is resolved separately and is unaffected by the buyer's coin choice (NOWPayments converts).

No new edge functions, no new providers, no Stripe. This is a UI + config change on top of the existing `create-nowpayments-invoice` rail, which already accepts any NOWPayments `payCurrency`.

## Current state (verified)

- `src/lib/payments/providerFees.ts` — `PAYOUT_PROVIDERS` lists two top-level entries: `nowpayments` ("Crypto (USDC on Solana)") and `paypal`.
- `src/components/payments/ProviderPicker.tsx` — renders those two as a radio group; no crypto sub-selector.
- `src/components/bestow/QuickBestowModal.tsx` — hardcodes `payCurrency: 'usdcsol'` in the `createInvoice` call (line 75).
- `supabase/functions/create-nowpayments-invoice/index.ts` — passes `payload.payCurrency` straight to NOWPayments `/invoice` (line 156). Already currency-agnostic; no backend change needed.
- `src/hooks/useNowPayments.tsx` — `createInvoice(input)` forwards `payCurrency` as-is.

## Changes

### 1. `src/lib/payments/providerFees.ts`
- Add a `NOWPAYMENTS_PAY_CURRENCIES` constant mapping the three choices to NOWPayments pay-currency codes and display labels:
  - `usdcsol` → "USDC (Solana)" — default
  - `xrp` → "XRP"
  - `sol` → "SOLANA (Solana)"
- Add an optional `payCurrency` field to the `nowpayments` provider info (default `usdcsol`) so the fee preview stays accurate (crypto fee range is the same for all three).

### 2. `src/components/payments/ProviderPicker.tsx`
- When the selected provider is `nowpayments`, render a secondary row of three pill buttons (USDC / XRP / SOLANA) below the crypto radio card.
- New optional prop `payCurrency` + `onPayCurrencyChange` so the parent owns the selection.
- Default to `usdcsol`. Selecting a pill keeps the crypto radio selected and updates the chosen coin.

### 3. `src/components/bestow/QuickBestowModal.tsx`
- Add `payCurrency` state (default `'usdcsol'`).
- Pass `payCurrency` + `onPayCurrencyChange` to `ProviderPicker`.
- Use `payCurrency` instead of the hardcoded `'usdcsol'` in the `createInvoice` call (line 75).
- Reset `payCurrency` to `'usdcsol'` in the existing `useEffect` on `open`.

### 4. Other call sites of `createInvoice` / `useNowPayments`
- Audit `useGiftBestowal.ts` and `useLiveBestowal.ts` (both call the gift-bestowal edge function, not `createInvoice` directly). They already accept a `payCurrency` prop and default it; no change required unless they also hardcode a currency — confirm during implementation and only touch if needed (scope-locked to the crypto-choice feature).

## Out of scope
- PayPal flow — unchanged.
- Payout side (sower receiving) — unchanged; `resolveSowerPayout` and NOWPayments Mass Payouts stay as-is.
- Self-custody Solana/XRP payout edge functions — remain dormant fallback.
- No database migration, no new secrets, no new edge functions.

## Verification
- Build passes.
- Open a seed's Bestow modal: Crypto card shows three coin pills (USDC selected by default); PayPal card unchanged.
- Selecting XRP then confirming invokes `create-nowpayments-invoice` with `payCurrency: 'xrp'`; same for `sol`.
- Fee preview updates only by amount (crypto fee range is identical across the three coins).
