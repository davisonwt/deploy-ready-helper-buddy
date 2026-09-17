import { test, expect, type Page } from '@playwright/test';

/**
 * No hotspot on any stall may be smaller than 44px on its short side.
 *
 * Run: npx playwright test --config=playwright.live.config.ts stall-tap-targets
 */

const E = process.env.TEST_GOSAT_EMAIL || '', P = process.env.TEST_GOSAT_PASSWORD || '';
const MIN_TAP = 44;

const STALLS = [
  'davison.taljaard', 'companion-alder', 'companion-beech', 'companion-birch',
  'grootbrak', 'infoclayroses', 'companions', 'coenie', 'primitivevsns',
  'gosatsboardroom', 'grovestation', 'companion-hawthorn', 'wesselsangelique3',
  'davisontest1', 'scripturestudy', 'callth3guy', 'amberswheeles',
  'companion-thresh', 'wanderinghearts', 'companion-willow',
];

const VIEWPORTS = [
  { w: 844, h: 390, n: 'landscape-844' },
  { w: 1280, h: 800, n: 'desktop-1280' },
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

test.describe.serial('Every hotspot is thumb sized', () => {
  test.skip(!E || !P, 'The account is required.');

  for (const vp of VIEWPORTS) {
    test(`no hotspot under ${MIN_TAP}px at ${vp.n}`, async ({ page }) => {
      test.setTimeout(900_000);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await login(page);

      const offenders: string[] = [];
      const rows: string[] = [];
      for (const username of STALLS) {
        await page.goto(`/stall/${username}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(6000);
        const enter = page.getByRole('button', { name: /^Enter / });
        if (await enter.count()) {
          await enter.first().click().catch(() => {});
          await page.waitForTimeout(2500);
        }

        const m = await page.evaluate(() => {
          const btns = (Array.from(document.querySelectorAll('button.group.absolute')) as HTMLElement[])
            .map((b) => ({ label: b.getAttribute('aria-label') || '?', r: b.getBoundingClientRect() }))
            .filter((b) => b.r.width > 1 && b.r.height > 1);
          return btns.map((b) => ({
            label: b.label,
            short: Math.round(Math.min(b.r.width, b.r.height)),
          }));
        });

        if (m.length === 0) { rows.push(`${username}: NO HOTSPOTS FOUND`); continue; }
        const smallest = Math.min(...m.map((x) => x.short));
        rows.push(`${String(smallest).padStart(4)}px smallest | ${m.length} boxes | ${username}`);
        for (const x of m) {
          if (x.short < MIN_TAP) offenders.push(`${username} "${x.label}" ${x.short}px`);
        }
      }

      console.log(`\n### ${vp.n}\n` + rows.join('\n'));
      expect(offenders, 'hotspots below the 44px floor').toEqual([]);
    });
  }
});
