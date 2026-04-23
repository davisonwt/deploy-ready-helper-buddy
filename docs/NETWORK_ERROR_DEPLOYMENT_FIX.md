# Fix Network Error During Edge Function Deployment

## 🔴 Error: "NetworkError when attempting to fetch resource. (api.supabase.com)"

This error occurs when the Supabase CLI cannot connect to the Supabase API during deployment.

---

## 🔍 Quick Diagnosis

### Step 1: Check Your Connection
```powershell
# Test if you can reach Supabase API
Test-NetConnection api.supabase.com -Port 443
```

### Step 2: Verify Authentication
```powershell
supabase projects list
```

If this works, authentication is fine. The issue is during deployment.

---

## ✅ Solution 1: Deploy Functions Individually (Recommended)

Instead of deploying all functions at once, deploy them one at a time:

```powershell
# Navigate to project
cd C:\Users\Ezra\deploy-ready-helper-buddy

# Deploy functions one by one
supabase functions deploy refresh-binance-wallet-balance
supabase functions deploy sync-wallet-balance
supabase functions deploy create-binance-pay-order
supabase functions deploy create-stripe-payment
supabase functions deploy create-eft-payment
supabase functions deploy process-usdc-transfer
supabase functions deploy binance-pay-webhook
supabase functions deploy verify-chatapp
supabase functions deploy purchase-media
supabase functions deploy complete-product-bestowal
supabase functions deploy create-cryptomus-payment
supabase functions deploy cryptomus-webhook
```

**Why this works**: Smaller uploads are less likely to timeout.

---

## ✅ Solution 2: Update Supabase CLI

Your CLI is outdated (v2.58.5). Update to the latest version:

```powershell
# Option A: If installed via npm
npm install -g supabase@latest

# Option B: If using binary, download latest from:
# https://github.com/supabase/cli/releases/latest
```

Then try deploying again.

---

## ✅ Solution 3: Check Windows Firewall / Antivirus

1. **Temporarily disable Windows Firewall** (test only):
   - Windows Security → Firewall & network protection → Turn off
   - Try deployment
   - Re-enable firewall

2. **Add Supabase CLI to Firewall exceptions**:
   - Windows Security → Firewall & network protection → Allow an app
   - Find `supabase.exe` or add it manually
   - Allow both Private and Public networks

3. **Check Antivirus**:
   - Temporarily disable real-time protection
   - Try deployment
   - If it works, add exception for `supabase.exe`

---

## ✅ Solution 4: Use Proxy Settings (If Behind Corporate Firewall)

If you're behind a corporate firewall/proxy:

```powershell
# Set proxy environment variables
$env:HTTP_PROXY = "http://your-proxy:port"
$env:HTTPS_PROXY = "http://your-proxy:port"
$env:NO_PROXY = "localhost,127.0.0.1"

# Then try deployment
supabase functions deploy refresh-binance-wallet-balance
```

---

## ✅ Solution 5: Deploy via Supabase Dashboard (Easiest!)

If CLI continues to fail, use the web dashboard:

### Steps:

1. **Go to Supabase Dashboard**:
   - https://supabase.com/dashboard/project/zuwkgasbkpjlxzsjzumu
   - Navigate to **Edge Functions** (left sidebar)

2. **For each function**:
   - Click on the function name
   - Click **Deploy** button
   - Upload the `index.ts` file from `supabase/functions/[function-name]/index.ts`
   - Or copy-paste the code directly

### Functions to Deploy:

- `refresh-binance-wallet-balance` → `supabase/functions/refresh-binance-wallet-balance/index.ts`
- `sync-wallet-balance` → `supabase/functions/sync-wallet-balance/index.ts`
- `create-binance-pay-order` → `supabase/functions/create-binance-pay-order/index.ts`
- `create-stripe-payment` → `supabase/functions/create-stripe-payment/index.ts`
- `create-eft-payment` → `supabase/functions/create-eft-payment/index.ts`
- `process-usdc-transfer` → `supabase/functions/process-usdc-transfer/index.ts`
- `binance-pay-webhook` → `supabase/functions/binance-pay-webhook/index.ts`
- `verify-chatapp` → `supabase/functions/verify-chatapp/index.ts`
- `purchase-media` → `supabase/functions/purchase-media/index.ts`
- `complete-product-bestowal` → `supabase/functions/complete-product-bestowal/index.ts`
- `create-cryptomus-payment` → `supabase/functions/create-cryptomus-payment/index.ts`
- `cryptomus-webhook` → `supabase/functions/cryptomus-webhook/index.ts`

**Note**: Dashboard deployment handles network issues better and shows progress.

---

## ✅ Solution 6: Increase Timeout (Advanced)

If deploying large functions, increase the timeout:

```powershell
# Set longer timeout (in seconds)
$env:SUPABASE_FUNCTIONS_DEPLOY_TIMEOUT = "300"

# Deploy
supabase functions deploy [function-name]
```

---

## ✅ Solution 7: Check DNS Resolution

Sometimes DNS issues cause network errors:

```powershell
# Test DNS resolution
Resolve-DnsName api.supabase.com

# If it fails, try using Google DNS:
# 1. Open Network Settings
# 2. Change DNS to 8.8.8.8 and 8.8.4.4
# 3. Try deployment again
```

---

## 🔄 Retry Strategy

If deployment fails:

1. **Wait 30 seconds** - API might be temporarily busy
2. **Try again** - Network issues are often transient
3. **Deploy individual functions** - Smaller uploads succeed more often
4. **Use Dashboard** - Most reliable method

---

## 📋 Deployment Checklist

- [ ] Updated Supabase CLI to latest version
- [ ] Checked firewall/antivirus settings
- [ ] Tested network connectivity (`Test-NetConnection api.supabase.com`)
- [ ] Verified authentication (`supabase projects list`)
- [ ] Tried deploying individual functions
- [ ] If all else fails, use Dashboard method

---

## 🆘 Still Having Issues?

1. **Check Supabase Status**: https://status.supabase.com
2. **Check CLI Logs**: Look for detailed error messages
3. **Try Different Network**: Use mobile hotspot to test
4. **Contact Support**: Supabase Discord or GitHub Issues

---

## 💡 Recommended Approach

**For immediate deployment**: Use **Solution 5 (Dashboard)** - it's the most reliable.

**For future deployments**: Update CLI and deploy functions individually.

