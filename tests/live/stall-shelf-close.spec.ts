import { test, expect, devices, type Page } from '@playwright/test';

/**
 * While a shelf is open there is exactly ONE reachable way to close it, and
 * using it returns to the interior.
 *
 * Reported on a phone 2026-09-18: closing a shelf dropped the member out of
 * the stall. Measured at 390px with a shelf open, there were TWO controls both
 * labelled exactly "Close" -- the stall's own X at y=2 and the sheet's at
 * y=116, 44x44 each, in the same top-right thumb reach. The upper one runs
 * StallVisitPage's `enter_via_front ? setEntered(false) : handleClose`, so it
 * either drops to the front gate or leaves the stall entirely.
 *
 * WHY THE FIRST VERSION OF THIS SPEC MISSED IT: it closed via the correct X
 * and asserted the interior came back, which it duly did. Passing by using the
 * right control proves nothing about a wrong one sitting next to it. This
 * version asserts the wrong control is not there at all.
 */

const E = process.env.TEST_GOSAT_EMAIL || '';
const P = process.env.TEST_GOSAT_PASSWORD || '';
const PHONE = { ...devices['iPhone 14 Pro'] };
const STALL = process.env.SHELF_STALL || '/stall/davison.taljaard';
const KINDS = ['Books', 'Music', 'Lyrics', 'My Story', 'My Music', 'My Books', 'Coffee Mugs'];

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

/** Every visible control whose job is to close/leave something, with geometry. */
async function closeControls(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button[aria-label]'))
      .filter((b) => /close|leave stall|log out/i.test(b.getAttribute('aria-label') || ''))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return {
          label: b.getAttribute('aria-label') || '',
          x: Math.round(r.x), y: Math.round(r.y),
          w: Math.round(r.width), h: Math.round(r.height),
        };
      })
      .filter((c) => c.w > 0 && c.h > 0));
}

/** Is a shelf showing, and does the interior still have its hotspots? */
async function view(page: Page) {
  return page.evaluate(() => {
    const chrome = ['Close', 'Close shelf', 'Leave stall', 'Log out', 'Open menu',
      'Owner menu', 'Share this stall', 'Dismiss banner'];
    const hotspots = Array.from(document.querySelectorAll('button[aria-label]'))
      .filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 40 && r.height > 40 && !chrome.includes(b.getAttribute('aria-label') || '');
      }).length;
    return {
      hotspots,
      hash: location.hash,
      sheetOpen: /stall-kind=/.test(location.hash) || !!document.querySelector('[role="dialog"]'),
      leftStall: !/\/stall\//.test(location.pathname),
    };
  });
}

test.describe.serial('Closing a shelf', () => {
  test.skip(!E || !P, 'account required');

  for (const kind of KINDS) {
    test(`${kind}: one close control, and it returns to the interior`, async ({ browser }) => {
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

      // One tap opens, since d25ce772.
      await btn.tap();
      await page.waitForTimeout(3500);
      const opened = await view(page);
      expect(opened.sheetOpen, `${kind}: the shelf did not open`).toBe(true);

      // THE ASSERTION THAT MATTERS: with the shelf open, a member must have
      // exactly one thing to tap to get out of it.
      const controls = await closeControls(page);
      console.log(`[${kind}] close controls while open: ${JSON.stringify(controls)}`);
      expect(
        controls.length,
        `${kind}: ${controls.length} close controls reachable while the shelf is open -- `
        + `a member aiming for the shelf's X can hit the stall's and be thrown out`,
      ).toBe(1);
      expect(controls[0].label, `${kind}: the one close control should name the shelf`)
        .toBe('Close shelf');

      // And it does what it says.
      await page.getByRole('button', { name: 'Close shelf', exact: true }).first().tap();
      await page.waitForTimeout(3000);
      const after = await view(page);
      console.log(`[${kind}] after close: ${JSON.stringify(after)}`);
      await page.screenshot({ path: `test-results/shelfclose-${kind.replace(/\s+/g, '-')}.png` });

      expect(after.sheetOpen, `${kind}: the shelf did not close`).toBe(false);
      expect(after.leftStall, `${kind}: closing the shelf left the stall entirely`).toBe(false);
      expect(after.hotspots, `${kind}: the interior came back without its hotspots`).toBeGreaterThan(0);
      await ctx.close();
    });
  }
});
