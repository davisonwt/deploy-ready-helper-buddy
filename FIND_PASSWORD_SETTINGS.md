# How to Find Password Settings in Supabase Dashboard

## 🔍 Alternative Locations to Check

The password settings might be in different places depending on your Supabase version. Try these locations:

---

## Method 1: Authentication → Settings → Auth Configuration

1. Go to **Authentication** in left sidebar
2. Click **"Settings"** (or **"Configuration"**)
3. Look for these sections:
   - **"Auth Configuration"**
   - **"Email Auth"**
   - **"Password Requirements"**
   - **"Security"**

---

## Method 2: Authentication → Policies Tab

1. Go to **Authentication** in left sidebar
2. Look for a **"Policies"** tab (not Row Level Security policies)
3. Click on it
4. Look for password-related settings

---

## Method 3: Project Settings → Auth

1. Click on your **project name** (top left)
2. Go to **"Project Settings"** (gear icon)
3. Click **"Auth"** in the left menu
4. Look for password settings there

---

## Method 4: Search in Dashboard

1. Use the **search bar** at the top of Supabase Dashboard
2. Search for:
   - "password"
   - "pwned"
   - "HIBP"
   - "breach"

---

## Method 5: Check Authentication Providers

1. Go to **Authentication** → **Providers**
2. Look for **"Email"** provider
3. Click on it - password settings might be there

---

## Method 6: API Settings

1. Go to **Settings** (gear icon in sidebar)
2. Click **"API"**
3. Look for **"Auth"** or **"Authentication"** section
4. Password settings might be nested there

---

## 🆘 If You Still Can't Find It

### Option A: It Might Not Be Available Yet

Some Supabase projects might not have this feature enabled yet. In that case:

1. **Check Your Supabase Version**
   - Go to **Settings** → **General**
   - Check your project version
   - Newer versions have more security features

2. **Contact Supabase Support**
   - They can enable it for you
   - Or tell you if it's available in your region/plan

### Option B: Use Supabase CLI/API

You can configure this via code instead:

```sql
-- Check if you can set password policies via SQL
-- This might not work, but worth trying
ALTER DATABASE postgres SET password_policy.min_length = 10;
```

### Option C: Check Supabase Documentation

1. Go to: https://supabase.com/docs/guides/auth
2. Search for "password policies" or "HIBP"
3. Check if there's a specific way to enable it for your version

---

## 📸 What to Look For

The setting might be labeled as:
- ✅ "Check passwords against Have I Been Pwned database"
- ✅ "Enable password breach detection"
- ✅ "Block compromised passwords"
- ✅ "Password strength requirements"
- ✅ "Password validation"
- ✅ "HIBP integration"

---

## 🔄 Alternative: Configure via Environment Variables

If the UI doesn't have it, you might need to:

1. **Check Supabase Config File**
   - Look for `supabase/config.toml`
   - Password policies might be configurable there

2. **Use Supabase Management API**
   - Some settings can be changed via API
   - Check Supabase API documentation

---

## 💡 Quick Workaround

If you can't find the setting, you can still protect against weak passwords by:

1. **Client-Side Validation** (already implemented in your code)
2. **Server-Side Validation** in your edge functions
3. **Manual Review** of user registrations

But the HIBP check is the best protection - so let's try to find it!

---

## 🎯 Next Steps

1. **Try all the methods above**
2. **Take a screenshot** of what you see in Authentication → Settings
3. **Check your Supabase plan** - some features are only on paid plans
4. **Contact me** with what you see and I'll help you locate it

---

## 📞 What to Tell Me

If you still can't find it, tell me:
1. What tabs/sections you see under "Authentication"
2. What your Supabase plan is (Free, Pro, Team, Enterprise)
3. A screenshot of the Authentication → Settings page (if possible)

Then I can give you more specific guidance!

