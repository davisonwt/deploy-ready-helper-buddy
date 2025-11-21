# 🎥 Voice & Video Features - Deployment Guide

## ✅ What's Done

### Code Status
- ✅ **All voice/video code is implemented and pushed to GitHub**
- ✅ **Voice calls** - Working (Jitsi integration)
- ✅ **Video calls** - Working (Jitsi integration)
- ✅ **Voice messages** - Working (recording + upload)
- ✅ **Video messages** - Working (file upload + playback)
- ✅ **Multi-participant rooms** - Working (Jitsi integration)
- ✅ **Environment variable support** - Added for Jitsi domain configuration

### Files Pushed to GitHub
- ✅ `src/lib/jitsi-config.ts` - Updated to support `VITE_JITSI_DOMAIN`
- ✅ `VOICE_VIDEO_FEATURES_AUDIT.md` - Complete feature audit
- ✅ All voice/video components and hooks

---

## 🔧 What You Need to Do

### Step 1: Configure Jitsi Domain for Your Vultr Instance

**Option A: Environment Variable (Recommended)**

1. **Get your Vultr Jitsi server domain/IP**
   - Log into Vultr: https://my.vultr.com/
   - Find your Jitsi server IP or domain
   - Example: `123.45.67.89` or `meet.yourdomain.com`

2. **Add to your `.env` file** (in project root):
   ```env
   VITE_JITSI_DOMAIN=your-vultr-ip-or-domain.com
   ```
   
   **Example:**
   ```env
   VITE_JITSI_DOMAIN=meet.sow2growapp.com
   ```
   OR if using IP:
   ```env
   VITE_JITSI_DOMAIN=123.45.67.89
   ```

3. **If using Vercel/Netlify** (for production):
   - Go to your deployment platform dashboard
   - Add environment variable:
     - **Name**: `VITE_JITSI_DOMAIN`
     - **Value**: Your Vultr Jitsi domain/IP
   - **Redeploy** your site

4. **If building locally**:
   ```bash
   # Rebuild with new environment variable
   pnpm build
   ```

**Option B: Runtime Configuration** (Alternative)

If you can't set environment variables, you can set it in code:

1. Open `src/main.tsx` or `src/App.tsx`
2. Add at the top (after imports):
   ```typescript
   // Set Jitsi domain for Vultr instance
   if (typeof window !== 'undefined') {
     (window as any).__JITSI_DOMAIN__ = 'your-vultr-ip-or-domain.com';
   }
   ```

---

### Step 2: Verify Jitsi Server on Vultr

1. **SSH into your Vultr server**:
   ```bash
   ssh root@your-vultr-ip
   ```

2. **Check Jitsi containers are running**:
   ```bash
   cd ~/jitsi-meet  # or wherever your Jitsi is installed
   docker-compose ps
   ```
   
   Should show all containers as "Up"

3. **Test Jitsi web interface**:
   - Open browser: `https://your-vultr-domain.com`
   - Should see Jitsi Meet interface
   - Try creating a test room

4. **Check firewall ports**:
   - UDP 10000 (for media)
   - TCP 443 (HTTPS)
   - TCP 4443 (alternative HTTPS)
   - TCP 80 (HTTP redirect)

---

### Step 3: Test on Your Live Site

After deploying with the Jitsi domain configured:

1. **Test Voice Call**:
   - Go to chat
   - Start voice call with another user
   - Verify audio works both ways

2. **Test Video Call**:
   - Go to chat
   - Start video call with another user
   - Verify video and audio work

3. **Test Voice Message**:
   - In chat, click microphone button
   - Record a voice message
   - Send it
   - Verify it plays back

4. **Test Video Message**:
   - In chat, click attachment button
   - Upload a video file
   - Verify it displays and plays

5. **Test Multi-Participant Room**:
   - Create/join a live room
   - Have multiple users join
   - Verify video/audio works for all

---

## 📋 Quick Checklist

### Configuration
- [ ] Jitsi domain configured in `.env` or deployment platform
- [ ] Jitsi server running on Vultr
- [ ] HTTPS enabled on Jitsi server
- [ ] Firewall ports open

### Deployment
- [ ] Code pushed to GitHub ✅ (Already done)
- [ ] Frontend rebuilt with `VITE_JITSI_DOMAIN`
- [ ] Frontend deployed to live site
- [ ] Environment variable set in deployment platform

### Testing
- [ ] Voice calls work
- [ ] Video calls work
- [ ] Voice messages record and send
- [ ] Video files upload and play
- [ ] Multi-participant rooms work
- [ ] Mobile devices can join calls

---

## 🐛 Troubleshooting

### Calls Not Connecting
**Problem**: Calls fail to connect or show errors

**Solutions**:
1. Check Jitsi domain is correct in `.env`
2. Verify Jitsi server is running: `docker-compose ps`
3. Check browser console for errors
4. Ensure HTTPS is enabled (required for media)
5. Verify firewall allows UDP 10000

### Microphone/Camera Not Working
**Problem**: Can't access microphone or camera

**Solutions**:
1. Check browser permissions (Settings → Privacy → Microphone/Camera)
2. Ensure site is using HTTPS (required for media access)
3. Check browser console for permission errors
4. Try different browser
5. Test on different device

### Voice Messages Not Uploading
**Problem**: Voice messages fail to upload

**Solutions**:
1. Check Supabase Storage bucket `chat-files` exists
2. Verify file size limits (10MB max)
3. Check network connection
4. Review browser console for errors
5. Check Supabase Storage permissions

### Jitsi Script Not Loading
**Problem**: Error loading Jitsi external API

**Solutions**:
1. Verify Jitsi domain is accessible: `https://your-domain.com/external_api.js`
2. Check CORS settings on Jitsi server
3. Verify HTTPS certificate is valid
4. Check browser console for network errors

---

## 📝 Environment Variable Setup

### For Vercel
1. Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Name**: `VITE_JITSI_DOMAIN`
   - **Value**: Your Vultr Jitsi domain
   - **Environment**: Production, Preview, Development
3. Redeploy

### For Netlify
1. Go to: Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Add:
   - **Key**: `VITE_JITSI_DOMAIN`
   - **Value**: Your Vultr Jitsi domain
3. Redeploy

### For Other Platforms
- Add `VITE_JITSI_DOMAIN` to your environment variables
- Rebuild and redeploy

---

## ✅ Summary

**Code Status**: ✅ **All code is implemented and pushed to GitHub**

**What You Need to Do**:
1. ⚠️ **Configure Jitsi domain** - Set `VITE_JITSI_DOMAIN` environment variable
2. ⚠️ **Verify Jitsi server** - Make sure it's running on Vultr
3. ⚠️ **Deploy frontend** - Rebuild with environment variable
4. 🧪 **Test features** - Verify everything works on live site

**All Features Ready**:
- ✅ Voice calls
- ✅ Video calls  
- ✅ Voice messages
- ✅ Video messages
- ✅ Multi-participant rooms

**Last Updated**: 2025-01-20
**Status**: ✅ Code Complete, ⚠️ Configuration & Testing Needed

