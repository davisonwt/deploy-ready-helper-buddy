import { test, expect, devices, type Page } from '@playwright/test';

/**
 * Every hotspot opens on ONE tap, on touch.
 *
 * Touch used to need two: handleHotspotTap's first tap only set a 1500ms
 * preview and a second tap inside that window opened the sheet. Tap, read the
 * label, tap again and the window had closed -- so it re-previewed forever and
 * read as a dead control. A member concluded she had no access to her own
 * stall's My Story (2026-09-18).
 *
 * Deliberately taps ONCE and asserts the sheet opened. A two-tap regression
 * fails here rather than being papered over by a second tap in the helper.
 *
 * Run: npx playwright test --config=playwright.live.config.ts stall-hotspot-one-tap
 */

const E = process.env.TEST_GOSAT_EMAIL || '';
const P = process.env.TEST_GOSAT_PASSWORD || '';
const PHONE = { ...devices['iPhone 14 Pro'] };
const STALL = process.env.TAP_STALL || '/stall/davison.taljaard';

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', E);
    await page.fill('input[type="password"]', P);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

/** Did a shelf actually open? Sheet in the DOM, or the kind in the hash. */
async function opened(page: Page) {
  return page.evaluate(() =>
    !!document.querySelector('[role="dialog"]') || /stall-kind=/.test(location.hash));
}

test.describe.serial('One tap opens a hotspot', () => {
  test.skip(!E || !P, 'account required');

  test('the viewport really is a coarse pointer', async ({ browser }) => {
    const ctx = await browser.newContext({ ...PHONE });
    const page = await ctx.newPage();
    await login(page);
    await page.goto(STALL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    const env = await page.evaluate(() => ({
      finePointer: window.matchMedia('(hover: hover) and (pointer: fine)').matches,
      coarse: window.matchMedia('(pointer: coarse)').matches,
      touchPoints: navigator.maxTouchPoints,
      width: window.innerWidth,
    }));
    console.log(`[EVIDENCE] ${JSON.stringify(env)}`);
    // If this were a fine pointer the whole spec would pass vacuously.
    expect(env.finePointer, 'not a touch viewport -- one-tap proves nothing here').toBe(false);
    await ctx.close();
  });

  for (const kind of ['Books', 'Music', 'Lyrics', 'My Story', 'My Music', 'My Books', 'Coffee Mugs']) {
    test(`${kind}: opens on one tap`, async ({ browser }) => {
      const ctx = await browser.newContext({ ...PHONE });
      const page = await ctx.newPage();
      await login(page);
      await page.goto(STALL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(8000);

      const btn = page.getByRole('button', { name: kind, exact: true }).first();
      if (!(await btn.count())) {
        console.log(`[SKIP] ${kind}: not on this stall`);
        await ctx.close();
        return;
      }

      await btn.tap();
      await page.waitForTimeout(3500);
      const isOpen = await opened(page);
      console.log(`[${kind}] opened after ONE tap: ${isOpen}`);
      await page.screenshot({ path: `test-results/onetap-${kind.replace(/\s+/g, '-')}.png` });

      expect(isOpen, `${kind} did not open on a single tap`).toBe(true);
      await ctx.close();
    });
  }
});
