import { test, expect, type Page } from '@playwright/test';

/**
 * Run: npx playwright test --config=playwright.live.config.ts my-listings-copy-link
 */

const E = process.env.TEST_GOSAT_EMAIL || '', P = process.env.TEST_GOSAT_PASSWORD || '';
const VIEWPORTS = [{ w: 390, h: 844, n: 'mobile-390' }, { w: 1280, h: 720, n: 'desktop-1280' }];

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

test.describe.serial('Copy link on My Listings', () => {
  test.skip(!E || !P, 'The owner account is required.');

  for (const vp of VIEWPORTS) {
    test(`${vp.n}: one tap copies the real URL and it resolves`, async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await login(page);
      await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });

      const row = page.locator('li').filter({ hasText: 'S2G Electricians' }).first();
      await expect(row).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(3000);

      // Poison the clipboard first, so reading back the right value cannot be
      // a leftover from an earlier run or from the OS.
      await page.evaluate(() => navigator.clipboard.writeText('SENTINEL-NOT-COPIED'));

      const btn = row.getByRole('button', { name: /Copy link/i });
      await expect(btn, 'no Copy link button on the row').toBeVisible();
      await btn.click();

      // The clipboard, not the toast.
      await page.waitForTimeout(1200);
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      console.log(`[${vp.n}] COPIED STRING: ${copied}`);

      // Assert the confirmation NOW: it clears itself after 2.5s, and the
      // Link-tab comparison below takes longer than that.
      await expect(row.getByRole('button', { name: /Copied/i }),
        'no confirmation shown on the button').toBeVisible({ timeout: 2000 });

      expect(copied, 'the clipboard was never written').not.toBe('SENTINEL-NOT-COPIED');
      expect(copied, 'not a production seed URL').toMatch(
        /^https:\/\/sow2growapp\.com\/seed\/hand\/a81857e8-b6b9-4f42-b4ae-17be0eecdd1d\?ref=.+$/,
      );

      // It must match what the dialog's Link tab shows, character for
      // character. Two builders drifting is the thing this guards.
      await row.getByRole('button', { name: /^Share$/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
      await page.getByRole('tab', { name: /Link/i }).click();
      await page.waitForTimeout(1500);
      const shown = (await page.locator('[role="dialog"] .break-all').first().innerText()).trim();
      console.log(`[${vp.n}] LINK TAB SHOWS: ${shown}`);
      expect(shown, 'the button and the Link tab disagree').toBe(copied);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);

      await page.screenshot({ path: `test-results/copy-link-${vp.n}.png` });

      // And the URL actually lands on that listing.
      await page.goto(copied, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('S2G Electricians').first()).toBeVisible({ timeout: 30000 });
      expect(new URL(page.url()).pathname).toBe('/seed/hand/a81857e8-b6b9-4f42-b4ae-17be0eecdd1d');
      console.log(`[${vp.n}] resolved to ${page.url()}`);
    });
  }

  test('mobile-390: six actions do not wrap badly', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    const row = page.locator('li').filter({ hasText: 'S2G Electricians' }).first();
    await expect(row).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2500);

    const m = await row.evaluate((li) => {
      // "Open" is a Button asChild wrapping a Link, so it paints as an <a>.
      // Counting only <button> finds five of the six actions.
      const ACTIONS = 'button, a';
      const bar = Array.from(li.querySelectorAll('div'))
        .find((d) => d.querySelectorAll(ACTIONS).length >= 5);
      if (!bar) return null;
      const br = bar.getBoundingClientRect();
      const btns = Array.from(bar.querySelectorAll(ACTIONS)) as HTMLElement[];
      const rows: Record<number, string[]> = {};
      let clipped = 0, tooShort = 0;
      for (const b of btns) {
        const r = b.getBoundingClientRect();
        const key = Math.round(r.top);
        (rows[key] ||= []).push((b.textContent || '').trim());
        if (r.left < br.left - 1 || r.right > br.right + 1) clipped++;
        // A label cut off by its own box is the "wraps badly" case.
        if (b.scrollWidth > b.clientWidth + 1) tooShort++;
        if (r.height < 28) tooShort++;
      }
      return {
        buttons: btns.length,
        rowsUsed: Object.keys(rows).length,
        layout: Object.entries(rows).map(([top, labels]) => `${top}: ${labels.join(' | ')}`),
        clippedOutsideBar: clipped,
        labelsTruncated: tooShort,
        pageOverflowsSideways: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });

    console.log('[mobile-390 layout] ' + JSON.stringify(m, null, 1));
    expect(m, 'could not find the action bar').not.toBeNull();
    expect(m!.buttons, 'expected six actions').toBe(6);
    expect(m!.clippedOutsideBar, 'a button hangs outside the card').toBe(0);
    expect(m!.labelsTruncated, 'a button label is cut off').toBe(0);
    expect(m!.pageOverflowsSideways, 'the page scrolls sideways').toBe(false);
    await page.screenshot({ path: 'test-results/copy-link-layout-390.png' });
  });

  test('mobile-390: when the clipboard is unreachable it does not claim success', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });

    // Both copy paths removed, which is what an insecure context or a
    // browser that refuses the gesture looks like from here.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { get: () => undefined, configurable: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).execCommand = () => false;
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const row = page.locator('li').filter({ hasText: 'S2G Electricians' }).first();
    await expect(row).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(3000);

    await row.getByRole('button', { name: /Copy link/i }).click();
    await page.waitForTimeout(2500);

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    console.log('[fallback] page text after the failed copy: '
      + (body.match(/.{0,90}clipboard.{0,90}/i)?.[0] ?? '(no clipboard message found)'));

    // It must not claim a copy that did not happen.
    expect(body, 'it claimed success with an unreachable clipboard').not.toMatch(/Link copied/i);
    expect(body, 'no plain explanation was given').toMatch(/would not let us reach the clipboard/i);
    // And it must hand over the Link tab so the URL can be taken by hand.
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    const shown = (await page.locator('[role="dialog"] .break-all').first().innerText()).trim();
    console.log('[fallback] Link tab offered: ' + shown);
    expect(shown).toMatch(/^https:\/\/sow2growapp\.com\/seed\/hand\/[0-9a-f-]+\?ref=.+$/);
    // The confirmation must NOT be showing.
    await expect(row.getByRole('button', { name: /Copied/i })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/copy-link-fallback-390.png' });
  });

  test('mobile-390: when writeText is refused the fallback really copies', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });

    // Exactly what a browser that will not count the tap as a user
    // activation does: writeText rejects, everything else still works.
    await page.addInitScript(() => {
      const real = navigator.clipboard.writeText.bind(navigator.clipboard);
      (window as unknown as { __realWrite: typeof real }).__realWrite = real;
      navigator.clipboard.writeText = () => Promise.reject(new Error('NotAllowedError'));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const row = page.locator('li').filter({ hasText: 'S2G Electricians' }).first();
    await expect(row).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => (window as unknown as { __realWrite: (t: string) => Promise<void> })
      .__realWrite('SENTINEL-NOT-COPIED'));

    await row.getByRole('button', { name: /Copy link/i }).click();
    await page.waitForTimeout(1500);

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    console.log('[execCommand fallback] COPIED STRING: ' + copied);
    expect(copied, 'the execCommand fallback did not copy anything').not.toBe('SENTINEL-NOT-COPIED');
    expect(copied).toMatch(/^https:\/\/sow2growapp\.com\/seed\/hand\/[0-9a-f-]+\?ref=.+$/);
    // A real copy happened, so a confirmation here is honest.
    await expect(row.getByRole('button', { name: /Copied/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
