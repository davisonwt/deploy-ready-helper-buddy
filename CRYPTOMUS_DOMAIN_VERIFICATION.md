# Cryptomus Domain Verification - Complete Guide

## Your Merchant ID
**Merchant ID**: `48a058b3-0edc-467f-9391-834e1c7c4247`

## Verification Methods

Cryptomus offers **three methods** to verify domain ownership. Choose the one that works best for you:

### Option 1: Using DNS (Recommended) ✅

**Why choose DNS:**
- Most reliable method
- Works for all domains
- No need to modify website files
- Permanent verification

**Steps:**
1. Add a **TXT record** to your domain's DNS settings
2. **Record Type**: TXT
3. **Name/Host**: `@` (or leave empty for root domain)
4. **Value**: `cryptomus=48a058b3`
5. **TTL**: 3600 (or default)
6. Save the record
7. Wait 5-15 minutes for DNS propagation
8. In Cryptomus dashboard, click **"Check"** button
9. If verified, click **"Confirm domain"**

**Where to add it:**
- **GoDaddy**: DNS Management → Add Record → Type: TXT
- **Namecheap**: Advanced DNS → Add New Record → Type: TXT
- **Cloudflare**: DNS → Records → Add Record → Type: TXT
- **cPanel**: Zone Editor → Add Record → Type: TXT
- **AWS Route 53**: Hosted Zones → Create Record → Type: TXT

---

### Option 2: Using Meta Tag on Site

**Why choose Meta Tag:**
- Quick if you have website access
- No DNS changes needed
- Good for testing

**Steps:**
1. In Cryptomus dashboard, select **"Using a meta tag on the site"**
2. Copy the meta tag they provide (will look like):
   ```html
   <meta name="cryptomus-verification" content="48a058b3">
   ```
3. Add this meta tag to your website's `<head>` section
   - If using React/Vite: Add to `index.html` in the `<head>`
   - If using Next.js: Add to `_document.tsx` or `layout.tsx`
   - If using plain HTML: Add to your main HTML file's `<head>`
4. Deploy/update your website
5. In Cryptomus dashboard, click **"Check"** button
6. If verified, click **"Confirm domain"**

**For this project (React/Vite):**
Add the meta tag to `index.html`:
```html
<head>
  <!-- Other meta tags -->
  <meta name="cryptomus-verification" content="48a058b3">
</head>
```

---

### Option 3: Using HTML File

**Why choose HTML File:**
- Simple file upload
- No code changes needed
- Good for static sites

**Steps:**
1. In Cryptomus dashboard, select **"Using an HTML file"**
2. Download the HTML file they provide (usually named something like `cryptomus-verification.html`)
3. Upload this file to your website's root directory (same level as `index.html`)
   - For Vite/React: Upload to `public/` folder
   - For Next.js: Upload to `public/` folder
   - For static hosting: Upload to root directory
4. Make sure the file is accessible at: `https://yourdomain.com/cryptomus-verification.html`
5. In Cryptomus dashboard, click **"Check"** button
6. If verified, click **"Confirm domain"**

**For this project (Vite/React):**
1. Download the HTML file from Cryptomus
2. Place it in the `public/` folder
3. Deploy your site
4. Verify it's accessible at: `https://yourdomain.com/cryptomus-verification.html`

---

## Which Method Should You Choose?

### ✅ **Recommended: DNS Method**
- Most reliable
- Works even if you change hosting
- No website code changes needed
- Permanent verification

### ⚡ **Quick Option: Meta Tag**
- Fastest if you can update your website
- Good for testing
- Requires website deployment

### 📁 **Simple Option: HTML File**
- Easiest if you have file upload access
- No DNS knowledge needed
- File must remain accessible

---

## After Verification

Once your domain is verified:

1. ✅ **Domain Confirmed**: You'll see "Domain confirmed" in Cryptomus dashboard
2. 🔑 **Get API Credentials**: 
   - Go to **Business** → **Merchants** → **Settings** → **API Integration**
   - Copy your **Merchant ID** and **Payment API Key**
3. ⚙️ **Configure Supabase**:
   - Add environment variables (see `CRYPTOMUS_INTEGRATION.md`)
4. 🔗 **Set Up Webhook**:
   - Configure webhook URL in Cryptomus dashboard
5. 🧪 **Test Payment**:
   - Create a test payment to verify everything works

---

## Troubleshooting

### DNS Method Issues
- **Not verifying?** Wait 15-30 minutes for DNS propagation
- **Check DNS**: Use `nslookup -type=TXT yourdomain.com` or online DNS checker
- **Wrong value?** Ensure it's exactly: `cryptomus=48a058b3` (no quotes, no spaces)

### Meta Tag Issues
- **Not found?** Check the HTML source of your website (View Page Source)
- **Wrong location?** Meta tag must be in `<head>` section, not `<body>`
- **Cached?** Clear browser cache or use incognito mode

### HTML File Issues
- **404 Error?** Ensure file is in the correct directory (usually `public/` or root)
- **Not accessible?** Check file permissions and URL path
- **Wrong content?** Re-download the file from Cryptomus dashboard

---

## Next Steps After Verification

1. ✅ Domain verified → Get API credentials
2. 🔑 Add credentials to Supabase → Configure webhook
3. 🧪 Test payment → Go live!

See `CRYPTOMUS_INTEGRATION.md` for complete setup instructions.

