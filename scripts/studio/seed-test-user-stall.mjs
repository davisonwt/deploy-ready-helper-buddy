import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
// different user's own storage folder).
//
// The first fix here pointed at the shared "Farm Stall" template instead
// (public/stalls/templates/) -- still wrong: that template IS Davison's
// own personally-branded photo (the actual site content, not a stand-in
// for it), just reached through the wizard's own sanctioned button
// rather than copied directly. A test fixture has no business using
// ANYONE's real content, template or not.
//
// This now uploads two plain, generated placeholder images (flat
// background, "TEST STALL" / "TEST STALL INTERIOR" text, nothing
// resembling any real stall's artwork or branding), committed at
// public/stalls/test-fixtures/, INTO the test user's own storage folder
// -- not a new shared static path. stalls_images_own_folder_or_template
// (20260913210000, a pre-existing CHECK constraint separate from the
// ownership trigger above) only allows a stall's own folder or the
// shared template path; uploading into the test account's own folder
// satisfies that legitimately, the same way any real member's own
// wizard upload does, rather than needing a new exemption carved into
// either guard for a path nothing else would ever use.

const TEST_FIXTURE_LOCAL = {
  front: resolve(__dirname, '../../public/stalls/test-fixtures/test-stall-front.webp'),
  interior: resolve(__dirname, '../../public/stalls/test-fixtures/test-stall-interior.webp'),
};

const HOTSPOTS = [
  { kind: 'books', label: 'Books', x: 5.9, y: 67.0, w: 20.6, h: 20.0 },
  { kind: 'music', label: 'Music', x: 28.4, y: 67.0, w: 20.6, h: 20.0 },
  { kind: 'lyrics', label: 'Lyrics', x: 50.8, y: 67.0, w: 20.6, h: 20.0 },
  { kind: 'story', label: 'My Story', x: 73.4, y: 67.0, w: 20.8, h: 20.0 },
];

const testUserClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const { data: auth, error: authErr } = await testUserClient.auth.signInWithPassword({
  email: process.env.TEST_USER_EMAIL,
  password: process.env.TEST_USER_PASSWORD,
});
if (authErr || !auth.user) { console.log('TEST_USER login failed:', authErr?.message); process.exit(1); }

const uid = auth.user.id;
const frontPath = `${uid}/front.webp`;
const interiorPath = `${uid}/interior.webp`;

const { error: frontUploadErr } = await testUserClient.storage
  .from('stalls')
  .upload(frontPath, readFileSync(TEST_FIXTURE_LOCAL.front), { upsert: true, contentType: 'image/webp' });
if (frontUploadErr) { console.log('front upload error:', frontUploadErr.message); process.exit(1); }

const { error: interiorUploadErr } = await testUserClient.storage
  .from('stalls')
  .upload(interiorPath, readFileSync(TEST_FIXTURE_LOCAL.interior), { upsert: true, contentType: 'image/webp' });
if (interiorUploadErr) { console.log('interior upload error:', interiorUploadErr.message); process.exit(1); }

const { data: frontPub } = testUserClient.storage.from('stalls').getPublicUrl(frontPath);
const { data: interiorPub } = testUserClient.storage.from('stalls').getPublicUrl(interiorPath);

const { data: upserted, error: upsertErr } = await testUserClient
  .from('stalls')
  .upsert(
    {
      user_id: uid,
      name: 'Sabbath Test Stall',
      tagline: null,
      tier: 'farm_stall',
      category: 'music',
      categories: ['music', 'books_writing'],
      front_image_path: `${frontPub.publicUrl}?v=${Date.now()}`,
      interior_image_path: `${interiorPub.publicUrl}?v=${Date.now()}`,
      hotspots: HOTSPOTS,
      published: true,
    },
    { onConflict: 'user_id' },
  )
  .select('user_id, name, tier, published, hotspots, front_image_path, interior_image_path')
  .single();

if (upsertErr) { console.log('upsert error:', upsertErr.message); process.exit(1); }
console.log('TEST_USER stall row now:', upserted);
await testUserClient.auth.signOut();
