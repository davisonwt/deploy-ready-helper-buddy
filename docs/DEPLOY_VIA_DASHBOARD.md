# Deploy via Supabase Dashboard (Easier Method!)

Since the CLI linking is having issues, here's how to deploy via the Dashboard:

## ✅ What's Already Done:
- ✅ **Frontend**: Built successfully (in `dist/` folder)
- ✅ **Code**: Committed to git
- ✅ **Supabase CLI**: Installed and logged in

## 🚀 Deploy Database Migrations via Dashboard:

### Step 1: Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard/project/zuwkgasbkpjlxzsjzumu
2. Click: **SQL Editor** (left sidebar)

### Step 2: Apply Each Migration

**Migration 1: Security Fixes**
1. Click **New Query**
2. Open file: `supabase/migrations/20251120101640_verify_search_path_security.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click **Run** (or press Ctrl+Enter)

**Migration 2: Payment Security**
1. Click **New Query**
2. Open file: `supabase/migrations/20251120102000_payment_security_enhancements.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click **Run**

**Migration 3: Chat Security**
1. Click **New Query**
2. Open file: `supabase/migrations/20251120103000_chat_app_security_hardening.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click **Run**

---

## ⚙️ Deploy Edge Functions via Dashboard:

### Step 1: Go to Edge Functions
1. In Supabase Dashboard, click: **Edge Functions** (left sidebar)

### Step 2: Deploy Each Function

For each function, click **Deploy** and upload the `index.ts` file:

1. **create-binance-pay-order**
   - Click function → **Deploy** → Upload `supabase/functions/create-binance-pay-order/index.ts`

2. **create-stripe-payment**
   - Click function → **Deploy** → Upload `supabase/functions/create-stripe-payment/index.ts`

3. **create-eft-payment**
   - Click function → **Deploy** → Upload `supabase/functions/create-eft-payment/index.ts`

4. **process-usdc-transfer**
   - Click function → **Deploy** → Upload `supabase/functions/process-usdc-transfer/index.ts`

5. **binance-pay-webhook**
   - Click function → **Deploy** → Upload `supabase/functions/binance-pay-webhook/index.ts`

6. **verify-chatapp**
   - Click function → **Deploy** → Upload `supabase/functions/verify-chatapp/index.ts`

7. **purchase-media**
   - Click function → **Deploy** → Upload `supabase/functions/purchase-media/index.ts`

8. **refresh-binance-wallet-balance**
   - Click function → **Deploy** → Upload `supabase/functions/refresh-binance-wallet-balance/index.ts`

9. **sync-wallet-balance** (NEW)
   - Click **Create Function**
   - Name: `sync-wallet-balance`
   - Upload: `supabase/functions/sync-wallet-balance/index.ts`

10. **complete-product-bestowal** (NEW)
    - Click **Create Function**
    - Name: `complete-product-bestowal`
    - Upload: `supabase/functions/complete-product-bestowal/index.ts`

---

## 🎨 Frontend Deployment:

### Option A: Auto-Deploy (Vercel/Netlify)
- If you have auto-deploy set up, it should deploy automatically after git push
- Check your Vercel/Netlify dashboard

### Option B: Manual Deploy
- Upload contents of `dist/` folder to your hosting provider

---

## ✅ Quick Checklist:

- [ ] Applied 3 database migrations via SQL Editor
- [ ] Deployed 10 edge functions via Dashboard
- [ ] Frontend built (dist/ folder ready)
- [ ] Git pushed (or will push after pull)

---

**This method is actually EASIER than CLI!** 🎉

