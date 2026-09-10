# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/f76da68e-977d-42e6-85f3-ea2df1aea0df

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/f76da68e-977d-42e6-85f3-ea2df1aea0df) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/f76da68e-977d-42e6-85f3-ea2df1aea0df) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Payment Gateway Integration

This project supports multiple payment gateways:

### Cryptomus Payment Gateway (Recommended)

Cryptomus is the preferred payment gateway for cryptocurrency payments with support for multiple currencies and networks.

- **Quick Start**: See `CRYPTOMUS_QUICK_START.md`
- **DNS Setup**: See `CRYPTOMUS_DNS_SETUP.md`
- **Full Guide**: See `CRYPTOMUS_INTEGRATION.md`

**Features:**
- Multiple cryptocurrencies (USDC, USDT, BTC, ETH, etc.)
- Multiple networks (TRC20, ERC20, BEP20, etc.)
- Wallet-to-wallet payments
- Automatic payment confirmation via webhooks
- Low transaction fees (especially TRC20)

### Paystack Payment Gateway (cards + EFT, pay-in only)

Paystack is the third pay-in rail alongside PayPal and direct USDC (Solana), for members who want to pay by card (Visa/Mastercard/Amex) or instant EFT (via Ozow) rather than a wallet or PayPal account. **Pay-in only** — sower/member payouts stay on PayPal and USDC exclusively; nothing in this rail sends money out.

- **Edge functions**:
  - `paystack-initialize` — starts a Paystack payment attempt against a public invoice (guest, `public_token`, no session — same shape as `create-invoice-payment`'s solana/paypal branches). Converts the invoice's USD `amount_due` to ZAR at the stored `exchange_rates` rate, calls Paystack's `/transaction/initialize` with `channels: ['card', 'eft']`, and returns `authorization_url`.
  - `paystack-webhook` — verifies `x-paystack-signature` locally (HMAC-SHA512 keyed with `PAYSTACK_SECRET_KEY`, no round trip to Paystack needed), handles `charge.success` idempotently via `processed_webhooks`, and runs the same provider-agnostic `finalizeCompletedOrder()` every PayPal-funded order kind uses — identical 15% platform-fee split, identical `revenue_ledger` writes. Also records `charge.dispute.create` events to `paystack_disputes` for GoSat to review chargebacks.
  - `paystack-verify` — optional recovery call for the `/pay/paystack/return` page: calls `GET /transaction/verify/:reference` and finalizes if Paystack confirms success but the webhook hasn't landed yet (mirrors `capture-paypal-order`'s role for PayPal).
  - Orchard and gift bestowals (`create-orchard-bestowal-order`, `create-gift-bestowal-order`) each gained a `provider: "paystack"` branch inline, calling the same shared `_shared/paystack/initialize.ts` module `paystack-initialize` uses — every surface talks to Paystack through identical code.
- **Environment variables** (set in Supabase Edge Function config):
  - `PAYSTACK_SECRET_KEY` — required. `sk_test_...` selects sandbox mode, `sk_live_...` selects live mode; Paystack has no separate sandbox host, unlike PayPal.
  - `PAYSTACK_PUBLIC_KEY` — not currently required. Every checkout path uses Paystack's hosted redirect (`authorization_url`), the same pattern as PayPal's `approveUrl` — the client never talks to Paystack directly, so there's no inline-popup flow needing a public key on the frontend. Add `VITE_PAYSTACK_PUBLIC_KEY` only if a future change adds Paystack's inline JS checkout instead.
  - Optional fee-tuning overrides: `PAYSTACK_FEE_PCT` (default `0.029`), `PAYSTACK_FEE_FIXED` (default `0.055`, a USD-equivalent approximation of Paystack's ~R1 flat card fee — the buyer-facing estimate shown before conversion, not Paystack's own after-the-fact ZAR fee).
- **Webhook URL**: `https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/paystack-webhook` (`verify_jwt = false` in `supabase/config.toml` — Paystack calls it unauthenticated; the HMAC signature is the auth).
- **Checkout return URL**: `/pay/paystack/return` (registered as the callback URL in the Paystack dashboard, and passed per-transaction too). Shows a confirmation state and calls `paystack-verify` as a recovery step; the webhook is still the authoritative finalizer.
- **Database**: `paystack_transactions` (one row per `/transaction/initialize` call: `reference`, `status`, `amount_usd`/`amount_zar`/`fx_rate`, `raw_payload`) and `paystack_disputes` (chargebacks, for GoSat). Migration: `supabase/migrations/20260910190000_paystack_rail.sql`.
- **Fee model**: identical to every other rail — the buyer pays Paystack's processor fee on top of the S2G 15% platform fee; the sower/member always receives 100% of the base amount they set.

### Binance Pay Integration (Legacy)

This project includes a full Binance Pay payment flow with automatic bestowal distribution.

- **Edge functions**:
  - `create-binance-pay-order` – creates a Binance Pay order, persists the bestowal, and returns the hosted checkout URL.
  - `binance-pay-webhook` – verifies Binance signatures, confirms payments, and triggers wallet distribution.
  - `distribute-bestowal` – reusable distribution handler that transfers funds based on the stored bestowal map.
  - `link-binance-wallet` – lets sowers/bestowers register their Binance Pay ID in `user_wallets`.
  - `refresh-binance-wallet-balance` – fetches live Binance balances (supports organization wallets such as `s2gdavison`).
  - `create-binance-wallet-topup` – generates hosted checkout links for in-app top-ups.
- **Environment variables** (set in Supabase Edge Function config):
  - `BINANCE_PAY_API_KEY`
  - `BINANCE_PAY_API_SECRET`
  - `BINANCE_PAY_MERCHANT_ID`
  - Optional: `BINANCE_PAY_API_BASE_URL`, `BINANCE_PAY_TRADE_TYPE`, `BESTOWAL_TITHING_PERCENT`, `BESTOWAL_GROWER_PERCENT`, `PUBLIC_SITE_URL`, `VITE_ORGANIZATION_SOWER_WALLET_NAME`
- **Webhook URL**: configure Binance Pay to post to  
  `https://<your-supabase-project>.functions.supabase.co/binance-pay-webhook`
- **UI flow**: the Binance Pay button now invokes the edge function and opens the official checkout experience. The success page informs users that confirmation happens automatically via webhook.
- **Distribution rules**:
  - *Standard orchards* – payments settle in `s2gholding` until a Gosat releases them through the manual distribution queue.
  - *Full value orchards with courier* – follow the same holding pattern until delivery is confirmed.
  - *Full value orchards without courier* and *Sow2Grow community products* – funds are distributed instantly to the sower, product whispers (when applicable), and `s2gbestow`.
  - Every confirmed bestowal generates a proof message delivered to the bestower’s 1-on-1 chat with a Gosat.
- **Wallet experience**:
  - The dashboard and wallet settings show only the signed-in user’s personal Binance Pay balance, with a guided link flow for connecting a Pay ID.
  - Admins/Gosats can top up or inspect organization wallets via the wallet manager and the manual distribution queue (`Wallet Settings → Pending Manual Distributions`).
  - Attempting a bestowal with insufficient personal balance opens an in-app prompt directing the user to top up first.

Ensure the `organization_wallets` table has active records for `s2gholding`, `s2gbestow`, and (optionally) `s2gdavison`, and each sower has an active Binance Pay wallet in `user_wallets` for payouts.
