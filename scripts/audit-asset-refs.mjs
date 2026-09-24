#!/usr/bin/env node
/**
 * Do the media references this app ships actually resolve?
 *
 * Why this exists. On 2026-09-24 the calendar's seasonal artwork rendered
 * broken. It was not a deleted storage object and was in no archive
 * manifest -- it had never been in Supabase. The repo referenced Lovable's
 * `/__l5e/assets-v1/...` route, which Lovable's preview host serves and
 * Vercel (which serves production) does not, so every such reference 404'd
 * live from 2026-07-05. 32 imported assets, 80 MB, and nothing in the
 * suite looked: the residue checker counts rows in storage buckets, and
 * these were never rows in any bucket.
 *
 * Three ways a reference can hide, and this checks all three, because the
 * first version only checked the first and missed a broken image on the
 * LANDING PAGE:
 *
 *   1. a `.asset.json` descriptor imported by source          (the original)
 *   2. a URL exported from src/assets/hosted.ts               (the replacement)
 *   3. a bare '/__l5e/...' string typed inline in a component (Index.tsx had one)
 *
 * Usage:
 *   node scripts/audit-asset-refs.mjs                  # against production
 *   node scripts/audit-asset-refs.mjs http://localhost:4173
 *
 * Exits 1 if any shipped reference fails to resolve, or if any inline
 * /__l5e/ literal survives in src.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const BASE = (process.argv[2] || 'https://www.sow2growapp.com').replace(/\/$/, '');
const SRC = 'src';

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const files = walk(SRC);
const sourceFiles = files.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
const sourceText = sourceFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

const isMedia = (ct) => /^(image|audio|video)\//.test(ct || '');
const check = async (url) => {
  const full = url.startsWith('http') ? url : BASE + url;
  try {
    const r = await fetch(full, { redirect: 'follow' });
    const ct = (r.headers.get('content-type') || '').split(';')[0];
    const len = (await r.arrayBuffer()).byteLength;
    return { ok: r.status === 200 && isMedia(ct), status: r.status, ct, len };
  } catch (e) { return { ok: false, status: -1, ct: e.message.slice(0, 40), len: 0 }; }
};

let failures = 0;

// ---- 1. inline /__l5e/ literals. No network needed: the route does not
// exist in production at all, so any survivor is a broken reference.
const inline = [];
for (const f of sourceFiles) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/['"`](\/__l5e\/[^'"`]+)['"`]/g)) inline.push({ f, url: m[1] });
}
console.log(`=== inline /__l5e/ literals: ${inline.length} ===`);
for (const i of inline) console.log(`  BROKEN  ${i.f}  ${i.url}`);
failures += inline.length;

// ---- 2. .asset.json descriptors still imported by source
const descriptors = files.filter((f) => f.endsWith('.asset.json'));
let descBroken = 0;
for (const d of descriptors) {
  const rel = relative(SRC, d).replace(/\\/g, '/');
  const imported = sourceText.includes(`@/${rel}`) || sourceText.includes(`/${rel}`);
  if (!imported) continue;
  if (statSync(d).size === 0) { console.log(`  EMPTY   ${d}`); descBroken++; continue; }
  const j = JSON.parse(readFileSync(d, 'utf8'));
  const r = await check(j.url);
  if (!r.ok) { console.log(`  ${String(r.status).padEnd(5)}  ${d}  ${j.url}`); descBroken++; }
}
console.log(`=== imported .asset.json descriptors broken: ${descBroken} ===`);
failures += descBroken;

// ---- 3. every URL exported from hosted.ts
const hosted = join(SRC, 'assets', 'hosted.ts');
let hostedBroken = 0, hostedCount = 0;
if (existsSync(hosted)) {
  const urls = [...readFileSync(hosted, 'utf8').matchAll(/export const (\w+) = '([^']+)'/g)];
  hostedCount = urls.length;
  for (const [, name, url] of urls) {
    const r = await check(url);
    if (!r.ok) { console.log(`  BROKEN  ${name}  ${r.status} ${r.ct}  ${url}`); hostedBroken++; }
  }
}
console.log(`=== hosted.ts urls: ${hostedCount} checked, ${hostedBroken} broken ===`);
failures += hostedBroken;

console.log(`\n${failures === 0 ? 'PASS — every shipped media reference resolves' : `FAIL — ${failures} broken reference(s)`}`);
process.exit(failures ? 1 : 0);
