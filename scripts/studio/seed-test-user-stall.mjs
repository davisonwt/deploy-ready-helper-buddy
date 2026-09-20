import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';

const envTest = '.env.test';
if (existsSync(envTest)) {
  for (const line of readFileSync(envTest, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

// 2026-09-20: this used to find Davison's real, published stall and copy
// its front_image_path/interior_image_path straight onto this test row
// "so the pre-flight is realistic" -- found live, that's exactly how
// Sabbath Test Stall ended up displaying his personal branded photo to
// every visitor of the Tribal Gardens feed (its front.webp was a byte-
// for-byte copy of his; confirmed via matching MD5). Fixed at the data
// layer (scripts/studio/fix-davison-image-bug-20260920.sql, which
// deleted that row) and at the DB layer (supabase/migrations/
// 20260920121500_stall_image_ownership_guard.sql, a trigger that now
// REJECTS any stalls row whose front/interior path points at a
// different user's own storage folder) -- but the real fix is not
// reading a live member's account at all. This now points at the same
// shared, sanctioned "Farm Stall" template (public/stalls/templates/)
// the wizard's own "start from a template" button offers, with that
// template's own known-good hotspot layout (templates.json) -- a
// populated-looking preview for QA, with no dependency on which real
// accounts happen to exist or what they've published.

const FARM_STALL_TEMPLATE = {
  front: '/stalls/templates/farm-stall-front.png',
  interior: '/stalls/templates/farm-stall-interior.png',
  hotspots: [
    { kind: 'books', label: 'Books', x: 5.9, y: 67.0, w: 20.6, h: 20.0 },
    { kind: 'music', label: 'Music', x: 28.4, y: 67.0, w: 20.6, h: 20.0 },
    { kind: 'lyrics', label: 'Lyrics', x: 50.8, y: 67.0, w: 20.6, h: 20.0 },
    { kind: 'story', label: 'My Story', x: 73.4, y: 67.0, w: 20.8, h: 20.0 },
  ],
};

const testUserClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const { data: auth, error: authErr } = await testUserClient.auth.signInWithPassword({
  email: process.env.TEST_USER_EMAIL,
  password: process.env.TEST_USER_PASSWORD,
});
if (authErr || !auth.user) { console.log('TEST_USER login failed:', authErr?.message); process.exit(1); }

const { data: upserted, error: upsertErr } = await testUserClient
  .from('stalls')
  .upsert(
    {
      user_id: auth.user.id,
      name: 'Sabbath Test Stall',
      tagline: null,
      tier: 'farm_stall',
      category: 'music',
      categories: ['music', 'books_writing'],
      front_image_path: FARM_STALL_TEMPLATE.front,
      interior_image_path: FARM_STALL_TEMPLATE.interior,
      hotspots: FARM_STALL_TEMPLATE.hotspots,
      published: true,
    },
    { onConflict: 'user_id' },
  )
  .select('user_id, name, tier, published, hotspots')
  .single();

if (upsertErr) { console.log('upsert error:', upsertErr.message); process.exit(1); }
console.log('TEST_USER stall row now:', upserted);
await testUserClient.auth.signOut();
