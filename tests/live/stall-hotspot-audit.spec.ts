import { test, expect, type Page } from '@playwright/test';

/**
 * How many hotspots each stall actually paints, for every stall.
 *
 * Run: npx playwright test --config=playwright.live.config.ts stall-hotspot-audit
 */

const E = process.env.TEST_GOSAT_EMAIL || '', P = process.env.TEST_GOSAT_PASSWORD || '';

/** username, stall name, hotspot rows in the database. null = SQL NULL. */
const STALLS: Array<[string, string, number | null]> = [
  ['davison.taljaard', "Davison's - Music, Books & Faith Teachings", null],
  ['companion-alder', 'Alder', 4],
  ['companion-beech', 'Beech', 4],
  ['companion-birch', 'Birch', 4],
  ['grootbrak', 'Choice Pharmacy', 4],
  ['infoclayroses', 'ClayRoses', 3],
  ['companions', 'Companions Village', 4],
  ['coenie', 'CW Accounting', 5],
  ['primitivevsns', "Ed's Stall", 3],
  ['gosatsboardroom', "Gosat's Boardroom", 4],
  ['grovestation', 'Grove Station', 4],
  ['companion-hawthorn', 'Hawthorn', 4],
  ['wesselsangelique3', 'KAROO BEE/BY', 5],
  ['davisontest1', 'Sabbath Test Stall', 4],
  ['scripturestudy', 'Scripture Study', 5],
  ['callth3guy', 'The Halls of Ancient Archives', 5],
  ['amberswheeles', "The Scribe's Library", 6],
  ['companion-thresh', 'Thresh', 4],
  ['wanderinghearts', 'Wandering Hearts', 4],
  ['companion-willow', 'Willow', 4],
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

/** Hotspot buttons are the invisible absolutely-positioned group buttons. */
async function countHotspots(page: Page) {
  return page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button.group.absolute')) as HTMLElement[];
    return {
      count: btns.length,
      labels: btns.map((b) => b.getAttribute('aria-label') || '?').slice(0, 8),
      sized: btns.filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 4 && r.height > 4;
      }).length,
    };
  });
}

test.describe.serial('Every stall, how many hotspots it paints', () => {
  test.skip(!E || !P, 'The gosat account is required.');

  test('audit all stalls', async ({ page }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page);

    const rows: string[] = [];
    for (const [username, name, dbCount] of STALLS) {
      await page.goto(`/stall/${username}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);

      // Some stalls open on a front gate; step inside before counting.
      const enter = page.getByRole('button', { name: /^Enter / });
      if (await enter.count()) {
        await enter.first().click().catch(() => {});
        await page.waitForTimeout(3000);
      }
      await page.waitForTimeout(2000);

      const m = await countHotspots(page);
      const bodyHasStall = (await page.locator('body').innerText()).includes(name.slice(0, 12));
      rows.push(
        `${String(dbCount ?? 'NULL').padStart(4)} in db | ${String(m.count).padStart(2)} painted `
        + `| ${String(m.sized).padStart(2)} sized | ${bodyHasStall ? 'loaded' : 'PAGE NOT LOADED'} `
        + `| ${name} (/stall/${username}) ${m.labels.length ? '[' + m.labels.join(', ') + ']' : ''}`,
      );
      console.log(rows[rows.length - 1]);
    }

    console.log('\n===== AUDIT =====\n' + rows.join('\n'));
    await page.screenshot({ path: 'test-results/stall-audit-last.png' });
  });

  test("Davison's own stall, close up", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page);
    await page.goto('/stall/davison.taljaard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const m = await countHotspots(page);
    const detail = await page.evaluate(() => {
      const img = Array.from(document.querySelectorAll('img'))
        .find((i) => (i.src || '').includes('interior'));
      return {
        interiorSrc: img?.src?.slice(0, 120) ?? null,
        interiorDecoded: img ? img.naturalWidth > 0 : false,
        bodyStart: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 220),
      };
    });
    console.log('[DAVISON] hotspots=' + JSON.stringify(m));
    console.log('[DAVISON] ' + JSON.stringify(detail));
    await page.screenshot({ path: 'test-results/davison-stall-interior.png', fullPage: false });

    // Recorded, not asserted: this test exists to report the number.
    expect(m.count).toBeGreaterThanOrEqual(0);
  });
});
