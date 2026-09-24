#!/usr/bin/env node
/**
 * Do the images this app references actually resolve on the deployed host?
 *
 * Why this exists. On 2026-09-24 the calendar's seasonal artwork rendered
 * as a broken image. It was not a deleted storage object and it was in no
 * archive manifest -- it was never in Supabase at all. The repo holds 93
 * `.asset.json` descriptors, written by gpt-engineer-app[bot] (Lovable),
 * each pointing at `/__l5e/assets-v1/<id>/<file>`. That is Lovable's own
 * asset route. Production is served by Vercel, which has no such route, so
 * every one of them returns Vercel's NOT_FOUND page. 84 valid descriptors,
 * 80.2 MB of images, broken on the live domain since 2026-07-05 -- and
 * nothing in the suite looked, because the residue checker counts rows in
 * storage buckets and these are not rows in any bucket.
 *
 * So this checks the thing that actually broke: a reference that resolves
 * in one host and 404s in another, and a descriptor that is zero bytes.
 *
 *   node scripts/audit-asset-refs.mjs                  # against production
 *   node scripts/audit-asset-refs.mjs http://localhost:4173
 *
 * Exit 1 if any descriptor that source code IMPORTS fails to resolve. A
 * broken descriptor nothing imports is reported but does not fail the run --
 * it is dead weight, not a live break.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const BASE = process.argv[2] || 'https://www.sow2growapp.com';
const SRC = 'src';

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const files = walk(SRC);
const descriptors = files.filter((f) => f.endsWith('.asset.json'));
const sources = files.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
const sourceText = sources.map((f) => readFileSync(f, 'utf8')).join('\n');

/** Is this descriptor imported anywhere? Match on its path as written in an import. */
const isImported = (file) => {
  const rel = relative(SRC, file).replace(/\\/g, '/');
  return sourceText.includes(`@/${rel}`) || sourceText.includes(`/${rel}`);
};

const rows = [];
for (const d of descriptors) {
  const imported = isImported(d);
  const raw = readFileSync(d, 'utf8');
  if (!raw.trim() || statSync(d).size === 0) {
    rows.push({ d, imported, state: 'EMPTY', detail: 'descriptor is 0 bytes' });
    continue;
  }
  let j;
  try { j = JSON.parse(raw); } catch (e) {
    rows.push({ d, imported, state: 'UNPARSEABLE', detail: e.message.slice(0, 60) });
    continue;
  }
  if (!j.url) { rows.push({ d, imported, state: 'NO_URL', detail: 'no url field' }); continue; }
  let state = 'OK', detail = '';
  try {
    const r = await fetch(BASE + j.url, { redirect: 'follow' });
    const ctype = r.headers.get('content-type') || '';
    if (r.status !== 200) { state = 'HTTP_' + r.status; detail = j.url; }
    else if (!ctype.startsWith('image/') && !ctype.startsWith('video/') && !ctype.startsWith('audio/')) {
      state = 'NOT_MEDIA'; detail = `${ctype} for ${j.url}`;
    }
  } catch (e) { state = 'UNREACHABLE'; detail = e.message.slice(0, 60); }
  rows.push({ d, imported, state, detail });
}

const broken = rows.filter((r) => r.state !== 'OK');
const brokenImported = broken.filter((r) => r.imported);

console.log(`asset descriptors: ${rows.length}   host: ${BASE}`);
console.log(`ok: ${rows.length - broken.length}   broken: ${broken.length}   broken AND imported: ${brokenImported.length}\n`);

if (brokenImported.length) {
  console.log('=== BROKEN AND IMPORTED BY THE APP -- these render as broken images ===');
  for (const r of brokenImported) console.log(`  ${r.state.padEnd(12)} ${r.d}  ${r.detail}`);
}
const brokenUnused = broken.filter((r) => !r.imported);
if (brokenUnused.length) {
  console.log(`\n=== broken but unimported (${brokenUnused.length}) -- dead weight, not a live break ===`);
  for (const r of brokenUnused.slice(0, 10)) console.log(`  ${r.state.padEnd(12)} ${r.d}`);
  if (brokenUnused.length > 10) console.log(`  ... and ${brokenUnused.length - 10} more`);
}

process.exit(brokenImported.length ? 1 : 0);
