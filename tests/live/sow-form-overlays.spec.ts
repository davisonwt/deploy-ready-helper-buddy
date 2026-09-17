import { test, expect, type Page } from '@playwright/test';

/**
 * No global nag card may cover a form control.
 *
 * Run: npx playwright test --config=playwright.live.config.ts sow-form-overlays
 */

const E = process.env.TEST_GOSAT_EMAIL || '', P = process.env.TEST_GOSAT_PASSWORD || '';
const VIEWPORTS = [{ w: 390, h: 844, n: 'mobile-390' }, { w: 1280, h: 720, n: 'desktop-1280' }];
// /my-listings is not a form, but it is where a member reaches every
// control on what they have listed, so the same rule applies.
const FORMS = ['/sow/hand', '/sow/pillow', '/sow/wheel', '/my-listings'];
const NAGS = /Enable Notifications|Enable sound|payout|Set up payouts/i;

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', E);
    await page.fill('input[type="password"]', P);
    await page.click('button[type="submit"]');
    if (await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false)) return;
  }
  throw new Error('login failed');
}

/** Every fixed element, and which form controls it is painted on top of. */
async function overlays(page: Page) {
  return page.evaluate(() => {
    const out: any[] = [];
    const seen = new Set<HTMLElement>();
    document.querySelectorAll('body *').forEach((n) => {
      const el = n as HTMLElement;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') return;
      if (el.parentElement && seen.has(el.parentElement)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      if (cs.visibility === 'hidden' || cs.opacity === '0') return;
      seen.add(el);
      const covered: string[] = [];
      document.querySelectorAll('button, input, label, h2').forEach((c) => {
        const cr = c.getBoundingClientRect();
        if (cr.width < 4 || cr.height < 4) return;
        if (el.contains(c)) return; // its own buttons do not count
        const overlaps = !(cr.right < r.left || cr.left > r.right || cr.bottom < r.top || cr.top > r.bottom);
        if (!overlaps) return;
        // Sample across the overlap, not one inset corner. These widgets are
        // rounded pills and circles, so a point 2px inside the intersection's
        // top-left often lands in a transparent corner and reports "clear"
        // while the middle of the same overlap is solidly covered.
        const x0 = Math.max(cr.left, r.left), x1 = Math.min(cr.right, r.right);
        const y0 = Math.max(cr.top, r.top), y1 = Math.min(cr.bottom, r.bottom);
        const pts: Array<[number, number]> = [];
        for (const fx of [0.5, 0.25, 0.75]) {
          for (const fy of [0.5, 0.25, 0.75]) {
            pts.push([x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy]);
          }
        }
        const covering = pts.some(([x, y]) => {
          const hit = document.elementFromPoint(x, y);
          return !!hit && el.contains(hit);
        });
        if (covering) covered.push((c.textContent || c.tagName).replace(/\s+/g, ' ').trim().slice(0, 30));
      });
      out.push({
        text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 45),
        z: cs.zIndex,
        rect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
        coveredControls: covered.slice(0, 8),
      });
    });
    return out;
  });
}

test.describe.serial('Global overlays keep off the sow forms', () => {
  test.skip(!E || !P, 'The owner account is required.');

  for (const vp of VIEWPORTS) {
    for (const route of FORMS) {
      test(`${route} at ${vp.n}: nothing covers a control`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await login(page);
        // The banners are dismissible and persist that in localStorage, so
        // clear it first: a pass because the card was already dismissed on
        // this profile would prove nothing.
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
          try {
            localStorage.removeItem('notification-banner-dismissed');
            localStorage.removeItem('payout-setup-banner-dismissed');
            localStorage.removeItem('soundBannerDismissed');
            sessionStorage.removeItem('soundBannerDismissed');
          } catch { /* ignore */ }
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(7000);

        const found = await overlays(page);
        console.log(`\n### ${route} @ ${vp.n}`);
        for (const f of found) console.log(JSON.stringify(f));

        const nagsPresent = found.filter((f) => NAGS.test(f.text));
        expect(nagsPresent.map((f) => f.text), 'a nag card is still on the form').toEqual([]);

        const covering = found.filter((f) => f.coveredControls.length > 0);
        expect(covering.map((f) => `${f.text} covers ${f.coveredControls.join(', ')}`),
          'a fixed overlay is painted over form controls').toEqual([]);

        // Scroll through the whole form: a bottom-fixed widget only reveals
        // itself over content once the content has moved under it.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += Math.floor(vp.h * 0.8)) {
          await page.evaluate((to) => window.scrollTo(0, to), y);
          await page.waitForTimeout(350);
          const mid = await overlays(page);
          const bad = mid.filter((f) => f.coveredControls.length > 0);
          expect(bad.map((f) => `at y=${y}: ${f.text} covers ${f.coveredControls.join(', ')}`),
            'an overlay covers controls once the form is scrolled').toEqual([]);
        }

        await page.screenshot({ path: `test-results/overlays-${route.split('/').pop()}-${vp.n}.png` });
      });
    }
  }

  test('suppression is scoped to form routes, not a global kill', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    const results: Record<string, boolean> = {};
    for (const route of ['/sleeping', '/seed/wheel/819a5b71-48a4-40c5-9fc7-f516aa82c348']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        try { localStorage.removeItem('notification-banner-dismissed'); } catch { /* ignore */ }
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(7000);
      const found = await overlays(page);
      results[route] = found.some((f) => /Enable Notifications/i.test(f.text));
      console.log(`### ${route} -> notification card present: ${results[route]}`);
      for (const f of found) console.log('   ' + JSON.stringify(f));
    }

    // If this account has notifications enabled the card never shows anywhere
    // and the check proves nothing, so say which it was rather than passing.
    const anywhere = Object.values(results).some(Boolean);
    console.log('[EVIDENCE] card seen on a non-form route:', anywhere, JSON.stringify(results));
    expect(anywhere, 'the card never appeared on any non-form route either').toBe(true);
  });
});
