import { test, expect, type Page } from '@playwright/test';

/**
 * The "What you can book" card must keep its four facts apart.
 *
 * index.css gives every bare <button> `inline-flex items-center
 * justify-center` at zero specificity, which laid the unit name, capacity
 * and price out side by side and read as "TentSleeps 4".
 *
 * Run: npx playwright test --config=playwright.live.config.ts pillow-unit-card-layout
 */

const E = process.env.TEST_GOSAT_EMAIL || '', P = process.env.TEST_GOSAT_PASSWORD || '';
const DOMES = '3a238098-f438-40bb-90ed-d7d2f05540e6';
const MULTI = process.env.QA_MULTI_ID || '';

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

/** Geometry of every unit card, and whether its lines actually stack. */
async function cards(page: Page) {
  return page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[aria-pressed]'))
      .filter((b) => /Sleeps \d/.test((b as HTMLElement).innerText)) as HTMLElement[];
    return btns.map((b) => {
      const kids = Array.from(b.children) as HTMLElement[];
      const tops = kids.map((k) => Math.round(k.getBoundingClientRect().top));
      // Stacked means each child starts lower than the one before it.
      const stacked = tops.every((t, i) => i === 0 || t > tops[i - 1]);
      const text = b.innerText.replace(/\s+/g, ' ').trim();
      return {
        text,
        flexDirection: getComputedStyle(b).flexDirection,
        childTops: tops,
        stacked,
        // The symptom was "TentSleeps 4": the capacity sharing a line with
        // whatever preceded it. Test the RAW innerText with newlines intact.
        // Stripping them first joins every line and makes this always true,
        // which is exactly what the first version of this check did.
        runsTogether: !/(^|\n)\s*Sleeps \d/.test(b.innerText),
        width: Math.round(b.getBoundingClientRect().width),
      };
    });
  });
}

/**
 * A missing fixture FAILS -- it never skips.
 *
 * On 2026-09-18 nine of 42 live specs were found reporting green having never
 * executed. A green suite that never ran is worse than a red one.
 */
function requireFixture(value: string, envName: string) {
  if (value) return;
  throw new Error(
    `${envName} is not set, so this spec cannot run. Create a three-unit listing `
    + 'first (npx playwright test --config=playwright.live.config.ts pillow-units '
    + `prints its id), then re-run with ${envName}=<id>. A FAILURE, not a skip.`,
  );
}

for (const vp of [{ w: 390, h: 844, n: 'mobile-390' }, { w: 1280, h: 800, n: 'desktop-1280' }]) {
  test(`single-unit listing at ${vp.n}`, async ({ page }) => {
    test.skip(!E || !P, 'account required');
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await login(page);
    await page.goto(`/seed/pillow/${DOMES}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);

    const c = await cards(page);
    console.log(`[SINGLE ${vp.n}] ${JSON.stringify(c)}`);
    expect(c.length, 'no unit card rendered').toBe(1);
    expect(c[0].flexDirection, 'the card is not stacking').toBe('column');
    expect(c[0].stacked, 'the card lines are not on separate rows').toBe(true);
    expect(c[0].runsTogether, 'text runs together').toBe(false);
    // One unit: the listing badge already says the kind, so the chip is off.
    expect(c[0].text, 'the type chip should be hidden on a single-unit listing')
      .not.toMatch(/\bTent\b/);
    await page.screenshot({ path: `test-results/unit-card-single-${vp.n}.png`, fullPage: true });
  });

  test(`multi-unit listing at ${vp.n}`, async ({ page }) => {
    test.skip(!E || !P, 'account required');
    requireFixture(MULTI, 'QA_MULTI_ID');
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await login(page);
    await page.goto(`/seed/pillow/${MULTI}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);

    const c = await cards(page);
    console.log(`[MULTI ${vp.n}] ${JSON.stringify(c)}`);
    expect(c.length, 'expected three unit cards').toBe(3);
    for (const card of c) {
      expect(card.flexDirection, `not stacking: ${card.text}`).toBe('column');
      expect(card.stacked, `lines not separated: ${card.text}`).toBe(true);
      expect(card.runsTogether, `text runs together: ${card.text}`).toBe(false);
    }
    // Several units: the type is what tells them apart, so it must be there.
    const all = c.map((x) => x.text).join(' | ');
    expect(all, 'the type chip should show on a multi-unit listing').toMatch(/Geodesic dome/);
    expect(all).toMatch(/Safari tent/);
    expect(all).toMatch(/Room/);
    await page.screenshot({ path: `test-results/unit-card-multi-${vp.n}.png`, fullPage: true });
  });
}
