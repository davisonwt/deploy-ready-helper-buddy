// Contrast audit against the production build, in a real browser.
//
//   npm run build && node scripts/contrast-audit.mjs [--theme light|dark|both] [--pages /login,/register]
//
// Serves dist/ with `vite preview` on :4173, signs in as test account A and
// (when present) the owner's gosat account from .env.test, and for every
// visible text run computes the WCAG contrast between its colour and the
// effective background behind it (walking up until an opaque background;
// gradients and images are reported separately, not scored). Inputs are
// checked colour-vs-own-background. Every element inside a
// [data-state="active"] tab is reported on its own, since a selected state
// that goes invisible is the bug this script exists for (2026-09-06).
//
// Output: a per-page summary on stdout and the full list in
// scripts/.contrast-audit.json (gitignored). npm script: audit:contrast.

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const REF = 'zuwkgasbkpjlxzsjzumu';
const ANON = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';
const BASE = 'http://localhost:4173';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const themes = opt('--theme', 'both') === 'both' ? ['light', 'dark'] : [opt('--theme', 'light')];
const onlyPages = opt('--pages', null)?.split(',');

const env = {};
if (existsSync('.env.test')) {
  for (const line of readFileSync('.env.test', 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

async function session(email, password) {
  if (!email || !password) return null;
  const c = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) { console.warn('sign-in failed for', email, error.message); return null; }
  return data.session;
}

const PAGES = [
  { url: '/', as: null },
  { url: '/login', as: null },
  { url: '/register', as: null },
  { url: '/dashboard', as: 'A' },
  { url: '/my-seeds', as: 'A' },
  { url: '/wallet', as: 'A' },
  { url: '/sow', as: 'A' },
  { url: '/products', as: 'A' },
  { url: '/profile', as: 'A' },
  { url: '/orchard/55f4e02e-32fe-4013-aa7b-4eff6da77d37', as: 'A' },
  { url: '/admin', as: 'G', tabs: true },
  { url: '/admin/treasury', as: 'G' },
  { url: '/admin/orchards', as: 'G' },
  { url: '/admin/payouts', as: 'G' },
  { url: '/admin/analytics', as: 'G', tabs: true },
  { url: '/admin/moderation', as: 'G', tabs: true },
  { url: '/admin/seeds', as: 'G' },
];

// Runs inside the page.
function auditInPage() {
  const parse = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const bodyBg = (() => { const b = parse(getComputedStyle(document.body).backgroundColor); const h = parse(getComputedStyle(document.documentElement).backgroundColor); const base = { r: 255, g: 255, b: 255, a: 1 }; let acc = base; if (h && h.a > 0) acc = over(h, acc); if (b && b.a > 0) acc = over(b, acc); return acc; })();

  function effectiveBg(el) {
    const layers = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { gradient: true, from: node.className?.toString().slice(0, 80) };
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 0.999) break; }
      node = node.parentElement;
    }
    let acc = bodyBg;
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return { color: acc };
  }
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.2) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const path = (el) => { const parts = []; let n = el; for (let i = 0; n && i < 4; i++) { parts.unshift(n.tagName.toLowerCase() + (n.dataset?.testid ? `[${n.dataset.testid}]` : '')); n = n.parentElement; } return parts.join('>'); };

  const failures = [];
  const actives = [];
  const seen = new Set();
  const all = document.body.querySelectorAll('*');
  for (const el of all) {
    if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'NOSCRIPT'].includes(el.tagName)) continue;
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    const text = isInput ? (el.value || el.placeholder || '') : Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (!text && !isInput) continue;
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg) continue;
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const bg = effectiveBg(el);
    const active = !!el.closest('[data-state="active"],[aria-selected="true"]');
    const key = `${cs.color}|${bg.gradient ? 'grad' : hex(bg.color)}|${el.className?.toString().slice(0, 60)}|${active}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rec = {
      text: (text || el.placeholder || el.tagName).slice(0, 50), tag: el.tagName.toLowerCase(), input: isInput, active,
      color: hex(fg.a < 1 ? over(fg, bg.gradient ? { r: 128, g: 128, b: 128, a: 1 } : bg.color) : fg),
      bg: bg.gradient ? `gradient(${bg.from})` : hex(bg.color),
      ratio: bg.gradient ? null : Math.round(contrast(fg.a < 1 ? over(fg, bg.color) : fg, bg.color) * 100) / 100,
      need, size: Math.round(size), weight, path: path(el), classes: el.className?.toString().slice(0, 140),
    };
    if (active) actives.push(rec);
    if (rec.ratio !== null && rec.ratio < need) failures.push(rec);
  }
  failures.sort((a, b) => a.ratio - b.ratio);
  return { failures, actives, htmlClass: document.documentElement.className };
}

async function run() {
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { shell: true, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 4000));
  const sessions = {
    A: await session(env.TEST_A_EMAIL, env.TEST_A_PASSWORD),
    G: await session(env.TEST_GOSAT_EMAIL, env.TEST_GOSAT_PASSWORD),
  };
  const browser = await chromium.launch();
  const out = [];
  try {
    for (const theme of themes) {
      for (const p of PAGES) {
        if (onlyPages && !onlyPages.includes(p.url)) continue;
        if (p.as && !sessions[p.as]) { console.log(`skip ${p.url} (no ${p.as} session)`); continue; }
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme === 'dark' ? 'dark' : 'light' });
        await ctx.addInitScript(({ theme, key, sess }) => {
          localStorage.setItem('sow2grow-ui-theme', theme);
          sessionStorage.setItem('audioUnlocked', '1');
          localStorage.setItem('sw:disabled', '1');
          if (sess) localStorage.setItem(key, JSON.stringify(sess));
        }, { theme, key: `sb-${REF}-auth-token`, sess: p.as ? sessions[p.as] : null });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 45000 });
          await page.waitForTimeout(1200);
          const res = await page.evaluate(auditInPage);
          const entry = { theme, url: p.url, finalUrl: page.url().replace(BASE, ''), htmlClass: res.htmlClass, failures: res.failures, actives: res.actives, tabs: [] };
          if (p.tabs) {
            const tabs = page.locator('[role="tab"]');
            const n = await tabs.count();
            for (let i = 0; i < Math.min(n, 12); i++) {
              const t = tabs.nth(i);
              const label = (await t.innerText().catch(() => '')).trim().slice(0, 30);
              await t.click({ timeout: 3000 }).catch(() => {});
              await page.waitForTimeout(350);
              const r2 = await page.evaluate(auditInPage);
              const mine = r2.actives.filter((a) => a.path.includes('button') || a.tag === 'button' || a.active);
              entry.tabs.push({ label, selected: mine.slice(0, 3), failures: r2.failures.filter((f) => f.active).slice(0, 3) });
            }
          }
          out.push(entry);
          const fails = entry.failures.length;
          const inputFails = entry.failures.filter((f) => f.input).length;
          console.log(`\n[${theme}] ${p.url} -> ${entry.finalUrl} (html.class="${res.htmlClass}") failures: ${fails}${inputFails ? ` (inputs ${inputFails})` : ''}`);
          for (const f of entry.failures.slice(0, 10)) console.log(`   ${f.ratio}:1 need ${f.need}  ${f.color} on ${f.bg}  ${f.active ? '[ACTIVE] ' : ''}${f.input ? '[INPUT] ' : ''}"${f.text}"  <${f.path}>  .${f.classes.slice(0, 70)}`);
          for (const t of entry.tabs) for (const s of t.selected.slice(0, 1)) console.log(`   tab "${t.label}" selected: ${s.ratio ?? 'gradient'}:1 ${s.color} on ${s.bg}`);
        } catch (err) {
          console.log(`\n[${theme}] ${p.url} ERROR ${err.message.split('\n')[0]}`);
        } finally {
          await ctx.close();
        }
      }
    }
  } finally {
    await browser.close();
    // With shell: true the pid is the shell; on Windows kill the whole tree
    // or vite preview keeps port 4173 and the next Playwright run refuses to start.
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' });
    else preview.kill();
  }
  writeFileSync(resolve('scripts/.contrast-audit.json'), JSON.stringify(out, null, 1));
  const total = out.reduce((s, e) => s + e.failures.length, 0);
  console.log(`\nTotal failing text/background pairs: ${total}. Full report: scripts/.contrast-audit.json`);
}
run().catch((e) => { console.error(e); process.exit(1); });
