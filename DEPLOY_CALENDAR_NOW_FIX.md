# Fix calendar-now Function Authentication

## Issue
The function is returning `{"code":401,"message":"Missing authorization header"}` because Supabase Edge Functions require authentication by default.

## Solution: Make Function Public

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/zuwkgasbkpjlxzsjzumu/edge-functions
2. Click on **calendar-now** function
3. Go to **Settings** or **Configuration**
4. Find **"Verify JWT"** or **"Require Authentication"** setting
5. **Turn it OFF** or set to **false**
6. Click **Save**

### Option 2: Update Function Code

The function code has been updated to handle requests without authentication. You need to redeploy it:

1. Copy the updated code from `supabase/functions/calendar-now/index.ts`
2. Go to Supabase Dashboard → Edge Functions → calendar-now
3. Paste the updated code
4. Click **Deploy**

### Option 3: Use Supabase CLI (If Config Works)

```bash
# The config.toml already has verify_jwt = false for calendar-now
# But you need to redeploy the function
supabase functions deploy calendar-now --project-ref zuwkgasbkpjlxzsjzumu
```

## Test After Fix

Once configured, test with:

```bash
# Should work without auth headers
curl https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/calendar-now
```

Expected response:
```json
{
  "timestamp": "2025-11-28T...",
  "year": 6028,
  "dayOfYear": 12,
  "unix": 1732800000000,
  "timezone": "UTC"
}
```

## Current Status

✅ Function code updated to handle public requests
✅ CalendarWheel component sends auth headers (works either way)
⏳ Need to configure function in Dashboard to disable JWT verification

