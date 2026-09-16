import { test, expect, type Page } from '@playwright/test';

/**
 * Live verification of two defects on the Sleeping Wheels surfaces.
 *
 * 1. Vehicle photos did not render. The premium-room bucket is private, but
 *    CoverDropZone builds its URL with getPublicUrl(), so every cover URL
 *    pointed at /object/public/... and answered HTTP 400 "Bucket not found".
 *    Fixed by rendering through SignedImg, which the app already uses for
 *    private buckets.
 *
 * 2. The vehicle-type cards ran the label and its hint together
 *    ("CarA normal car."). index.css:679 gives every bare <button>
 *    `inline-flex items-center justify-center`, so the two spans were laid
 *    out side by side as flex items.
 *
 * Run: npx playwright test --config=playwright.live.config.ts wheel-photos
 */

const EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL || '';
const PASS = process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD || '';

/** Davison's real listing, owned by a DIFFERENT account than the one testing. */
const REAL_CAR = 'Silver Hyundai Venue';
const REAL_CAR_TOWN = 'Mossel Bay, South Africa';

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {});
}

test.describe.serial('Wheel photos and vehicle-card layout', () => {
  test.skip(!EMAIL || !PASS, 'A test account is required in .env.test.');

  test('1. a vehicle photo actually loads on the Wheels tab', async ({ page }) => {
    const storageFailures: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/storage/v1/object/') && r.status() >= 400) {
        storageFailures.push(`${r.status()} ${r.url().slice(0, 120)}`);
      }
    });

    await login(page);
    await page.goto('/sleeping', { waitUntil: 'domcontentloaded' });

    const input = page.getByLabel('Town or city');
    await expect(input).toBeVisible({ timeout: 30000 });
    await input.fill(REAL_CAR_TOWN);
    await page.getByRole('button', { name: /^Go$/ }).click();
    await expect(page.getByRole('button', { name: /^Change$/ })).toBeVisible({ timeout: 40000 });

    // The listing is there, and it belongs to another member, so this also
    // proves a signed read works across owners.
    await expect(page.getByText(REAL_CAR)).toBeVisible({ timeout: 40000 });

    const card = page.locator('a[href^="/seed/wheel/"]').first();
    const img = card.locator('img').first();
    await expect(img).toBeVisible({ timeout: 30000 });

    // Poll until the browser has actually decoded pixels.
    await expect.poll(
      async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth),
      { timeout: 40000, message: 'image never decoded (naturalWidth stayed 0)' },
    ).toBeGreaterThan(0);

    const loaded = await img.evaluate((el: HTMLImageElement) => ({
      src: el.currentSrc || el.src,
      w: el.naturalWidth,
      h: el.naturalHeight,
    }));
    console.log(`\n[EVIDENCE] hub photo loaded ${loaded.w}x${loaded.h}`);
    console.log(`[EVIDENCE] url: ${loaded.src}`);
    console.log(`[EVIDENCE] failed storage responses: ${storageFailures.length}`);
    for (const f of storageFailures) console.log('   ' + f);

    // A signed URL, not the public path that always 400s.
    expect(loaded.src).toContain('/storage/v1/object/sign/');
    expect(loaded.src).not.toContain('/object/public/premium-room/');

    await page.screenshot({ path: 'test-results/evidence-hub-photo.png' });
  });

  test('2. the photo also loads on the seed detail page', async ({ page }) => {
    await login(page);
    await page.goto('/sleeping', { waitUntil: 'domcontentloaded' });
    const input = page.getByLabel('Town or city');
    await expect(input).toBeVisible({ timeout: 30000 });
    await input.fill(REAL_CAR_TOWN);
    await page.getByRole('button', { name: /^Go$/ }).click();
    await expect(page.getByRole('button', { name: /^Change$/ })).toBeVisible({ timeout: 40000 });

    await page.getByText(REAL_CAR).first().click();
    await page.waitForURL(/\/seed\/wheel\//, { timeout: 30000 });

    const img = page.locator('img').first();
    await expect(img).toBeVisible({ timeout: 30000 });
    await expect.poll(
      async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth),
      { timeout: 40000, message: 'detail image never decoded' },
    ).toBeGreaterThan(0);

    const loaded = await img.evaluate((el: HTMLImageElement) => ({ src: el.currentSrc || el.src, w: el.naturalWidth }));
    console.log(`\n[EVIDENCE] detail photo ${loaded.w}px wide: ${loaded.src}`);
    await page.screenshot({ path: 'test-results/evidence-detail-photo.png' });
  });

  test('3. vehicle-type cards stack label above hint, with even heights', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto('/sow/wheel', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=What is it?', { timeout: 30000 });
    await page.waitForTimeout(2000);

    const cards = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
        .filter((b) => /A normal car|open load bin|Digger|Tractor|pallets|does not cover/.test(b.textContent || ''));
      return btns.map((b) => {
        const spans = Array.from(b.querySelectorAll('span'));
        const label = spans[0].getBoundingClientRect();
        const hint = spans[1].getBoundingClientRect();
        return {
          label: (spans[0].textContent || '').slice(0, 24),
          cardHeight: Math.round(b.getBoundingClientRect().height),
          flexDirection: getComputedStyle(b).flexDirection,
          labelBottom: Math.round(label.bottom),
          hintTop: Math.round(hint.top),
          gap: Math.round(hint.top - label.bottom),
        };
      });
    });

    console.log('\n[EVIDENCE] vehicle cards at 390px wide');
    for (const c of cards) {
      console.log(`   "${c.label}"  h=${c.cardHeight} dir=${c.flexDirection} labelBottom=${c.labelBottom} hintTop=${c.hintTop} gap=${c.gap}`);
    }

    for (const c of cards) {
      // The hint must begin at or below the label's baseline box, never beside it.
      expect(c.hintTop, `"${c.label}" hint sits beside the label`).toBeGreaterThanOrEqual(c.labelBottom);
      // Tight, not floating: a small positive gap.
      expect(c.gap, `"${c.label}" gap too large`).toBeLessThanOrEqual(12);
      expect(c.flexDirection).toBe('column');
    }

    // Every card the same height.
    const distinct = Array.from(new Set(cards.map((c) => c.cardHeight)));
    console.log(`[EVIDENCE] distinct card heights: ${distinct.join(', ')}`);
    expect(distinct.length, `card heights differ: ${distinct.join(', ')}`).toBe(1);

    await page.screenshot({ path: 'test-results/evidence-sow-wheel-cards.png' });
  });
});
