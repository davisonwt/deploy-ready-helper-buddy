# Adding DNS TXT Record in IONOS - Step by Step Guide

## Quick Steps for IONOS

Your domain is managed at **my.ionos.com**. Here's exactly how to add the Cryptomus verification TXT record:

## Step-by-Step Instructions

### Step 1: Log into IONOS

1. Go to **https://my.ionos.com**
2. Log into your account
3. You should see the dashboard (like in your screenshot)

### Step 2: Navigate to Domain Management

**Option A: From the Dashboard**
1. Click on **"Domains & SSL"** (the globe icon with "www" and padlock)
2. You'll see a list of your domains
3. Click on your domain name (the one you want to verify with Cryptomus)

**Option B: Using Search**
1. Use the search bar at the top: type **"DNS"** or **"Domain"**
2. Select your domain from the results

### Step 3: Access DNS Settings

1. Once you're viewing your domain, look for:
   - **"DNS"** tab or section
   - **"DNS Settings"** link
   - **"Manage DNS"** button
   - Or look for **"DNS Records"** or **"DNS Zone"**

2. Click on the DNS management section

### Step 4: Add TXT Record

1. Look for a button that says:
   - **"Add Record"**
   - **"Create Record"**
   - **"New Record"**
   - Or a **"+"** button

2. Click to add a new record

3. Fill in the form:
   - **Record Type**: Select **"TXT"** from the dropdown
   - **Name/Host**: Leave **empty** OR enter **"@"** OR enter your **root domain** (e.g., `yourdomain.com`)
   - **Value/Content**: Enter exactly: **`cryptomus=48a058b3`**
   - **TTL**: Leave as default (usually 3600 or 1 hour)

4. **Important**: 
   - ✅ Value should be: `cryptomus=48a058b3` (no quotes, no spaces)
   - ✅ Name field can be empty, `@`, or your root domain
   - ❌ Don't add quotes around the value
   - ❌ Don't add spaces around the `=`

5. Click **"Save"** or **"Add Record"**

### Step 5: Verify the Record Was Added

1. You should see your new TXT record in the DNS records list
2. It should show:
   - Type: TXT
   - Name: @ (or empty, or your domain)
   - Value: cryptomus=48a058b3

## Visual Guide (Based on IONOS Interface)

The IONOS DNS management page typically looks like this:

```
┌─────────────────────────────────────────┐
│ DNS Records                              │
├─────────────────────────────────────────┤
│ Type │ Name │ Value              │ TTL  │
├──────┼──────┼────────────────────┼──────┤
│ A    │ @    │ 123.45.67.89      │ 3600 │
│ AAAA │ @    │ 2001:db8::1       │ 3600 │
│ MX   │ @    │ mail.example.com  │ 3600 │
│ TXT  │ @    │ cryptomus=48a058b3│ 3600 │ ← Your new record
└─────────────────────────────────────────┘
```

## Alternative: If You Can't Find DNS Settings

If you don't see DNS settings directly:

1. **Check Domain Overview**: Look for a **"DNS"** or **"DNS Zone"** link in the domain overview page
2. **Use IONOS Help**: Search IONOS help for "DNS records" or "TXT record"
3. **Contact Support**: IONOS support can guide you to the DNS settings

## After Adding the Record

1. **Wait 5-15 minutes** for DNS propagation
2. **Verify it's live** using:
   - Online tool: https://mxtoolbox.com/TXTLookup.aspx
   - Enter your domain name and click "TXT Lookup"
   - You should see: `cryptomus=48a058b3`
3. **Go back to Cryptomus dashboard**
4. **Click "Check"** button
5. **Click "Confirm domain"** if verification succeeds

## Troubleshooting

### Can't Find DNS Settings?

- Look for **"Advanced Settings"** or **"Expert Mode"**
- Check if your domain uses **IONOS nameservers** (required for DNS management)
- If using external nameservers, add the TXT record where your nameservers are hosted

### Record Not Showing Up?

- Wait 10-15 minutes (DNS propagation takes time)
- Double-check the value is exactly: `cryptomus=48a058b3` (no quotes)
- Verify you're editing the correct domain
- Check if there's a "Save" or "Apply Changes" button you missed

### Verification Fails?

- Use an online DNS checker to confirm the record exists
- Make sure the record is at the root domain (not a subdomain)
- Ensure there are no extra spaces or quotes
- Wait a bit longer and try again

## Need Help?

If you're stuck:
1. **IONOS Support**: Contact IONOS customer support
2. **IONOS Help Center**: Search for "DNS records" or "TXT record"
3. **Screenshot**: Take a screenshot of your DNS settings page and I can help identify where to add it

## Next Steps After Verification

Once Cryptomus verifies your domain:

1. ✅ **Domain confirmed** in Cryptomus dashboard
2. 🔑 **Get API credentials** from Cryptomus (Business → Merchants → Settings → API Integration)
3. ⚙️ **Configure Supabase** with your credentials
4. 🔗 **Set up webhook** URL
5. 🧪 **Test payment** flow

---

**Quick Reference:**
- **Record Type**: TXT
- **Name**: @ (or empty)
- **Value**: `cryptomus=48a058b3`
- **TTL**: Default (3600)

