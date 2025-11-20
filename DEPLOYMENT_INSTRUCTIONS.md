# Deployment Instructions - Balance & Payment Fixes

## ⚠️ Important: Changes Need to Be Deployed

The changes we made are currently **only in your local code**. They will **NOT automatically** appear in your live environment until you deploy them.

---

## What Needs to Be Deployed

### 1. ✅ Edge Functions (Backend)
These are the server-side functions that run on Supabase:

**Files Changed**:
- `supabase/functions/refresh-binance-wallet-balance/index.ts` ✅
- `supabase/functions/create-binance-pay-order/index.ts` ✅
- `supabase/functions/sync-wallet-balance/index.ts` ✅ (NEW)

**How to Deploy**:
```bash
# Option 1: Deploy all functions
supabase functions deploy

# Option 2: Deploy specific functions
supabase functions deploy refresh-binance-wallet-balance
supabase functions deploy create-binance-pay-order
supabase functions deploy sync-wallet-balance
```

**Or via Supabase Dashboard**:
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions**
3. Click **Deploy** for each function
4. Or use the Supabase CLI

### 2. ✅ Frontend Code (Client)
The React code that runs in the browser:

**Files Changed**:
- `src/hooks/useBinanceWallet.ts` ✅

**How to Deploy**:
```bash
# Build the frontend
npm run build
# or
pnpm build

# Then deploy to your hosting (Vercel, Netlify, etc.)
# The build output is in the `dist/` folder
```

**If using Vercel/Netlify**:
- Usually auto-deploys on git push
- Or manually trigger deployment from dashboard

---

## Step-by-Step Deployment

### Step 1: Deploy Edge Functions

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project** (if not already linked):
   ```bash
   supabase link --project-ref zuwkgasbkpjlxzsjzumu
   ```

4. **Deploy the functions**:
   ```bash
   # Deploy all changed functions
   supabase functions deploy refresh-binance-wallet-balance
   supabase functions deploy create-binance-pay-order
   supabase functions deploy sync-wallet-balance
   ```

### Step 2: Deploy Frontend

**If using Vercel/Netlify** (auto-deploy):
```bash
# Just push to git
git add .
git commit -m "Fix balance refresh and payment errors"
git push origin main
```

**If manual deployment**:
```bash
# Build
pnpm build

# Upload dist/ folder to your hosting
```

---

## Verify Deployment

### 1. Check Edge Functions
- Go to Supabase Dashboard → Edge Functions
- Verify all functions are deployed
- Check function logs for errors

### 2. Test Balance Refresh
1. Open your live app
2. Go to wallet settings
3. Click "Refresh balance"
4. Should now query Binance directly (if you have API credentials)

### 3. Test Payment
1. Try making a payment
2. Should work without "non-2xx status code" error

---

## Your Binance Credentials

✅ **Good news**: Your Binance API credentials are already stored in the database when you connected your wallet.

✅ **The code will automatically use them** once deployed:
- The `refresh-binance-wallet-balance` function checks for your credentials
- If found, it uses them to query Binance directly
- You'll get real-time balance from Binance!

---

## Quick Deploy Commands

```bash
# 1. Deploy all edge functions
supabase functions deploy

# 2. Build frontend
pnpm build

# 3. Push to git (if auto-deploy)
git add .
git commit -m "Deploy balance and payment fixes"
git push origin main
```

---

## Status After Deployment

✅ **Balance Refresh**: Will query Binance directly using your credentials
✅ **Payment Processing**: Will work without errors
✅ **Balance Sync**: New function available to sync from payment history

**Once deployed, you'll experience all the fixes in your live environment!** 🎉

