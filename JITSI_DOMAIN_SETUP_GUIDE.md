# 🌐 Setting Up Domain Name for Jitsi Server

## Overview

Instead of using IP address `139.180.132.20`, set up a domain like `meet.sow2growapp.com` for better HTTPS support and browser compatibility.

---

## Step 1: DNS Configuration

### Option A: Using Your Existing Domain (sow2growapp.com)

1. **Go to your domain registrar** (where you bought `sow2growapp.com`)
   - Examples: GoDaddy, Namecheap, Cloudflare, etc.

2. **Add an A Record**:
   - **Type**: A
   - **Name/Host**: `meet` (or `jitsi`, `video`, etc.)
   - **Value/IP**: `139.180.132.20`
   - **TTL**: 3600 (or default)

3. **Wait for DNS propagation** (5 minutes to 48 hours, usually 15-30 minutes)
   - Check with: `nslookup meet.sow2growapp.com` or `dig meet.sow2growapp.com`
   - Should return: `139.180.132.20`

### Option B: Using a Subdomain Provider

If you don't have a domain, you can:
- Use a free subdomain service
- Or purchase a domain name

---

## Step 2: Configure Jitsi Server on Vultr

### SSH into Your Vultr Server

```bash
ssh root@139.180.132.20
```

### Navigate to Jitsi Directory

```bash
cd ~/jitsi-meet
# or wherever your Jitsi is installed
```

### Edit Environment File

Find and edit your `.env.jitsi` file (or `.env` file):

```bash
nano .env.jitsi
```

### Update These Variables

```bash
# Set your domain (replace with your actual domain)
PUBLIC_URL=https://meet.sow2growapp.com
XMPP_DOMAIN=meet.sow2growapp.com
XMPP_AUTH_DOMAIN=meet.sow2growapp.com
XMPP_MUC_DOMAIN=muc.meet.sow2growapp.com
XMPP_BOSH_URL_BASE=https://meet.sow2growapp.com/http-bind

# Enable Let's Encrypt for automatic SSL
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=meet.sow2growapp.com
LETSENCRYPT_EMAIL=your-email@sow2growapp.com

# Enable HTTP to HTTPS redirect
ENABLE_HTTP_REDIRECT=1
DISABLE_HTTPS=0
```

**Important**: Replace `meet.sow2growapp.com` with your actual domain!

### Save and Exit

- Press `Ctrl+X`
- Press `Y` to confirm
- Press `Enter` to save

---

## Step 3: Restart Jitsi Containers

```bash
# Stop containers
docker-compose down

# Start with new configuration
docker-compose up -d

# Check status
docker-compose ps

# View logs (if needed)
docker-compose logs -f
```

---

## Step 4: Verify SSL Certificate

### Check Certificate Generation

Let's Encrypt will automatically generate certificates. Check logs:

```bash
docker-compose logs web | grep -i cert
```

### Test HTTPS Access

1. Open browser: `https://meet.sow2growapp.com`
2. Should see:
   - ✅ Green padlock (HTTPS)
   - ✅ Jitsi Meet interface
   - ✅ No certificate errors

### If Certificate Fails

1. **Check DNS is propagated**:
   ```bash
   nslookup meet.sow2growapp.com
   ```

2. **Check ports are open**:
   ```bash
   # Port 80 must be open for Let's Encrypt verification
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **Check logs for errors**:
   ```bash
   docker-compose logs web
   ```

---

## Step 5: Update Your App Configuration

### Update Environment Variable

**In your deployment platform (Vercel/Netlify)**:
- Change `VITE_JITSI_DOMAIN` from `139.180.132.20` to `meet.sow2growapp.com`

**In your local `.env` file**:
```env
VITE_JITSI_DOMAIN=meet.sow2growapp.com
```

### Rebuild and Redeploy

```bash
# Local rebuild
pnpm build

# Or let your deployment platform rebuild automatically
```

---

## Step 6: Test Everything

### Test Jitsi Web Interface
1. Open: `https://meet.sow2growapp.com`
2. Create a test room
3. Verify video/audio works

### Test from Your App
1. Go to your live site
2. Start a voice call
3. Start a video call
4. Verify connections work

---

## Troubleshooting

### DNS Not Resolving

**Problem**: `nslookup meet.sow2growapp.com` doesn't return your IP

**Solutions**:
1. Wait longer (DNS can take up to 48 hours)
2. Check DNS record is correct in registrar
3. Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo systemd-resolve --flush-caches` (Linux)

### SSL Certificate Not Generating

**Problem**: Let's Encrypt fails to generate certificate

**Solutions**:
1. Ensure DNS is fully propagated
2. Port 80 must be open (for Let's Encrypt verification)
3. Check domain is accessible: `curl http://meet.sow2growapp.com`
4. Check logs: `docker-compose logs web`

### Certificate Errors in Browser

**Problem**: Browser shows "Not Secure" or certificate errors

**Solutions**:
1. Wait for certificate to fully generate (can take a few minutes)
2. Check certificate: `docker-compose exec web certbot certificates`
3. Manually renew: `docker-compose exec web certbot renew`

### Jitsi Not Loading

**Problem**: Can't access Jitsi at new domain

**Solutions**:
1. Verify containers are running: `docker-compose ps`
2. Check firewall allows ports 80, 443, 10000 UDP
3. Test direct IP still works: `https://139.180.132.20`
4. Check logs: `docker-compose logs`

---

## Quick Reference

### DNS Record Example
```
Type: A
Name: meet
Value: 139.180.132.20
TTL: 3600
```

### Environment Variables to Update
```bash
PUBLIC_URL=https://meet.sow2growapp.com
XMPP_DOMAIN=meet.sow2growapp.com
LETSENCRYPT_DOMAIN=meet.sow2growapp.com
ENABLE_LETSENCRYPT=1
```

### Commands
```bash
# Restart Jitsi
docker-compose down && docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f web

# Test DNS
nslookup meet.sow2growapp.com
```

---

## Summary

**Steps**:
1. ✅ Add DNS A record: `meet.sow2growapp.com` → `139.180.132.20`
2. ✅ Update Jitsi `.env.jitsi` with domain and Let's Encrypt settings
3. ✅ Restart Jitsi containers
4. ✅ Verify HTTPS works at `https://meet.sow2growapp.com`
5. ✅ Update `VITE_JITSI_DOMAIN` in your app to use domain instead of IP
6. ✅ Rebuild and redeploy your app

**Time Required**: 15-30 minutes (plus DNS propagation wait)

**Result**: Professional domain with automatic SSL certificates! 🎉

---

**Last Updated**: 2025-01-20

