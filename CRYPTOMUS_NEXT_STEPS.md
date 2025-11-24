# Cryptomus Integration - Next Steps After Project Submission

## ✅ Current Status

**Project Submitted**: ✅ Approved for review
- **Project Name**: sow2grow
- **Project URL**: https://sow2growapp.com
- **Merchant ID**: `48a058b3-0edc-467f-9391-834e1c7c4247`
- **Review Time**: Within 24 hours

## 📋 What Happens Next

### Step 1: Wait for Review (24 hours)
Cryptomus will review your project submission. This typically takes:
- **Minimum**: A few hours
- **Maximum**: 24 hours
- **Average**: 4-8 hours

### Step 2: Receive API Key
Once approved, you'll receive:
- ✅ **Payment API Key** (this is what you need for integration)
- ✅ Confirmation email
- ✅ Access to API documentation

### Step 3: Complete Domain Verification
While waiting, make sure your domain is verified:
- ✅ Add DNS TXT record: `cryptomus=48a058b3`
- ✅ Click "Check" in Cryptomus dashboard
- ✅ Click "Confirm domain"

**Note**: Domain verification can be done independently of API review.

## 🔑 When You Receive Your API Key

Once you get your **Payment API Key**, follow these steps:

### Step 1: Add Credentials to Supabase

1. Go to **Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**
2. Add these environment variables:

```
CRYPTOMUS_MERCHANT_ID=48a058b3-0edc-467f-9391-834e1c7c4247
CRYPTOMUS_PAYMENT_API_KEY=your_api_key_here
PUBLIC_SITE_URL=https://sow2growapp.com
```

**Important**: Replace `your_api_key_here` with the actual API key you receive from Cryptomus.

### Step 2: Configure Webhook URL

1. In Cryptomus Dashboard → **Settings** → **Webhooks**
2. Add webhook URL:
   ```
   https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/cryptomus-webhook
   ```
   (Replace `zuwkgasbkpjlxzsjzumu` with your actual Supabase project ID if different)

3. Enable these events:
   - ✅ Payment status changed
   - ✅ Payment confirmed
   - ✅ Payment expired
   - ✅ Payment failed

### Step 3: Deploy Edge Functions

Make sure your Cryptomus edge functions are deployed:

```bash
# Deploy from your project root
supabase functions deploy create-cryptomus-payment
supabase functions deploy cryptomus-webhook
```

Or deploy all functions:
```bash
supabase functions deploy
```

### Step 4: Test the Integration

1. **Test Payment Creation**:
   - Use the `CryptomusPayButton` component in your app
   - Create a test payment
   - Verify payment URL is generated

2. **Test Webhook**:
   - Make a test payment
   - Check Supabase Edge Function logs
   - Verify webhook is received and processed

3. **Verify Payment Flow**:
   - Complete a test payment
   - Check payment status updates
   - Verify distribution (if automatic)

## 📝 Checklist

### Before API Key Arrives
- [ ] Domain DNS TXT record added (`cryptomus=48a058b3`)
- [ ] Domain verified in Cryptomus dashboard
- [ ] Project submitted (✅ Done)
- [ ] Supabase project ready
- [ ] Edge functions code ready (✅ Done)

### After Receiving API Key
- [ ] Add API credentials to Supabase secrets
- [ ] Configure webhook URL in Cryptomus
- [ ] Deploy edge functions
- [ ] Test payment creation
- [ ] Test webhook reception
- [ ] Test complete payment flow
- [ ] Verify payment confirmation
- [ ] Test distribution (if automatic)

## 🚀 Quick Setup Commands

Once you have your API key, run these commands:

### 1. Set Supabase Secrets (via CLI)
```bash
# Set secrets
supabase secrets set CRYPTOMUS_MERCHANT_ID=48a058b3-0edc-467f-9391-834e1c7c4247
supabase secrets set CRYPTOMUS_PAYMENT_API_KEY=your_api_key_here
supabase secrets set PUBLIC_SITE_URL=https://sow2growapp.com
```

### 2. Deploy Functions
```bash
supabase functions deploy create-cryptomus-payment
supabase functions deploy cryptomus-webhook
```

### 3. Verify Deployment
```bash
# Check function logs
supabase functions logs create-cryptomus-payment
supabase functions logs cryptomus-webhook
```

## 🔍 Testing Checklist

### Test 1: Payment Creation
- [ ] Click "Pay with Cryptomus" button
- [ ] Payment URL generated
- [ ] Wallet address displayed (if applicable)
- [ ] Bestowal record created in database

### Test 2: Webhook Reception
- [ ] Webhook received by Supabase function
- [ ] Signature verified successfully
- [ ] Payment status updated
- [ ] No errors in logs

### Test 3: Payment Confirmation
- [ ] Complete test payment
- [ ] Webhook triggers automatically
- [ ] Bestowal status changes to "completed"
- [ ] Distribution executed (if automatic)

## 📞 Support

If you encounter issues:

1. **Check Supabase Logs**:
   - Edge Functions → Logs
   - Look for errors or warnings

2. **Check Cryptomus Dashboard**:
   - View payment status
   - Check webhook delivery status

3. **Verify Configuration**:
   - API credentials correct
   - Webhook URL correct
   - Domain verified

4. **Contact Support**:
   - Cryptomus: support@cryptomus.com or @cryptomussupport on Telegram
   - Supabase: Check Supabase documentation

## 📚 Documentation References

- **DNS Setup**: `CRYPTOMUS_DNS_SETUP.md`
- **IONOS Specific**: `CRYPTOMUS_IONOS_DNS_SETUP.md`
- **Full Integration**: `CRYPTOMUS_INTEGRATION.md`
- **Quick Start**: `CRYPTOMUS_QUICK_START.md`

## ⏰ Timeline

**Now**: 
- ✅ Project submitted
- ⏳ Waiting for API key (up to 24 hours)

**Next**:
- 🔑 Receive API key
- ⚙️ Configure Supabase
- 🔗 Set up webhook
- 🧪 Test integration

**Then**:
- 🚀 Go live!

---

**Your Project Details**:
- **Project Name**: sow2grow
- **Project URL**: https://sow2growapp.com
- **Merchant ID**: `48a058b3-0edc-467f-9391-834e1c7c4247`
- **Supabase Project**: `zuwkgasbkpjlxzsjzumu` (from config.toml)

