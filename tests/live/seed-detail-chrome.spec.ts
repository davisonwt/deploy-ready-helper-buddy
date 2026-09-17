import { test, expect, type Page } from '@playwright/test';

/**
 * A member reading a listing sees the listing: no raw database values, and
 * no nag card on top of it.
 *
 * Run: npx playwright test --config=playwright.live.config.ts seed-detail-chrome
 */

const E = process.env.TEST_GOSAT_EMAIL || '', P = process.env.TEST_GOSAT_PASSWORD || '';
const SEEDS = [
  { kind: 'pillow', id: '3a238098-f438-40bb-90ed-d7d2f05540e6' },
  { kind: 'hand',   id: 'a81857e8-b6b9-4f42-b4ae-17be0eecdd1d' },
  { kind: 'wheel',  id: '819a5b71-48a4-40c5-9fc7-f516aa82c348' },
];

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

for (const vp of [{ w: 390, h: 844, n: 'mobile-390' }, { w: 1280, h: 800, n: 'desktop-1280' }]) {
  for (const seed of SEEDS) {
    test(`${seed.kind} detail at ${vp.n}: no raw enums, no nag card`, async ({ page }) => {
      test.skip(!E || !P, 'account required');
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await login(page);
      // Clear the dismissal so a pass cannot come from the card being hidden.
      await page.goto(`/seed/${seed.kind}/${seed.id}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        try {
          localStorage.removeItem('notification-banner-dismissed');
          localStorage.removeItem('payout-setup-banner-dismissed');
          localStorage.removeItem('soundBannerDismissed');
        } catch { /* ignore */ }
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(8000);

      const m = await page.evaluate(() => {
        const text = document.body.innerText;
        // A raw enum is snake_case where a label belongs.
        const raw = (text.match(/\b[a-z]+_[a-z_]+\b/g) ?? [])
          .filter((w) => !/^https?_|_url$|^data_/.test(w));
        const nags = Array.from(document.querySelectorAll('body *'))
          .filter((n) => getComputedStyle(n as HTMLElement).position === 'fixed')
          .map((n) => (n as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 40))
          .filter((t) => /Enable Notifications|Enable sound|payout/i.test(t));
        return { rawEnums: Array.from(new Set(raw)).slice(0, 8), nags };
      });
      console.log(`[${seed.kind} @ ${vp.n}] ${JSON.stringify(m)}`);

      expect(m.rawEnums, 'a raw database value is showing').toEqual([]);
      expect(m.nags, 'a nag card is on top of the listing').toEqual([]);
      await page.screenshot({ path: `test-results/seed-detail-${seed.kind}-${vp.n}.png` });
    });
  }
}
