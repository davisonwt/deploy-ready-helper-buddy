# Fix 401 Error: Missing Authorization Header

## The Problem
Supabase Edge Functions require authentication by default. Even if your function code doesn't check auth, Supabase's platform enforces it unless you disable JWT verification.

## Solution: Disable JWT Verification in Dashboard

### Step-by-Step Instructions:

1. **Go to Supabase Dashboard**:
   - Open: https://supabase.com/dashboard/project/zuwkgasbkpjlxzsjzumu/edge-functions

2. **Find the calendar-now function**:
   - Click on `calendar-now` in the list

3. **Open Settings**:
   - Look for a **Settings** tab or gear icon
   - Or look for **Configuration** or **Security** section

4. **Disable JWT Verification**:
   - Find **"Verify JWT"** toggle or checkbox
   - **Turn it OFF** (set to `false`)
   - This allows the function to be called without authentication

5. **Save Changes**:
   - Click **Save** or **Update**

6. **Redeploy** (if needed):
   - Make sure the function code is deployed with the latest version
   - The code should use `Deno.serve` (which it does)

## Alternative: Use Anon Key in Requests

If you can't disable JWT verification, the bead calendar UI already sends the anon key. Make sure your environment variables are set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The component will automatically include these in requests.

## Test After Fix

Once JWT verification is disabled, test:

```bash
curl https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/calendar-now
```

Should return JSON without 401 error.

## If Settings Not Visible

If you can't find the JWT verification setting:
1. Check if you have the right permissions (project owner/admin)
2. Try using Supabase CLI: `supabase functions deploy calendar-now --no-verify-jwt`
3. Or check the function's `config.toml` entry (already set to `verify_jwt = false`)

## Current Status

✅ Function code updated (uses Deno.serve)
✅ Bead calendar UI sends auth headers
✅ Config file has `verify_jwt = false`
⏳ **Need to disable JWT verification in Dashboard**

