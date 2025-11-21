# 🌐 Jitsi Domain Setup - Step-by-Step Instructions

## Overview
Set up `meet.sow2growapp.com` to point to your Jitsi server at `139.180.132.20` with automatic HTTPS.

---

## Step 1: Add DNS Record (5 minutes)

### Where to Go
1. **Find your domain registrar** (where you bought `sow2growapp.com`)
   - Common registrars: GoDaddy, Namecheap, Cloudflare, Google Domains, etc.
   - Or check: https://whois.net (search for `sow2growapp.com`)

### What to Do
1. **Log into your domain registrar**
2. **Find DNS Management** (might be called "DNS Settings", "DNS Records", "Zone Editor")
3. **Add a new A Record**:
   - **Type**: `A`
   - **Name/Host**: `meet` (this creates `meet.sow2growapp.com`)
   - **Value/IP Address**: `139.180.132.20`
   - **TTL**: `3600` (or leave default)
4. **Save** the record

### Verify DNS (Wait 5-30 minutes)
Open Command Prompt (Windows) or Terminal (Mac/Linux) and run:
```bash
nslookup meet.sow2growapp.com
```

**Wait until it returns**: `139.180.132.20`

**If it doesn't work yet**: DNS can take up to 48 hours, but usually 15-30 minutes. Keep checking.

---

## Step 2: Configure Jitsi Server on Vultr (10 minutes)

### 2.1: Connect to Your Vultr Server

**Option A: Using SSH (Windows)**
1. Open PowerShell or Command Prompt
2. Run:
   ```bash
   ssh root@139.180.132.20
   ```
3. Enter your password when prompted

**Option B: Using PuTTY (Windows)**
1. Download PuTTY if you don't have it
2. Enter: `139.180.132.20`
3. Click "Open"
4. Login as: `root`
5. Enter your password

**Option C: Using Vultr Console**
1. Go to https://my.vultr.com/
2. Find your server
3. Click "View Console" or "Launch Console"
4. Login as: `root`

### 2.2: Find Your Jitsi Installation

Once logged in, find where Jitsi is installed:

```bash
# Try these common locations
cd ~/jitsi-meet
# OR
cd /opt/jitsi-meet
# OR
cd /home/jitsi
# OR
ls -la | grep jitsi
```

**If you can't find it**, check running containers:
```bash
docker ps
```

Look for containers with "jitsi" in the name. Note the directory path.

### 2.3: Edit Jitsi Configuration

Once you're in the Jitsi directory:

```bash
# List files to find the .env file
ls -la

# Edit the environment file (usually .env or .env.jitsi)
nano .env
# OR
nano .env.jitsi
```

### 2.4: Update Configuration Values

Find and update these lines (use arrow keys to navigate, delete old values, type new ones):

```bash
# Change these values:
PUBLIC_URL=https://meet.sow2growapp.com
XMPP_DOMAIN=meet.sow2growapp.com
XMPP_AUTH_DOMAIN=meet.sow2growapp.com
XMPP_MUC_DOMAIN=muc.meet.sow2growapp.com
XMPP_BOSH_URL_BASE=https://meet.sow2growapp.com/http-bind

# Enable Let's Encrypt (automatic SSL)
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=meet.sow2growapp.com
LETSENCRYPT_EMAIL=your-email@sow2growapp.com

# Enable HTTPS redirect
ENABLE_HTTP_REDIRECT=1
DISABLE_HTTPS=0
```

**Important**: Replace `your-email@sow2growapp.com` with your actual email address!

### 2.5: Save and Exit

1. Press `Ctrl + X`
2. Press `Y` (to confirm save)
3. Press `Enter` (to confirm filename)

### 2.6: Restart Jitsi

```bash
# Stop containers
docker-compose down

# Start with new configuration
docker-compose up -d

# Check status (should all show "Up")
docker-compose ps
```

### 2.7: Check Logs (Optional)

If something doesn't work, check logs:
```bash
docker-compose logs web
```

Look for any errors. Press `Ctrl+C` to exit logs.

---

## Step 3: Verify SSL Certificate (5 minutes)

### 3.1: Wait for Certificate Generation

Let's Encrypt will automatically generate certificates. This takes 1-5 minutes.

### 3.2: Test HTTPS Access

1. Open browser
2. Go to: `https://meet.sow2growapp.com`
3. You should see:
   - ✅ Green padlock icon (HTTPS)
   - ✅ Jitsi Meet interface
   - ✅ No certificate errors

**If you see errors**:
- Wait a few more minutes (certificate generation can take time)
- Check DNS is fully propagated: `nslookup meet.sow2growapp.com`
- Check logs: `docker-compose logs web | grep -i cert`

---

## Step 4: Update Your App Configuration (2 minutes)

### 4.1: Update Environment Variable

**In Vercel/Netlify**:
1. Go to your deployment dashboard
2. Navigate to: Settings → Environment Variables
3. Find: `VITE_JITSI_DOMAIN`
4. Change value from: `139.180.132.20`
5. To: `meet.sow2growapp.com`
6. Save
7. **Redeploy** your site

**In Local `.env` file**:
```env
VITE_JITSI_DOMAIN=meet.sow2growapp.com
```

### 4.2: Rebuild (if building locally)

```bash
pnpm build
```

---

## Step 5: Test Everything (5 minutes)

### Test Jitsi Web Interface
1. Open: `https://meet.sow2growapp.com`
2. Create a test room
3. Join from another browser/device
4. Verify video/audio works

### Test from Your App
1. Go to your live site
2. Start a voice call
3. Start a video call
4. Verify connections work

---

## Troubleshooting

### DNS Not Working
**Problem**: `nslookup meet.sow2growapp.com` doesn't return `139.180.132.20`

**Solutions**:
1. Wait longer (up to 48 hours, usually 15-30 minutes)
2. Double-check DNS record is correct in registrar
3. Clear DNS cache:
   - Windows: `ipconfig /flushdns`
   - Mac/Linux: `sudo dscacheutil -flushcache`

### SSL Certificate Not Generating
**Problem**: HTTPS shows errors or certificate not found

**Solutions**:
1. Ensure DNS is fully propagated (check with `nslookup`)
2. Port 80 must be open (for Let's Encrypt verification):
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```
3. Check logs: `docker-compose logs web`
4. Restart containers: `docker-compose restart`

### Can't Access Jitsi
**Problem**: Can't connect to Jitsi at new domain

**Solutions**:
1. Verify containers running: `docker-compose ps`
2. Check firewall: ports 80, 443, 10000 UDP must be open
3. Test direct IP still works: `https://139.180.132.20`
4. Check configuration: `cat .env` (verify domain is correct)

---

## Quick Command Reference

```bash
# Connect to server
ssh root@139.180.132.20

# Navigate to Jitsi
cd ~/jitsi-meet

# Edit config
nano .env

# Restart Jitsi
docker-compose down && docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs web

# Test DNS (from your computer)
nslookup meet.sow2growapp.com
```

---

## Summary Checklist

- [ ] Step 1: Added DNS A record: `meet` → `139.180.132.20`
- [ ] Step 2: Verified DNS propagated (`nslookup` returns IP)
- [ ] Step 3: Updated Jitsi `.env` file with domain settings
- [ ] Step 4: Enabled Let's Encrypt in `.env`
- [ ] Step 5: Restarted Jitsi containers
- [ ] Step 6: Verified HTTPS works at `https://meet.sow2growapp.com`
- [ ] Step 7: Updated `VITE_JITSI_DOMAIN` in deployment platform
- [ ] Step 8: Redeployed frontend
- [ ] Step 9: Tested voice/video calls from app

---

**Time Required**: ~30 minutes (plus DNS propagation wait)

**Result**: Professional domain with automatic SSL! 🎉

---

**Need Help?** If you get stuck at any step, let me know which step and what error you see!

