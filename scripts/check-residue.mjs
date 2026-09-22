#!/usr/bin/env node
/**
 * Live-suite residue check.
 *
 * Counts alone do not catch the 2026-09-22 damage: pausing a listing
 * flipped one boolean and deleting a hotspot removed one array element,
 * and every row count stayed exactly where it was. The suite passed its
 * residue check while a real listing was missing from the Wheels hub.
 *
 * So this records per-listing availability and status, and per-stall
 * hotspot/tile lengths, alongside the counts.
 *
 *   node scripts/check-residue.mjs --save    # record a baseline
 *   node scripts/check-residue.mjs           # compare against it
 *
 * Read-only. Needs SUPABASE_ACCESS_TOKEN.
 */
import fs from 'node:fs';

const REF = 'zuwkgasbkpjlxzsjzumu';
const BASELINE = new URL('./residue-baseline.json', import.meta.url);
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is not set. This is a setup failure, not a reason to skip.');
  process.exit(2);
}

const query = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(`query failed: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
};

const SQL = `
select json_build_object(
  'counts', (select json_object_agg(k, v) from (
      select 'products' k, count(*) v from products
      union all select 'pillow_seed_details', count(*) from pillow_seed_details
      union all select 'wheel_seed_details',  count(*) from wheel_seed_details
      union all select 'hand_seed_details',   count(*) from hand_seed_details
      union all select 'pillow_units',        count(*) from pillow_units
      union all select 'wandering_roles',     count(*) from wandering_roles
      union all select 'storage_wandering',   count(*) from storage.objects where bucket_id='wandering'
      union all select 'storage_premium_room',count(*) from storage.objects where bucket_id='premium-room'
  ) c),
  'listings', (select json_object_agg(id, state) from (
      select p.id::text as id,
             p.status || '/' || coalesce(
               (select case when d.availability then 'available' else 'PAUSED' end
                  from wheel_seed_details d where d.product_id=p.id),
               (select case when d.availability then 'available' else 'PAUSED' end
                  from pillow_seed_details d where d.product_id=p.id),
               (select case when d.availability then 'available' else 'PAUSED' end
                  from hand_seed_details d where d.product_id=p.id),
               'no-detail') as state
        from products p where p.kind in ('wheel','pillow','hand')
  ) l),
  'stalls', (select json_object_agg(id, shape) from (
      select s.id::text as id,
             jsonb_array_length(coalesce(s.hotspots,'[]'::jsonb))::text || 'h/' ||
             jsonb_array_length(coalesce(s.tiles,'[]'::jsonb))::text || 't' as shape
        from stalls s
  ) st)
) as snap;`;

const snap = (await query(SQL))[0].snap;

if (process.argv.includes('--save')) {
  fs.writeFileSync(BASELINE, JSON.stringify(snap, null, 2));
  console.log('baseline saved:', BASELINE.pathname);
  console.log(JSON.stringify(snap.counts, null, 1));
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error('No baseline. Run: node scripts/check-residue.mjs --save');
  process.exit(2);
}
const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const problems = [];

for (const [k, v] of Object.entries(snap.counts)) {
  if (base.counts[k] !== v) problems.push(`count ${k}: ${base.counts[k]} -> ${v}`);
}
for (const [id, state] of Object.entries(snap.listings)) {
  const was = base.listings[id];
  if (was === undefined) problems.push(`listing ADDED ${id} (${state})`);
  else if (was !== state) problems.push(`listing CHANGED ${id}: ${was} -> ${state}`);
}
for (const id of Object.keys(base.listings)) {
  if (snap.listings[id] === undefined) problems.push(`listing REMOVED ${id} (was ${base.listings[id]})`);
}
for (const [id, shape] of Object.entries(snap.stalls)) {
  const was = base.stalls[id];
  if (was !== undefined && was !== shape) problems.push(`stall CHANGED ${id}: ${was} -> ${shape}`);
}

if (problems.length) {
  console.error(`RESIDUE / DAMAGE: ${problems.length} difference(s) from baseline`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('clean: counts, per-listing status/availability and per-stall hotspots all match baseline');
