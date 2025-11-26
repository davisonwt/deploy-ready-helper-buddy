# Apply Music Price Update - Quick Guide

## 🎵 Update All Single Music Tracks to 2 USDC

This will update all existing single music tracks from 1.25 USDC (or other prices) to 2 USDC minimum.

---

## ✅ Step 1: Go to Supabase Dashboard

1. Open: https://supabase.com/dashboard/project/zuwkgasbkpjlxzsjzumu
2. Click: **SQL Editor** (left sidebar)

---

## ✅ Step 2: Run the Migration

1. Click **New Query**
2. Copy the entire contents of this file: `supabase/migrations/20251126090000_update_all_single_music_to_2usdc.sql`
3. Paste into SQL Editor
4. Click **Run** (or press Ctrl+Enter)

---

## ✅ Step 3: Verify the Update

After running, you should see:
- "Success" message
- Number of rows updated

To verify prices were updated:

```sql
-- Check s2g_library_items prices
SELECT id, title, price, tags 
FROM s2g_library_items 
WHERE type = 'music' 
  AND (tags IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(tags) AS tag 
    WHERE LOWER(tag) LIKE '%album%' 
       OR LOWER(tag) LIKE '%lp%' 
       OR LOWER(tag) LIKE '%ep%'
  ))
ORDER BY created_at DESC
LIMIT 10;

-- Check dj_music_tracks prices
SELECT id, track_title, price, tags 
FROM dj_music_tracks 
WHERE track_type = 'music'
  AND (tags IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(tags) AS tag 
    WHERE LOWER(tag) LIKE '%album%' 
       OR LOWER(tag) LIKE '%lp%' 
       OR LOWER(tag) LIKE '%ep%'
  ))
ORDER BY created_at DESC
LIMIT 10;
```

All single music tracks should now show `price = 2.00` (or higher if sower set custom price).

---

## 📝 What This Does:

- ✅ Updates all single music tracks in `s2g_library_items` to 2.00 USDC
- ✅ Updates all single music tracks in `dj_music_tracks` to 2.00 USDC
- ✅ Only updates tracks where `price < 2.00` (including 1.25, 0, NULL)
- ✅ **Preserves albums** - Albums keep their original prices
- ✅ Updates `updated_at` timestamp

---

## ⚠️ Note:

After running this migration, refresh your S2G Community Music Library page to see the updated prices!

