# Jitsi Configuration - Manual Setup Guide

Since SSH access isn't working, here are alternative ways to configure your Jitsi server.

## Option 1: Use Vultr's Web Console (Try Again)

Sometimes the web console works better if you:
1. **Refresh the console page** completely
2. **Wait for the login prompt** (don't type until you see `login:`)
3. **Type slowly**: `root` then Enter
4. **Paste password carefully** (right-click to paste, or type it)
5. **Wait 2-3 seconds** before pressing Enter after password

## Option 2: Reset Root Password in Vultr

1. Go to Vultr Dashboard → Your Server → **Settings** tab
2. Look for **"Reset Root Password"** or **"Change Password"**
3. Click it and **generate a new password**
4. **Copy it immediately** (you might not see it again)
5. Wait 2-3 minutes for it to apply
6. Try SSH again: `ssh root@139.180.132.20`

## Option 3: Check if SSH Keys Are Required

1. Go to Vultr Dashboard → Your Server → **Settings**
2. Look for **"SSH Keys"** section
3. If SSH keys are listed, that's why password doesn't work
4. You'll need to either:
   - Add your SSH key to your computer
   - Or remove SSH keys and enable password authentication

## Option 4: Use Vultr's File Manager (If Available)

Some Vultr servers have a file manager:
1. Go to Vultr Dashboard → Your Server
2. Look for **"File Manager"** or **"Files"** tab
3. If available, navigate to: `/root/jitsi-meet/` or `/opt/jitsi-meet/`
4. Find the `.env` or `.env.jitsi` file
5. Edit it and add the configuration values

## Option 5: Contact Vultr Support

If nothing works:
1. Go to Vultr Dashboard → **Support**
2. Create a ticket explaining you can't access your server
3. Ask them to:
   - Reset root password
   - Enable password authentication
   - Or provide alternative access method

## Option 6: Use IP Address for Now (Temporary)

If you can't configure the domain right now, you can:
1. Keep using `139.180.132.20` in your app
2. Set up the domain later when you have server access
3. Your app will still work, just without the domain name

---

## Configuration Values to Add

When you can access your server, add these to your Jitsi `.env` file:

```bash
PUBLIC_URL=https://meet.sow2growapp.com
XMPP_DOMAIN=meet.sow2growapp.com
XMPP_AUTH_DOMAIN=meet.sow2growapp.com
XMPP_MUC_DOMAIN=muc.meet.sow2growapp.com
XMPP_BOSH_URL_BASE=https://meet.sow2growapp.com/http-bind

ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=meet.sow2growapp.com
LETSENCRYPT_EMAIL=your-email@sow2growapp.com

ENABLE_HTTP_REDIRECT=1
DISABLE_HTTPS=0
```

**Important**: Replace `your-email@sow2growapp.com` with your actual email address!

---

## After Configuration

Once you've updated the `.env` file:
1. Restart Jitsi: `docker-compose down && docker-compose up -d`
2. Wait 5 minutes for SSL certificate to generate
3. Test: `https://meet.sow2growapp.com`
4. Update your app: Change `VITE_JITSI_DOMAIN` to `meet.sow2growapp.com`

---

## Quick Decision

**Right now, what should you do?**

1. **Try Vultr Support** - They can help you access your server
2. **Use IP for now** - Your app works with `139.180.132.20`, we can add domain later
3. **Keep trying console** - Sometimes it works on the 10th try

**My recommendation**: Contact Vultr support to reset password or enable access. It's the fastest way to get this resolved.

