# Deploy calendar-now Function to Supabase

## Option 1: Deploy via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**:
   - Open: https://supabase.com/dashboard/project/zuwkgasbkpjlxzsjzumu
   - Click: **Edge Functions** (left sidebar)

2. **Create/Deploy the Function**:
   - Click **"New Function"** or find **calendar-now** if it exists
   - Function name: `calendar-now`
   - Copy the contents of `supabase/functions/calendar-now/index.ts`
   - Paste into the code editor
   - Click **"Deploy"** or **"Save"**

3. **Verify Deployment**:
   - The function should appear in your Edge Functions list
   - Test it by visiting: `https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/calendar-now`
   - You should see a JSON response with timestamp and calendar data

## Option 2: Deploy via CLI (If Config Fixed)

If you fix the `supabase/config.toml` file, you can use:

```bash
supabase functions deploy calendar-now --project-ref zuwkgasbkpjlxzsjzumu
```

## Option 3: Use Supabase CLI with Environment Variables

```bash
# Set environment variables
$env:SUPABASE_ACCESS_TOKEN="your-access-token"
$env:SUPABASE_PROJECT_ID="zuwkgasbkpjlxzsjzumu"

# Deploy
supabase functions deploy calendar-now --project-ref zuwkgasbkpjlxzsjzumu
```

## Verify the Function Works

After deployment, test the endpoint:

```bash
curl https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/calendar-now
```

Expected response:
```json
{
  "timestamp": "2025-11-28T...",
  "year": 6028,
  "dayOfYear": 12,
  "unix": 1732800000000,
  "timezone": "Africa/Johannesburg"
}
```

## Function Configuration

The function is configured with:
- ✅ CORS headers enabled
- ✅ No authentication required (public endpoint)
- ✅ Returns server timestamp and calendar data

## Next Steps

Once deployed, the bead calendar UI will automatically use this endpoint:
- Frontend code is already configured to call: `/api/calendar/now`
- Vite proxy is configured to route to Supabase Edge Function
- Client display will fallback to client-side calculation if server unavailable

