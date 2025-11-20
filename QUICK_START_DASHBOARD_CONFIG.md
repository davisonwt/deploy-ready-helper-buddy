# Quick Start: Complete Your Security Configuration

## 🎯 What You Need to Do

You need to configure **2 settings** in your Supabase Dashboard. These take about **5-10 minutes** total.

---

## Step 1: Configure OTP Expiry (2 minutes)

### What This Does
Makes your password reset and email verification links last longer so users don't get frustrated with expired links.

### How to Do It

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Log in with your account
   - Select your project (the one for sow2growapp.com)

2. **Navigate to Authentication Settings**
   - In the left sidebar, click **"Authentication"**
   - Click **"Settings"** (or look for a gear icon)

3. **Find OTP/Token Expiry Settings**
   - Scroll down to find **"Email Auth"** section
   - Look for **"OTP Expiry"** or **"Token Expiry"** or **"Link Expiry"**
   - You might see it as:
     - A number field with seconds
     - A dropdown with time options
     - A setting called "Email confirmation link expiry"

4. **Set the Values**
   - **Email Verification**: Set to **3600** (or select "60 minutes" or "1 hour")
   - **Password Reset**: Set to **1800** (or select "30 minutes")
   - If there's only one setting, set it to **3600** (60 minutes)

5. **Save**
   - Click **"Save"** or **"Update"** button
   - You should see a success message

### ✅ How to Verify It Worked
- Request a password reset
- Check the email - the link should work for at least 30 minutes

---

## Step 2: Enable Leaked Password Protection (3 minutes)

### What This Does
Prevents users from using passwords that have been leaked in data breaches (like "password123" or "12345678").

### How to Do It

1. **Still in Supabase Dashboard**
   - You should still be in **Authentication** → **Settings**
   - If not, go back there

2. **Find Password Policies**
   - Look for **"Password"** section or **"Password Policies"**
   - Scroll down if needed
   - You might see it under:
     - "Password Requirements"
     - "Password Settings"
     - "Password Protection"

3. **Enable Have I Been Pwned Check**
   - Find the toggle or checkbox for:
     - **"Check passwords against Have I Been Pwned database"**
     - **"Enable password breach detection"**
     - **"Block compromised passwords"**
   - **Turn it ON** ✅

4. **Set Password Requirements**
   - **Minimum Length**: Change to **10** (or at least 8)
   - **Require Uppercase**: Turn ON ✅
   - **Require Lowercase**: Turn ON ✅
   - **Require Numbers**: Turn ON ✅
   - **Require Special Characters**: Turn ON ✅
   - **Password History** (if available): Turn ON ✅ and set to **5**

5. **Save**
   - Click **"Save"** or **"Update"** button
   - You should see a success message

### ✅ How to Verify It Worked
- Try to create a new account with password: `password123`
- It should be **rejected** with a message about leaked password
- Try password: `MySecureP@ssw0rd2024!`
- It should be **accepted**

---

## Step 3: Update Email Templates (Optional - 2 minutes)

### What This Does
Makes your emails clearer about when links expire.

### How to Do It

1. **Go to Email Templates**
   - In Supabase Dashboard, go to **Authentication** → **Email Templates**
   - You'll see templates like:
     - "Confirm signup"
     - "Reset password"
     - "Magic Link"

2. **Update Password Reset Template**
   - Click on **"Reset password"** template
   - Find where it says something like "Click here to reset"
   - Add text like: **"This link will expire in 30 minutes"**
   - Click **"Save"**

3. **Update Signup Confirmation Template**
   - Click on **"Confirm signup"** template
   - Add text like: **"This link will expire in 60 minutes"**
   - Click **"Save"**

---

## 📸 Visual Guide (What to Look For)

### OTP Expiry Setting
Look for something like this:
```
Email Auth
├── Enable email confirmations: [ON]
├── OTP Expiry: [3600] seconds  ← Change this
└── ...
```

### Password Protection Setting
Look for something like this:
```
Password
├── Minimum length: [10]  ← Change this
├── Require uppercase: [✓]  ← Check this
├── Require lowercase: [✓]  ← Check this
├── Require numbers: [✓]  ← Check this
├── Require special chars: [✓]  ← Check this
└── Check against HIBP: [✓]  ← Check this
```

---

## ⚠️ If You Can't Find These Settings

### Option 1: Different Supabase Version
- Some settings might be in different locations
- Look for **"Configuration"** instead of **"Settings"**
- Check **"Policies"** tab in Authentication

### Option 2: Contact Support
- Supabase support: https://supabase.com/support
- They can help you locate the exact settings

### Option 3: Check Documentation
- Supabase Auth docs: https://supabase.com/docs/guides/auth
- Search for "OTP expiry" or "password policies"

---

## ✅ Final Checklist

After completing all steps:

- [ ] OTP expiry set to 60 minutes (or 3600 seconds)
- [ ] Password reset expiry set to 30 minutes (or 1800 seconds)
- [ ] Leaked password check enabled
- [ ] Minimum password length set to 10
- [ ] All password requirements enabled
- [ ] Settings saved successfully
- [ ] Tested with a leaked password (should be rejected)
- [ ] Tested with a strong password (should be accepted)

---

## 🎉 You're Done!

Once you complete these steps:
- ✅ Your security configuration is **100% complete**
- ✅ Your payment system is **fully secured**
- ✅ Users can't use weak or leaked passwords
- ✅ Password reset links won't expire too quickly

**Time Required**: 5-10 minutes  
**Difficulty**: Easy (just clicking buttons in a dashboard)

---

## 📞 Need Help?

If you get stuck:
1. Check the detailed guide: [`SUPABASE_DASHBOARD_SECURITY_CONFIG.md`](./SUPABASE_DASHBOARD_SECURITY_CONFIG.md)
2. Take a screenshot of what you see and I can help you find the right setting
3. Contact Supabase support

---

**That's it!** Just follow these steps and you'll be fully secured. 🛡️

