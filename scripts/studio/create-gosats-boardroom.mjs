// Gosat's Boardroom -- S2G-run "place" (stalls.enter_via_front), same
// pattern as Grove Station/Companions Village/Scripture Study, EXCEPT one
// deliberate difference: those system accounts throw the login password
// away right after creation ("no one logs in as it"). This one doesn't --
// Davison needs to log in AS gosatsboardroom himself afterwards, to place
// and label its 4 interior hotspots with the normal "Mark your shelves"
// tap-to-mark editor (StallBuildPage -> HotspotEditor), the same
// self-service tool every other stall owner uses on their own stall. So
// this script requires GOSATS_BOARDROOM_PASSWORD to be set to a real
// password of your choosing, not generated/discarded.
//
// Run once, by hand (this is a one-off account+data seed, not a CI
// migration -- same reasoning as every other scripts/studio/create-*.sql):
//
//   SUPABASE_SERVICE_ROLE_KEY=<service_role key, Project Settings -> API> \
//   GOSATS_BOARDROOM_PASSWORD=<a real password you'll remember> \
//   node scripts/studio/create-gosats-boardroom.mjs
//
// Needs @supabase/supabase-js (already a project dependency). Idempotent:
// re-running with the same env vars is safe -- it looks up the account by
// email first and only creates it if missing; the stalls/profiles upserts
// always apply.
//
// After this runs: log in at sow2growapp.com as gosatsboardroom@sow2growapp.com
// with the password you set, go to "My Stall / Cockpit" -> the nav's
// "Gosat's Boardroom" entry will now show a real stall -- open
// /stall/build, click through to the hotspot step, tap the interior image
// 4 times to mark boxes, kind 'custom', and for each one paste the target
// route into the custom-link field:
//   Admin Dashboard & Wallet Settings -> /admin/dashboard
//   AOD Station Radio Management      -> /admin/radio
//   Treasury                          -> /admin/treasury
//   Seeds Management                  -> /admin/seeds
// then Publish. hotspots start empty on purpose -- Davison places them,
// not hardcoded coordinates guessed from the photo.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.GOSATS_BOARDROOM_PASSWORD;
const EMAIL = 'gosatsboardroom@sow2growapp.com';
const USERNAME = 'gosatsboardroom';
const DISPLAY_NAME = "Gosat's Boardroom";

if (!SERVICE_ROLE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY is not set. Nothing was done.'); process.exit(2); }
if (!PASSWORD || PASSWORD.length < 8) { console.error('GOSATS_BOARDROOM_PASSWORD is not set (or too short, <8 chars). Nothing was done.'); process.exit(2); }

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// 1. Find-or-create the auth user.
let userId;
{
  const { data: existing, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) { console.error('listUsers failed:', listErr.message); process.exit(1); }
  const found = existing.users.find((u) => u.email?.toLowerCase() === EMAIL);
  if (found) {
    userId = found.id;
    console.log('Account already exists:', EMAIL, '->', userId, '(leaving password as-is; re-run auth password reset by hand if you forgot it)');
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (createErr) { console.error('createUser failed:', createErr.message); process.exit(1); }
    userId = created.user.id;
    console.log('Created account:', EMAIL, '->', userId);
  }
}

// 2. Upload the two pre-converted WebP images (already resized to
// width=1216, quality 82 -- see the headless-Chromium canvas conversion
// used for every prior S2G system stall) to the public "stalls" bucket.
const IMAGES = [
  { local: 'E:/abbi/sow2grow/gosats-front.webp', remote: `${userId}/front.webp` },
  { local: 'E:/abbi/sow2grow/gosats-interior.webp', remote: `${userId}/interior.webp` },
];
for (const img of IMAGES) {
  const buf = readFileSync(img.local);
  const { error: uploadErr } = await admin.storage.from('stalls').upload(img.remote, buf, {
    contentType: 'image/webp',
    upsert: true,
  });
  if (uploadErr) { console.error(`upload failed for ${img.remote}:`, uploadErr.message); process.exit(1); }
  console.log('Uploaded', img.local, '->', img.remote, `(${buf.length} bytes)`);
}
const frontUrl = `${SUPABASE_URL}/storage/v1/object/public/stalls/${userId}/front.webp`;
const interiorUrl = `${SUPABASE_URL}/storage/v1/object/public/stalls/${userId}/interior.webp`;

// 3. Upsert the stalls row. hotspots: [] on purpose -- Davison marks the 4
// himself via the normal wizard, not hardcoded coordinates.
{
  const { error: stallErr } = await admin.from('stalls').upsert(
    {
      user_id: userId,
      tier: 'trading_house',
      category: 'trades_services', // closest fit -- none of STALL_CATEGORIES literally matches "admin place", same call Companions Village made
      name: DISPLAY_NAME,
      tagline: 'Elder management',
      front_image_path: frontUrl,
      interior_image_path: interiorUrl,
      hotspots: [],
      published: true,
      enter_via_front: true,
    },
    { onConflict: 'user_id' },
  );
  if (stallErr) { console.error('stalls upsert failed:', stallErr.message); process.exit(1); }
  console.log('stalls row upserted for', userId);
}

// 4. display_name / onboarding flags on the auto-created profiles row.
// Service-role client bypasses RLS, so no session-var escape hatch needed
// here (unlike the SQL-editor scripts, which ran as no one in particular).
{
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ display_name: DISPLAY_NAME, security_setup_complete: true, payout_setup_complete: true })
    .eq('user_id', userId);
  if (profileErr) { console.error('profiles update failed:', profileErr.message); process.exit(1); }
  console.log('profiles row updated for', userId);
}

console.log('\nDone. Log in as', EMAIL, 'with the password you set, then use /stall/build to mark the 4 hotspots.');
