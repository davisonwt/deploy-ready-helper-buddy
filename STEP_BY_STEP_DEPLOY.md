# Step-by-Step Deployment Guide - Follow Me! 👋

## 🎯 What We're Deploying Today

**All Changes Made:**
1. ✅ Payment Security (idempotency, audit logs, CORS)
2. ✅ Chat App Security (secure system messages, audit)
3. ✅ Accounting Systems (Gosat & User dashboards)
4. ✅ Balance & Wallet Fixes (direct Binance query)
5. ✅ Product Bestowal Messaging (3 chat messages)
6. ✅ Payment Error Fixes

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before we start, make sure you have:
- [ ] Git installed
- [ ] Node.js and pnpm installed
- [ ] Supabase CLI installed (we'll check this)
- [ ] Access to your Supabase project

---

## 🚀 STEP 1: Install Supabase CLI (If Needed)

**Open PowerShell or Command Prompt and run:**

```powershell
# Check if Supabase CLI is installed
supabase --version
```

**If you see a version number, skip to Step 2.**

**If you get an error, install it:**
```powershell
npm install -g supabase
```

**Wait for installation to complete, then verify:**
```powershell
supabase --version
```

---

## 🔐 STEP 2: Login to Supabase

**Run this command:**
```powershell
supabase login
```

**What happens:**
- A browser window will open
- Log in to your Supabase account
- Authorize the CLI
- You'll see "Successfully logged in"

**If it fails:**
- Make sure you're logged into Supabase in your browser
- Try again

---

## 🔗 STEP 3: Link Your Project

**Run this command:**
```powershell
cd C:\Users\Ezra\deploy-ready-helper-buddy
supabase link --project-ref zuwkgasbkpjlxzsjzumu
```

**What happens:**
- CLI connects to your Supabase project
- You'll see "Project linked successfully"

**If it fails:**
- Check that your project ID is correct: `zuwkgasbkpjlxzsjzumu`
- Make sure you're logged in (Step 2)

---

## 🗄️ STEP 4: Apply Database Migrations (CRITICAL!)

**This creates all the security tables and functions.**

**Run this command:**
```powershell
supabase db push
```

**What happens:**
- Applies 3 new migrations:
  1. `20251120101640_verify_search_path_security.sql` - Security fixes
  2. `20251120102000_payment_security_enhancements.sql` - Payment security
  3. `20251120103000_chat_app_security_hardening.sql` - Chat security

**You should see:**
```
Applying migration 20251120101640_verify_search_path_security.sql...
Applying migration 20251120102000_payment_security_enhancements.sql...
Applying migration 20251120103000_chat_app_security_hardening.sql...
Finished supabase db push.
```

**If it fails:**
- Check Supabase Dashboard → Database → Migrations
- See which migration failed
- Check the error message
- Some migrations might already be applied (that's OK)

**Verify in Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/zuwkgasbkpjlxzsjzumu
2. Click: **Database** → **Tables**
3. Check these tables exist:
   - ✅ `payment_idempotency`
   - ✅ `processed_webhooks`
   - ✅ `payment_audit_log`
   - ✅ `chat_system_message_audit`

---

## ⚙️ STEP 5: Deploy Edge Functions (Backend)

**This deploys all the server-side code changes.**

### Option A: Deploy All at Once (Easiest)

**Run this command:**
```powershell
supabase functions deploy
```

**This deploys ALL functions, including:**
- ✅ `create-binance-pay-order` (payment fixes)
- ✅ `create-stripe-payment` (security)
- ✅ `create-eft-payment` (security)
- ✅ `process-usdc-transfer` (security)
- ✅ `binance-pay-webhook` (chat messages)
- ✅ `verify-chatapp` (secure messages)
- ✅ `purchase-media` (secure messages)
- ✅ `refresh-binance-wallet-balance` (direct Binance query)
- ✅ `sync-wallet-balance` (NEW - balance sync)
- ✅ `complete-product-bestowal` (NEW - product bestowal)

**You should see:**
```
Deploying function create-binance-pay-order...
Deploying function refresh-binance-wallet-balance...
...
Deployed successfully!
```

### Option B: Deploy One by One (If Option A Fails)

**Deploy each function individually:**

```powershell
# Payment functions
supabase functions deploy create-binance-pay-order
supabase functions deploy create-stripe-payment
supabase functions deploy create-eft-payment
supabase functions deploy process-usdc-transfer
supabase functions deploy binance-pay-webhook

# Chat functions
supabase functions deploy verify-chatapp
supabase functions deploy purchase-media

# Wallet functions
supabase functions deploy refresh-binance-wallet-balance
supabase functions deploy sync-wallet-balance

# Product bestowal
supabase functions deploy complete-product-bestowal
```

**Verify in Supabase Dashboard:**
1. Go to: **Edge Functions**
2. Check that all functions show "Active" status
3. Click on each function → **Logs** tab
4. Should see recent deployment logs

---

## 🎨 STEP 6: Build Frontend

**This compiles your React app with all the changes.**

**Run these commands:**
```powershell
# Make sure you're in the project directory
cd C:\Users\Ezra\deploy-ready-helper-buddy

# Install dependencies (if needed)
pnpm install

# Build the frontend
pnpm build
```

**What happens:**
- Compiles all React code
- Creates `dist/` folder with built files
- Takes 1-3 minutes

**You should see:**
```
vite v5.x.x building for production...
✓ built in XX.XXs
```

**If it fails:**
- Check for error messages
- Make sure all dependencies are installed: `pnpm install`
- Try: `pnpm build --force`

---

## 📤 STEP 7: Deploy Frontend

### Option A: Auto-Deploy (If using Vercel/Netlify)

**Run these commands:**
```powershell
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Deploy: Security, balance, payment, chat, and accounting fixes"

# Push to trigger auto-deploy
git push origin main
```

**What happens:**
- Code is pushed to GitHub/GitLab
- Vercel/Netlify automatically detects changes
- Starts building and deploying
- Takes 2-5 minutes

**Check deployment:**
- Go to Vercel/Netlify dashboard
- See deployment progress
- Wait for "Deployed" status

### Option B: Manual Deployment

**If you're not using auto-deploy:**

1. **The `dist/` folder contains your built app**
2. **Upload contents of `dist/` folder to your hosting:**
   - Via FTP
   - Via hosting provider's dashboard
   - Via hosting provider's CLI

---

## ✅ STEP 8: Verify Everything Works

### Test 1: Payment Security ✅

**Test:**
1. Go to your live app
2. Try making a payment
3. Should work without "non-2xx status code" error

**Verify in Supabase:**
- Go to: **Database** → **Tables** → `payment_audit_log`
- Should see entries when you make payments

---

### Test 2: Balance Refresh ✅

**Test:**
1. Go to Wallet Settings
2. Click "Refresh balance"
3. Should query Binance directly (if you have API credentials)
4. Should show your actual balance (not $0.00)

**Check browser console (F12):**
- Should see: "Balance fetched from Binance: $X.XX USDC"
- Or: "Using user's Binance Pay API credentials to fetch balance"

---

### Test 3: Chat Messages ✅

**Test:**
1. Complete a product bestowal
2. Check your 1-on-1 chat with Gosat
3. Should see invoice message

**Verify in Supabase:**
- Go to: **Database** → **Tables** → `chat_system_message_audit`
- Should see audit entries for system messages

---

### Test 4: Accounting Dashboard ✅

**Test:**
1. Go to Gosat Dashboard → Payment Dashboard
2. Should see both orchard AND product bestowals
3. Should see payment type badges (Orchard/Product)

**Verify in Supabase:**
- Go to: **Database** → **Tables** → `payment_transactions`
- Should see entries for both types

---

## 🆘 TROUBLESHOOTING

### Problem: "supabase: command not found"
**Solution:**
```powershell
npm install -g supabase
```

### Problem: "Not logged in"
**Solution:**
```powershell
supabase login
```

### Problem: "Project not linked"
**Solution:**
```powershell
supabase link --project-ref zuwkgasbkpjlxzsjzumu
```

### Problem: Migration fails
**Solution:**
- Check Supabase Dashboard → Database → Migrations
- See which migration failed
- Some might already be applied (that's OK)

### Problem: Function deploy fails
**Solution:**
- Check Supabase Dashboard → Edge Functions
- See error in function logs
- Try deploying one function at a time

### Problem: Frontend build fails
**Solution:**
```powershell
# Clear and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist
pnpm install
pnpm build
```

---

## 📝 QUICK REFERENCE - All Commands

**Copy and paste this entire block:**

```powershell
# 1. Navigate to project
cd C:\Users\Ezra\deploy-ready-helper-buddy

# 2. Login to Supabase
supabase login

# 3. Link project
supabase link --project-ref zuwkgasbkpjlxzsjzumu

# 4. Apply migrations
supabase db push

# 5. Deploy all functions
supabase functions deploy

# 6. Build frontend
pnpm install
pnpm build

# 7. Deploy frontend (if auto-deploy)
git add .
git commit -m "Deploy: All security, balance, payment, and chat fixes"
git push origin main
```

---

## 🎉 YOU'RE DONE!

After completing all steps:
- ✅ Database is secured
- ✅ Payments work correctly
- ✅ Balance shows from Binance
- ✅ Chat messages are secure
- ✅ Accounting shows all transactions

**Everything is now live in your production environment!** 🚀

---

## 📞 Need Help?

If you get stuck at any step:
1. Check the error message
2. Check Supabase Dashboard for clues
3. Review the troubleshooting section above
4. Check function logs in Supabase Dashboard

**You've got this! Follow each step and you'll be deployed in no time!** 💪

