# Supabase Configuration Guide

This guide provides step-by-step instructions for configuring security settings in your Supabase Dashboard.

## 🔴 CRITICAL: Enable Leaked Password Protection

### Why This Matters
Prevents users from using passwords that have appeared in data breaches, protecting accounts from credential stuffing attacks.

### Step-by-Step Instructions

1. **Access Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Sign in with your account
   - Select your project: `zuwkgasbkpjlxzsjzumu`

2. **Navigate to Authentication Settings**
   - Click **"Authentication"** in the left sidebar
   - Click **"Settings"** (or **"Policies"** depending on your Supabase version)
   - Scroll to the **"Password Protection"** section

3. **Enable Leaked Password Protection**
   - Find the toggle: **"Check passwords against Have I Been Pwned database"**
   - **Toggle it ON** ✅
   - This will check all new passwords against the Have I Been Pwned database

4. **Configure Password Strength Requirements** (Recommended)
   - **Minimum Length**: Set to **10 characters** (matches our code validation)
   - **Require Uppercase**: ✅ Enable
   - **Require Lowercase**: ✅ Enable
   - **Require Numbers**: ✅ Enable
   - **Require Special Characters**: ✅ Enable (recommended)

5. **Enable Password History** (Optional but Recommended)
   - **Password History**: Enable
   - **History Count**: Set to **5** (prevents reusing last 5 passwords)

6. **Save Changes**
   - Click **"Save"** or **"Update"** button
   - Wait for confirmation message

7. **Verify Configuration**
   - Try creating a test account with a known compromised password (e.g., "password123")
   - The system should reject it with an error message
   - Try a weak password (e.g., "abc123") - should also be rejected
   - Try a strong password (e.g., "MyStr0ng!P@ssw0rd") - should be accepted

### Alternative Path (If Above Doesn't Work)

Some Supabase versions have different UI layouts:

1. Go to **Authentication** → **Policies**
2. Look for **"Password Policies"** section
3. Enable **"Have I Been Pwned"** integration
4. Configure password requirements

### API Configuration (If Available)

If Supabase API supports it, you can configure via API:

```bash
# Note: This may not be available in all Supabase plans
curl -X PATCH 'https://api.supabase.com/v1/projects/{project_id}/config/auth' \
  -H 'Authorization: Bearer {service_role_key}' \
  -H 'Content-Type: application/json' \
  -d '{
    "password": {
      "hibp_enabled": true,
      "min_length": 10,
      "require_uppercase": true,
      "require_lowercase": true,
      "require_numbers": true,
      "require_special": true
    }
  }'
```

**Note**: API configuration may require service role key and may not be available in all Supabase plans. Dashboard configuration is the recommended approach.

---

## 🟡 MEDIUM: Verify Database Functions search_path

### Why This Matters
Prevents potential schema injection attacks by ensuring functions only access the public schema.

### Step-by-Step Instructions

1. **Access Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

2. **Run Verification Query**
   Copy and paste this query:

   ```sql
   SELECT 
       p.proname as function_name,
       CASE 
           WHEN p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'sql') THEN 'sql'
           WHEN p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql') THEN 'plpgsql'
           ELSE 'unknown'
       END as language,
       CASE 
           WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
           WHEN p.provolatile = 's' THEN 'STABLE'
           ELSE 'VOLATILE'
       END as volatility,
       pg_get_functiondef(p.oid) as function_definition
   FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public'
   AND p.prosecdef = true  -- SECURITY DEFINER functions only
   AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%'
   AND pg_get_functiondef(p.oid) NOT LIKE '%search_path =%'
   AND pg_get_functiondef(p.oid) NOT LIKE '%search_path TO%'
   ORDER BY p.proname;
   ```

3. **Review Results**
   - If **no rows** are returned: ✅ All functions are properly configured!
   - If **any rows** are returned: Functions need to be fixed (see step 4)

4. **Fix Functions (If Needed)**
   For each function found, update it with this pattern:

   ```sql
   CREATE OR REPLACE FUNCTION public.function_name(...)
   RETURNS ...
   LANGUAGE plpgsql  -- or 'sql' depending on the function
   SECURITY DEFINER
   SET search_path = public  -- ADD THIS LINE
   AS $$
   BEGIN
     -- function body (from function_definition column)
   END;
   $$;
   ```

5. **Run Comprehensive Fix Migration**
   - In SQL Editor, open the migration file: `supabase/migrations/20250103000001_comprehensive_fix_all_functions_search_path.sql`
   - Copy its contents
   - Paste into SQL Editor
   - Click **"Run"**
   - This will fix all known functions

6. **Verify Fix**
   - Run the verification query again (step 2)
   - Should return no rows

---

## 🟢 OPTIONAL: Set Up Rate Limiter Monitoring

### Why This Matters
Provides visibility into rate limiter failures and helps detect potential abuse or system issues.

### Option 1: Console Monitoring (Already Implemented)

Rate limiter failures are already logged to console with structured JSON. You can:

1. **View Logs in Supabase Dashboard**
   - Go to **"Logs"** → **"Edge Functions"**
   - Filter for: `🚨 Rate Limiter Failure`
   - Monitor for patterns

2. **Set Up Browser Console Monitoring** (Development)
   - Open browser DevTools
   - Filter console for: `Rate Limiter Failure`
   - Monitor in real-time

### Option 2: Integrate with Monitoring Service

1. **Install Monitoring Library** (e.g., Sentry)
   ```bash
   npm install @sentry/browser
   ```

2. **Initialize in Your App**
   ```typescript
   import * as Sentry from "@sentry/browser";
   
   Sentry.init({
     dsn: "your-sentry-dsn",
     environment: import.meta.env.MODE,
   });
   ```

3. **Update Rate Limiter** (already has hooks for this)
   The rate limiter already logs structured data. You can add:
   ```typescript
   // In rateLimiter.ts, add:
   Sentry.captureException(new Error('Rate limiter failure'), {
     extra: logData,
     level: 'warning'
   });
   ```

### Option 3: Custom Monitoring Endpoint

Create an edge function to collect rate limiter failures:

1. **Create Edge Function**: `supabase/functions/monitor-rate-limiter-failures/index.ts`
2. **Send failures to it** from rate limiter
3. **Store in database** for analysis
4. **Set up alerts** based on thresholds

---

## 📋 Configuration Checklist

- [ ] **Leaked Password Protection**: Enabled in Supabase Dashboard
- [ ] **Password Requirements**: Configured (10+ chars, complexity)
- [ ] **Password History**: Enabled (optional)
- [ ] **Database Functions**: Verified with SQL query
- [ ] **Functions Fixed**: All functions have search_path set
- [ ] **Rate Limiter Monitoring**: Set up (optional)

---

## 🔗 Useful Links

- Supabase Dashboard: https://supabase.com/dashboard
- Supabase Auth Docs: https://supabase.com/docs/guides/auth/password-security
- Have I Been Pwned: https://haveibeenpwned.com/
- Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

---

## ⚠️ Important Notes

1. **Leaked Password Protection**: This is a Dashboard-only setting. There's no code-based workaround.
2. **Database Functions**: Migrations have been created to fix functions. Run them in SQL Editor.
3. **Rate Limiter**: Already fixed in code. Monitoring is optional but recommended for production.

---

**Last Updated**: 2025-01-03
**Project**: zuwkgasbkpjlxzsjzumu

