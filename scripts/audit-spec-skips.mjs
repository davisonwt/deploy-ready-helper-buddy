// Which live specs silently skip because test.skip gates on an env var that
// .env.test does not define? A green suite that never ran is worse than a red one.
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = 'C:/Users/Ezra/Projects/deploy-ready-helper-buddy';
const env = new Set(
  [...readFileSync(`${ROOT}/.env.test`, 'utf8').matchAll(/^\s*([A-Z0-9_]+)\s*=/gm)].map((m) => m[1]),
);

const files = readdirSync(`${ROOT}/tests/live`).filter((f) => f.endsWith('.spec.ts'));
const silent = [];
const optional = [];

for (const f of files) {
  const src = readFileSync(`${ROOT}/tests/live/${f}`, 'utf8');

  // const X = process.env.FOO ?? ... — dead when no referenced var exists and
  // there is no literal default.
  const dead = new Map();
  for (const m of src.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*([^;]+);/g)) {
    const [, name, expr] = m;
    if (!expr.includes('process.env.')) continue;
    const vars = [...expr.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((x) => x[1]);
    if (vars.some((v) => env.has(v))) continue;
    // An EMPTY-string default is not a default -- `?? ''` is exactly what
    // makes `test.skip(!HOST_EMAIL, ...)` fire. Only a non-empty literal
    // counts as the spec genuinely having a usable fallback.
    if (/(\?\?|\|\|)\s*['"`][^'"`]+['"`]/.test(expr)) continue;
    dead.set(name, vars);
  }
  if (dead.size === 0) continue;

  // Whole test.skip(...) call, across newlines.
  const skips = [...src.matchAll(/test\.skip\s*\(([\s\S]*?)\)\s*;/g)].map((x) => x[1]);
  const gating = [...dead.keys()].filter((n) =>
    skips.some((s) => new RegExp(`\\b${n}\\b`).test(s)));

  if (gating.length) {
    silent.push({ f, gating, vars: [...new Set(gating.flatMap((g) => dead.get(g)))] });
  } else {
    optional.push({ f, names: [...dead.keys()] });
  }
}

console.log('=== SILENTLY SKIPPING: reported green, never ran ===');
for (const r of silent) {
  console.log(`  ${r.f.padEnd(40)} needs ${r.vars.join(', ')}`);
}
console.log(`\n  ${silent.length} of ${files.length} live specs\n`);

console.log('=== dead env const, but NOT skip-gating (runs; may use a fallback path) ===');
for (const r of optional) console.log(`  ${r.f.padEnd(40)} ${r.names.join(', ')}`);
