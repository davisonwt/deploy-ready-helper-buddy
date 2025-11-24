# Cryptomus Domain Verification - DNS Setup Guide

## Overview
This guide will help you add the DNS TXT record required to verify your domain with Cryptomus payment gateway.

**IONOS Users**: See `CRYPTOMUS_IONOS_DNS_SETUP.md` for specific IONOS instructions.

## Step-by-Step Instructions

### Step 1: Add DNS TXT Record

You need to add a TXT record to your domain's DNS settings. The value from the Cryptomus dashboard is:
```
cryptomus=48a058b3
```

**Note**: This is the verification code provided by Cryptomus. Your full Merchant ID is `48a058b3-0edc-467f-9391-834e1c7c4247`, but for DNS verification, use only `cryptomus=48a058b3`.

#### How to Add DNS TXT Record:

**Option A: Using Your Domain Registrar (GoDaddy, Namecheap, etc.)**
1. Log into your domain registrar's control panel
2. Navigate to DNS Management or DNS Settings
3. Find the section for adding DNS records
4. Click "Add Record" or "Add New Record"
5. Select record type: **TXT**
6. Leave the **Name/Host** field empty (or use `@` or your root domain)
7. In the **Value/Content** field, paste: `cryptomus=48a058b3`
8. Set **TTL** to 3600 (or default)
9. Click **Save** or **Add Record**

**Option B: Using Your Hosting Provider (cPanel, Plesk, etc.)**
1. Log into your hosting control panel
2. Navigate to **DNS Zone Editor** or **DNS Management**
3. Click **Add Record**
4. Select **TXT** as the record type
5. Leave **Name** empty or use `@`
6. Enter `cryptomus=48a058b3` in the **TXT Value** field
7. Click **Add Record**

**Option C: Using Cloudflare**
1. Log into Cloudflare dashboard
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **Add record**
5. Type: **TXT**
6. Name: `@` (or leave empty for root domain)
7. Content: `cryptomus=48a058b3`
8. TTL: Auto
9. Click **Save**

**Option D: Using AWS Route 53**
1. Log into AWS Console → Route 53
2. Select your hosted zone
3. Click **Create record**
4. Record type: **TXT**
5. Record name: Leave empty (or use `@`)
6. Value: `cryptomus=48a058b3`
7. TTL: 300
8. Click **Create records**

### Step 2: Wait for DNS Propagation

DNS changes can take anywhere from a few minutes to 48 hours to propagate globally. Typically:
- **Cloudflare**: 1-5 minutes
- **Most providers**: 15 minutes to 2 hours
- **Maximum**: Up to 48 hours

You can check if your DNS record is live using these tools:
- https://mxtoolbox.com/TXTLookup.aspx
- https://www.whatsmydns.net/#TXT
- Command line: `nslookup -type=TXT yourdomain.com`

### Step 3: Verify Domain in Cryptomus Dashboard

1. Go back to the Cryptomus dashboard
2. Click the **"Check"** button in Step 2
3. If verification succeeds, you'll see a confirmation message
4. Click **"Confirm domain"** to proceed

### Troubleshooting

**If verification fails:**
- Wait 10-15 minutes and try again (DNS propagation delay)
- Verify the TXT record is correct: `cryptomus=48a058b3` (no extra spaces)
- Check that the record is at the root domain (not a subdomain)
- Ensure there are no quotes around the value
- Try using a DNS checker tool to confirm the record is live

**Common Mistakes:**
- ❌ Adding quotes: `"cryptomus=48a058b3"` (should be without quotes)
- ❌ Extra spaces: `cryptomus = 48a058b3` (should be no spaces around `=`)
- ❌ Wrong verification code: Make sure you use exactly `cryptomus=48a058b3` (this is the verification code, not your full merchant ID)
- ❌ Wrong record type (using A or CNAME instead of TXT)
- ❌ Adding to subdomain instead of root domain

## Next Steps

After domain verification is complete:
1. Complete the Cryptomus merchant setup
2. Get your API credentials (API Key, Merchant ID, etc.)
3. Configure webhook URLs
4. Update your application with Cryptomus integration

See `CRYPTOMUS_INTEGRATION.md` for the full integration guide.

