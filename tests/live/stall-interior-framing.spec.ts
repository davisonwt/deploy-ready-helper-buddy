import { test, expect, type Page } from '@playwright/test';

/**
 * Every hotspot must be on screen when the interior opens, with no panning.
 *
 * Run: npx playwright test --config=playwright.live.config.ts stall-interior-framing
 */

const E = process.env.TEST_GOSAT_EMAIL || '', P = process.env.TEST_GOSAT_PASSWORD || '';

const VIEWPORTS = [
  { w: 390, h: 844, n: 'portrait-390' },
  { w: 844, h: 390, n: 'landscape-844' },
  { w: 1280, h: 800, n: 'desktop-1280' },
];

// Two stalls with different hotspot counts: one on the template fallback,
// one with its own six-entry array.
const STALLS = [
  { username: 'davison.taljaard', expect: 5, labels: ['Books', 'Music', 'Lyrics', 'My Story', 'Mugs'] },
  { username: 'amberswheeles', expect: 6, labels: [] },
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

async function measure(page: Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const btns = (Array.from(document.querySelectorAll('button.group.absolute')) as HTMLElement[])
      .map((b) => ({ el: b, r: b.getBoundingClientRect(), label: b.getAttribute('aria-label') }))
      .filter((b) => b.r.width > 4 && b.r.height > 4);
    const offScreen = btns.filter((b) => b.r.right <= 0 || b.r.left >= vw || b.r.bottom <= 0 || b.r.top >= vh);
    const clipped = btns.filter((b) => b.r.left < 0 || b.r.right > vw);
    // Is anything still a sideways pan container?
    let sideways = false;
    document.querySelectorAll('div').forEach((d) => {
      const el = d as HTMLElement;
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'visible') sideways = true;
    });
    return {
      viewport: `${vw}x${vh}`,
      visible: btns.length,
      labels: btns.map((b) => b.label),
      offScreen: offScreen.map((b) => b.label),
      clipped: clipped.map((b) => b.label),
      smallestTapTarget: btns.length
        ? Math.round(Math.min(...btns.map((b) => Math.min(b.r.width, b.r.height))))
        : 0,
      sidewaysPanRemains: sideways,
      pageScrollsSideways: document.documentElement.scrollWidth > vw + 1,
    };
  });
}

test.describe.serial('The interior frames every hotspot', () => {
  test.skip(!E || !P, 'The account is required.');

  for (const vp of VIEWPORTS) {
    for (const stall of STALLS) {
      test(`${stall.username} at ${vp.n}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await login(page);
        await page.goto(`/stall/${stall.username}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(9000);

        const m = await measure(page);
        console.log(`[${stall.username} @ ${vp.n}] ${JSON.stringify(m)}`);

        expect(m.visible, 'wrong number of hotspots painted').toBe(stall.expect);
        expect(m.offScreen, 'a hotspot is off screen when the interior opens').toEqual([]);
        expect(m.clipped, 'a hotspot is cut off by the viewport edge').toEqual([]);
        expect(m.pageScrollsSideways, 'the page scrolls sideways').toBe(false);
        // The portrait path sets minWidth/minHeight 44 on every box, so that
        // floor is a promise there and is asserted. Landscape and desktop
        // have no such floor and never did; the number is recorded rather
        // than asserted so a pre-existing 39px Mugs box on landscape is
        // reported instead of silently passing or silently failing here.
        if (vp.n === 'portrait-390') {
          expect(m.smallestTapTarget, 'a hotspot is too small to tap').toBeGreaterThanOrEqual(44);
        } else {
          console.log(`[${stall.username} @ ${vp.n}] smallest tap target: ${m.smallestTapTarget}px`);
        }
        if (stall.labels.length) expect(m.labels.sort()).toEqual([...stall.labels].sort());

        await page.screenshot({ path: `test-results/framing-${stall.username}-${vp.n}.png` });
      });
    }
  }
});
