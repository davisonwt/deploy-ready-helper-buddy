/**
 * ONE-OFF backfill: give every wheel_seed_details row with missing
 * coordinates a real position, by geocoding its own base_location text
 * through the deployed geocode-place edge function.
 *
 * Why this exists: sleeping_wheels_near() skips any row whose base_lat or
 * base_lng is null, so such a listing is registered but permanently
 * invisible in the Sleeping Seeds hub. Commit e708f424 stopped NEW
 * listings from being saved that way. This repairs anything created
 * before it.
 *
 * DRY RUN BY DEFAULT. It writes nothing until you pass --apply.
 *
 *   node scripts/studio/backfill-wheel-coordinates.mjs            # report only
 *   node scripts/studio/backfill-wheel-coordinates.mjs --apply    # write
 *
 * Required environment:
 *   SUPABASE_SECRET_KEY      the sb_secret_... default key (writes bypass RLS,
 *                            because rows belong to many different owners)
 *   WHEEL_BACKFILL_EMAIL     any real member login; geocode-place requires a
 *   WHEEL_BACKFILL_PASSWORD  user JWT (verify_jwt = true). Falls back to
 *                            TEST_USER_EMAIL / TEST_USER_PASSWORD, then
 *                            TEST_A_EMAIL / TEST_A_PASSWORD from .env.test.
 *
 * Never pass a key as a command-line argument: it lands in shell history.
 *
 * Safety rules this script keeps:
 *   - A row whose base_location is blank is REPORTED and skipped, never
 *     guessed at. There is nothing to geocode.
 *   - A geocode miss is REPORTED and skipped. It never writes a fallback
 *     or an approximate country centroid. A wrong coordinate is worse than
 *     a null one, because a null is at least visibly broken.
 *   - It only ever fills nulls. It never overwrites a coordinate that is
 *     already set.
 *   - Requests are paced for Nominatim's ~1/sec policy. Cache hits inside
 *     geocode-place make repeats cheap.
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY
  || 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

const APPLY = process.argv.includes('--apply');
const PACE_MS = 1200;

// Same plain KEY=VALUE reader the Playwright configs use.
const envTest = resolve(process.cwd(), '.env.test');
if (existsSync(envTest)) {
  for (const line of readFileSync(envTest, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const SECRET = process.env.SUPABASE_SECRET_KEY;
const EMAIL = process.env.WHEEL_BACKFILL_EMAIL || process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL;
const PASSWORD = process.env.WHEEL_BACKFILL_PASSWORD || process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!SECRET) fail('Set SUPABASE_SECRET_KEY (the sb_secret_... default key) and run again.');
if (!EMAIL || !PASSWORD) {
  fail('Set WHEEL_BACKFILL_EMAIL and WHEEL_BACKFILL_PASSWORD, or have TEST_USER_* / TEST_A_* in .env.test. '
    + 'geocode-place needs a signed-in user.');
}

const admin = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false } });
const asUser = createClient(SUPABASE_URL, PUBLISHABLE, { auth: { persistSession: false } });

console.log(`\nSleeping Wheels coordinate backfill — ${APPLY ? 'APPLY (this will write)' : 'DRY RUN (nothing will be written)'}`);
console.log(`Project: ${SUPABASE_URL}\n`);

// --- 1. what needs fixing ---------------------------------------------------
const { data: rows, error: readErr } = await admin
  .from('wheel_seed_details')
  .select('product_id, base_location, base_lat, base_lng, products(title)')
  .or('base_lat.is.null,base_lng.is.null');

if (readErr) fail(`Could not read wheel_seed_details: ${readErr.message}`);

const candidates = rows ?? [];
const withLocation = candidates.filter((r) => (r.base_location ?? '').trim().length > 1);
const withoutLocation = candidates.filter((r) => (r.base_location ?? '').trim().length <= 1);

console.log(`Rows with a missing coordinate:      ${candidates.length}`);
console.log(`  ...that have a base_location:      ${withLocation.length}   <- this many will be geocoded`);
console.log(`  ...with no base_location to use:   ${withoutLocation.length}   <- reported, never guessed\n`);

for (const r of withoutLocation) {
  console.log(`  SKIP (no location text)  ${r.product_id}  "${r.products?.title ?? 'untitled'}"`);
}

if (withLocation.length === 0) {
  console.log(APPLY
    ? 'Nothing to write. Exiting without changes.'
    : 'Nothing would be written. Exiting.');
  process.exit(0);
}

if (!APPLY) {
  console.log('Would geocode and fill:');
  for (const r of withLocation) {
    console.log(`  ${r.product_id}  "${r.products?.title ?? 'untitled'}"  <- "${r.base_location.trim()}"`);
  }
  console.log('\nRe-run with --apply to write these.');
  process.exit(0);
}

// --- 2. sign in, because geocode-place requires a user JWT ------------------
const { error: authErr } = await asUser.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authErr) fail(`Could not sign in as ${EMAIL}: ${authErr.message}`);
console.log(`Signed in as ${EMAIL}\n`);

// --- 3. geocode and fill ----------------------------------------------------
let filled = 0;
let missed = 0;
let writeFailed = 0;

for (const r of withLocation) {
  const place = r.base_location.trim();
  const label = `${r.product_id}  "${r.products?.title ?? 'untitled'}"`;

  let lat = null;
  let lng = null;
  try {
    const { data, error } = await asUser.functions.invoke('geocode-place', { body: { place } });
    if (error) throw error;
    const a = Number(data?.lat);
    const b = Number(data?.lng);
    if (Number.isFinite(a) && Number.isFinite(b)) { lat = a; lng = b; }
  } catch (e) {
    console.log(`  MISS  ${label}  "${place}"  (${e?.message ?? 'lookup failed'})`);
    missed++;
    await sleep(PACE_MS);
    continue;
  }

  if (lat === null) {
    console.log(`  MISS  ${label}  "${place}"  (no match)`);
    missed++;
    await sleep(PACE_MS);
    continue;
  }

  // Only ever fill a null. Never overwrite a coordinate already present.
  const { error: upErr } = await admin
    .from('wheel_seed_details')
    .update({ base_lat: lat, base_lng: lng, updated_at: new Date().toISOString() })
    .eq('product_id', r.product_id)
    .or('base_lat.is.null,base_lng.is.null');

  if (upErr) {
    console.log(`  WRITE FAILED  ${label}  ${upErr.message}`);
    writeFailed++;
  } else {
    console.log(`  FILLED  ${label}  "${place}"  -> ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    filled++;
  }

  await sleep(PACE_MS);
}

console.log(`\nDone. filled ${filled}, no match ${missed}, write failed ${writeFailed}, `
  + `skipped for no location text ${withoutLocation.length}.`);
if (missed > 0 || writeFailed > 0) {
  console.log('Rows above that did not fill still have null coordinates and remain invisible in the hub.');
}
