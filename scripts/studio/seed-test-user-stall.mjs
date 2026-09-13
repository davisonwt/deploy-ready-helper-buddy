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

// 1. Find Davison's real, published stall (public data, readable by anon
// via stalls_read_published) by the user_id prefix given: 04754d57-...
const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const { data: published, error: pubErr } = await anon
  .from('stalls')
  .select('user_id, name, tagline, tier, category, front_image_path, interior_image_path, hotspots, published')
  .eq('published', true);
if (pubErr) { console.log('published stalls query error:', pubErr.message); process.exit(1); }

const source = (published ?? []).find((s) => s.user_id.startsWith('04754d57'));
if (!source) {
  console.log('Could not find a published stall with user_id starting 04754d57 among', published?.length, 'published stalls.');
  console.log('user_ids seen:', published?.map((s) => s.user_id));
  process.exit(1);
}
console.log('Source stall found:', { user_id: source.user_id, name: source.name, tier: source.tier, category: source.category, hotspots: source.hotspots });

// scripts/studio/move-stall-to-davison.sql's own intended hotspot layout
// for this exact interior image (books/music/lyrics/story painted signs)
// -- the live row's own `hotspots` column reads back null right now (that
// migration may not have landed, or got reset), so this is the known-good
// layout for this specific artwork rather than trusting a null copy.
const REAL_HOTSPOTS = [
  { kind: 'books', label: 'Books', x: 6.2, y: 68.5, w: 20.0, h: 21.2 },
  { kind: 'music', label: 'Music', x: 28.5, y: 68.5, w: 20.0, h: 21.2 },
  { kind: 'lyrics', label: 'Lyrics', x: 50.8, y: 68.5, w: 20.3, h: 21.2 },
  { kind: 'story', label: 'My Story', x: 73.4, y: 68.5, w: 20.4, h: 21.2 },
];

// 2. Sign in as TEST_USER and insert (or replace) their own stalls row,
// copying the real front/interior images + hotspots so the pre-flight is
// realistic, but with its own name so it's clearly the test stall.
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
      tagline: source.tagline ?? null,
      tier: source.tier,
      category: source.category,
      front_image_path: source.front_image_path,
      interior_image_path: source.interior_image_path,
      hotspots: REAL_HOTSPOTS,
      published: true,
    },
    { onConflict: 'user_id' },
  )
  .select('user_id, name, tier, published, hotspots')
  .single();

if (upsertErr) { console.log('upsert error:', upsertErr.message); process.exit(1); }
console.log('TEST_USER stall row now:', upserted);
await testUserClient.auth.signOut();
