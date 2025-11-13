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

## Binance Pay Integration

This project now includes a full Binance Pay payment flow with automatic bestowal distribution.

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
