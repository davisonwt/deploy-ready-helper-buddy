import { test, expect, type Page } from '@playwright/test';

/**
 * Live verification that stall hotspots render and navigate.
 *
 * SignedImg was a plain function component, so the imgRef that
 * useContainImageRect measures was dropped, `rect` stayed null, and
 * `{rect && hotspots.map(...)}` rendered nothing on every stall interior.
 *
 * Run: npx playwright test --config=playwright.live.config.ts stall-hotspots
 */

const EMAIL = process.env.TEST_GOSAT_EMAIL || '';
const PASS = process.env.TEST_GOSAT_PASSWORD || '';

/** Label fragment -> the path that label must land on. */
const BOARDROOM = [
  { label: 'Admin Dashboard', expect: /\/admin/ },
  // AOD Station Radio Management opens Grove Station's admin tab.
  { label: 'Radio Management', expect: /grove-station|radio/i },
  { label: 'Treasury', expect: /treasury/i },
  { label: 'Seeds Management', expect: /seed/i },
];

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

/** Hotspots are absolutely-positioned overlays sized from the image rect. */
async function hotspotLabels(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button, a'))
      .filter((e) => {
        const cs = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        return cs.position === 'absolute' && r.width > 20 && r.height > 20;
      })
      .map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim())
      .filter((t) => t && !['Close', 'Log out', 'Share this stall', 'Open menu'].includes(t)));
}

async function openBoardroom(page: Page) {
  await page.goto('/stall/gosatsboardroom', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  // The stall opens on its front gate; the interior is a click further in.
  const enter = page.getByRole('button', { name: /^Enter/ }).first();
  if (await enter.count()) {
    await enter.click();
    await page.waitForTimeout(10000);
  }
}

test.describe.serial('Stall hotspots', () => {
  test.skip(!EMAIL || !PASS, 'A gosat-role account is required in .env.test.');

  test('1. all four Boardroom hotspots render', async ({ page }) => {
    await login(page);
    await openBoardroom(page);
    const labels = await hotspotLabels(page);
    console.log(`\n[EVIDENCE] Boardroom hotspots rendered: ${labels.length}`);
    console.log(`[EVIDENCE] ${JSON.stringify(labels)}`);
    expect(labels.length, 'hotspots did not render').toBeGreaterThanOrEqual(4);
    for (const h of BOARDROOM) {
      expect(labels.join(' | '), `missing hotspot: ${h.label}`).toContain(h.label);
    }
    await page.screenshot({ path: 'test-results/hotspots-boardroom.png' });
  });

  for (const h of BOARDROOM) {
    test(`2. clicking "${h.label}" lands on the right page`, async ({ page }) => {
      await login(page);
      await openBoardroom(page);

      const spot = page.locator(`button[aria-label*="${h.label}"]`)
        .filter({ has: page.locator(':scope') })
        .last();
      await expect(spot).toBeVisible({ timeout: 20000 });
      const box = await spot.boundingBox();
      console.log(`[EVIDENCE] "${h.label}" hotspot box: ${JSON.stringify(box)}`);
      await spot.click();
      await page.waitForTimeout(6000);

      const url = page.url();
      const heading = await page.locator('h1, h2').first().innerText().catch(() => '');
      console.log(`\n[EVIDENCE] "${h.label}" -> ${url}`);
      console.log(`[EVIDENCE] heading: ${heading.slice(0, 70)}`);
      expect(url, `"${h.label}" did not navigate`).not.toContain('/stall/gosatsboardroom');
      expect(url).toMatch(h.expect);
      await page.screenshot({ path: `test-results/hotspot-${h.label.replace(/\W+/g, '-')}.png` });
    });
  }

  test('3. an ordinary member stall interior renders its hotspots', async ({ page }) => {
    await login(page);
    // Any published stall that is not the Boardroom.
    await page.goto('/stalls-feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const link = page.locator('a[href^="/stall/"]').filter({ hasNotText: 'Boardroom' }).first();
    const n = await link.count();
    console.log(`\n[EVIDENCE] member stall links found: ${n}`);
    test.skip(n === 0, 'no other stall to open from the feed');

    const href = await link.getAttribute('href');
    console.log(`[EVIDENCE] opening ${href}`);
    await link.click();
    await page.waitForTimeout(10000);

    // Some stalls open on their front gate; step inside if so.
    const enter = page.getByRole('button', { name: /^Enter/ }).first();
    if (await enter.count()) { await enter.click(); await page.waitForTimeout(8000); }

    const labels = await hotspotLabels(page);
    console.log(`[EVIDENCE] member stall hotspots: ${labels.length} ${JSON.stringify(labels.slice(0, 8))}`);
    await page.screenshot({ path: 'test-results/hotspots-member-stall.png' });
    expect(labels.length, 'no hotspots rendered on this stall').toBeGreaterThan(0);

    await page.locator(`button[aria-label="${labels[0]}"]`).last().click();
    await page.waitForTimeout(5000);
    console.log(`[EVIDENCE] clicked "${labels[0]}" -> ${page.url()}`);
  });

  test('4. the hotspot editor renders and a hotspot can be dragged', async ({ page }) => {
    await login(page);
    await page.goto('/stall/build?tab=stall', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(9000);

    // A 5-step wizard. Walk to the end, then step back once: step 4 is
    // "Mark your shelves", which mounts HotspotEditor.
    for (let i = 0; i < 5; i++) {
      const next = page.getByRole('button', { name: /^Next$/ }).first();
      if (!(await next.count())) break;
      await next.click().catch(() => {});
      await page.waitForTimeout(3500);
    }
    const back = page.getByRole('button', { name: /^Back$/ }).first();
    if (await back.count()) { await back.click(); await page.waitForTimeout(6000); }

    const heading = await page.locator('body').innerText();
    console.log(`
[EVIDENCE] on step: ${/Step (\d) of 5/.exec(heading)?.[0] ?? 'unknown'}`);

    const editorImg = page.locator('img[alt="Your stall interior"]').last();
    await expect(editorImg, 'hotspot editor image not found').toBeVisible({ timeout: 20000 });

    // The editor draws one positioned box per hotspot, sized from the image
    // rect it measures through imgRef. If the ref were dropped the rect would
    // be null and NOTHING here would render.
    const boxes = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Your stall interior"]');
      const host = img?.parentElement;
      if (!host) return [];
      return Array.from(host.children)
        .filter((e) => e !== img && getComputedStyle(e).position === 'absolute')
        .map((e) => {
          const r = e.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top) };
        })
        .filter((b) => b.w > 10 && b.h > 10);
    });
    console.log(`[EVIDENCE] editor hotspot boxes: ${boxes.length} ${JSON.stringify(boxes.slice(0, 4))}`);
    expect(boxes.length, 'editor rendered no hotspot boxes -- rect is null').toBeGreaterThan(0);

    // Drag the first box and confirm it moves. Nothing is saved: this walks
    // away without touching "Save & publish", so the real stall is unchanged.
    const before = boxes[0];
    await page.mouse.move(before.x + before.w / 2, before.y + before.h / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.w / 2 + 40, before.y + before.h / 2 + 30, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1500);

    const after = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Your stall interior"]');
      const host = img?.parentElement;
      if (!host) return null;
      const e = Array.from(host.children).find((c) => c !== img && getComputedStyle(c).position === 'absolute');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top) };
    });
    console.log(`[EVIDENCE] box before: ${JSON.stringify(before)}`);
    console.log(`[EVIDENCE] box after:  ${JSON.stringify(after)}`);
    await page.screenshot({ path: 'test-results/hotspots-editor.png' });

    expect(after, 'box vanished after the drag').not.toBeNull();
    const moved = Math.abs(after!.x - before.x) + Math.abs(after!.y - before.y)
      + Math.abs(after!.w - before.w) + Math.abs(after!.h - before.h);
    console.log(`[EVIDENCE] total geometry change: ${moved}px`);
    expect(moved, 'the hotspot did not respond to the drag').toBeGreaterThan(5);

    // Leave without saving.
    await page.goto('/cockpit', { waitUntil: 'domcontentloaded' });
  });
});
