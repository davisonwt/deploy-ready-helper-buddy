# Cryptomus Integration - Quick Start Guide

## 🚀 Quick Setup (5 Steps)

### Step 1: Add DNS TXT Record

Add this TXT record to your domain's DNS settings:

```
Type: TXT
Name: @ (or leave empty for root domain)
Value: cryptomus=48a058b3
TTL: 3600 (or default)
```

**Note**: Your Merchant ID is `48a058b3-0edc-467f-9391-834e1c7c4247`. 

**Alternative methods**: You can also verify using a meta tag or HTML file. See `CRYPTOMUS_DOMAIN_VERIFICATION.md` for all options.

**Where to add it:**
- **GoDaddy**: DNS Management → Add Record
- **Namecheap**: Advanced DNS → Add New Record
- **Cloudflare**: DNS → Records → Add Record
- **cPanel**: Zone Editor → Add Record

**Wait 5-15 minutes** for DNS propagation, then click "Check" in Cryptomus dashboard.

### Step 2: Get API Credentials

1. Log into [Cryptomus Dashboard](https://cryptomus.com)
2. Go to **Business** → **Merchants** → Select your merchant
3. Go to **Settings** → **API Integration**
4. Copy:
   - Merchant ID
   - Payment API Key

### Step 3: Configure Supabase Secrets

In Supabase Dashboard → Edge Functions → Settings → Secrets:

```bash
CRYPTOMUS_MERCHANT_ID=your_merchant_id
CRYPTOMUS_PAYMENT_API_KEY=your_api_key
PUBLIC_SITE_URL=https://yourdomain.com
```

### Step 4: Configure Webhook

In Cryptomus Dashboard → Settings → Webhooks:

```
URL: https://<your-project>.supabase.co/functions/v1/cryptomus-webhook
Events: Payment status changed, Payment confirmed
```

### Step 5: Use in Your Code

Replace Binance Pay button:

```tsx
import { CryptomusPayButton } from '@/components/payment/CryptomusPayButton';

<CryptomusPayButton
  orchardId={orchardId}
  amount={100}
  pocketsCount={1}
  currency="USDC"
  network="TRC20"
/>
```

## ✅ That's It!

Your Cryptomus integration is now ready. Test with a small payment to verify everything works.

## 📚 Need More Details?

- **DNS Setup**: See `CRYPTOMUS_DNS_SETUP.md`
- **Full Integration Guide**: See `CRYPTOMUS_INTEGRATION.md`
- **Troubleshooting**: Check logs in Supabase Dashboard → Edge Functions → Logs

## 🆘 Common Issues

**DNS not verifying?**
- Wait 15-30 minutes for propagation
- Check TXT record with: `nslookup -type=TXT yourdomain.com`
- Ensure no quotes around the value

**Webhook not working?**
- Verify webhook URL is correct
- Check Supabase function logs
- Ensure signature verification is enabled

**Payment not creating?**
- Verify API credentials
- Check domain is confirmed
- Review edge function logs

