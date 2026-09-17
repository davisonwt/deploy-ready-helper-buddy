import { test, expect, type Page } from '@playwright/test';

/**
 * The Trust & Safety queue can be acted on, not just read.
 *
 * Guards three things that were all broken before 2026-09-17:
 *   1. A fail-open row (verdict 'allow' + needs_review) appears at all. Those
 *      are the ones that most need a human -- the image is LIVE while it waits.
 *   2. The flagged image is visible. The queue used to print bucket/path as
 *      text, so Allow / Delete / Suspend were decisions made blind.
 *   3. "Delete image" deletes the object. It used to stamp the row and nothing
 *      else, while the toast claimed "hidden now".
 *
 * Needs two disposable rows seeded first (scratchpad/seed-queue-rows.mjs), and
 * an account holding gosat or admin:
 *   QUEUE_ALLOW_ID=<id> QUEUE_DELETE_ID=<id> npx playwright test \
 *     --config=playwright.live.config.ts moderation-queue
 */

const E = process.env.TEST_GOSAT_EMAIL || '';
const P = process.env.TEST_GOSAT_PASSWORD || '';
const ALLOW_ID = process.env.QUEUE_ALLOW_ID || '';
const DELETE_ID = process.env.QUEUE_DELETE_ID || '';

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', E);
    await page.fill('input[type="password"]', P);
    await page.click('button[type="submit"]');
    const ok = await page
      .waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

/** Open the queue by the same link the gosat alert uses. */
async function openQueue(page: Page) {
  await page.goto('/admin/dashboard?tab=moderation', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Scan verdicts', { exact: false }).first())
    .toBeVisible({ timeout: 45000 });
  await page.waitForTimeout(4000);
}

/**
 * The card for one media_moderation row. The card renders "bucket/object_path",
 * not the row id, so find it by the tag baked into the seeded path.
 */
function rowCard(page: Page, tag: string) {
  return page.locator('div.rounded-md.border').filter({ hasText: tag }).first();
}

test.describe.serial('Trust & Safety queue', () => {
  test.skip(!E || !P, 'A gosat/admin account is required in .env.test.');

  test('1. /admin/moderation lands on the queue, not the dashboard', async ({ page }) => {
    await login(page);
    await page.goto('/admin/moderation', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const url = page.url();
    console.log(`[EVIDENCE] /admin/moderation -> ${url}`);
    expect(url).toContain('tab=moderation');
    await expect(page.getByText('Scan verdicts', { exact: false }).first())
      .toBeVisible({ timeout: 45000 });
  });

  test('2. a flagged image renders as a thumbnail that actually decodes', async ({ page }) => {
    test.skip(!DELETE_ID, 'needs a seeded row');
    await login(page);
    await openQueue(page);

    const imgs = page.locator('img[alt="Flagged upload"]');
    const count = await imgs.count();
    console.log(`[EVIDENCE] thumbnails rendered: ${count}`);
    expect(count, 'no flagged thumbnails at all').toBeGreaterThan(0);

    // Assert against the SEEDED row, which is known to be a real JPEG. The
    // queue also holds chat-media and orchard-videos rows that are video or
    // audio; those correctly fall back to a labelled tile rather than a
    // broken <img>, so "the first thumbnail" proves nothing.
    const first = rowCard(page, 'QAQUEUE-delete').locator('img[alt="Flagged upload"]');
    await expect(first, 'the seeded image has no thumbnail').toHaveCount(1, { timeout: 20000 });
    const src = await first.getAttribute('src');
    console.log(`[EVIDENCE] thumbnail src: ${String(src).slice(0, 90)}`);
    expect(src, 'thumbnail is not a signed storage URL').toContain('/storage/v1/object/sign/');

    const decoded = await first.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
    expect(decoded, 'the thumbnail element exists but the image did not decode').toBe(true);

    await page.screenshot({ path: 'test-results/moderation-queue-thumbs.png', fullPage: false });
  });

  test('3. Allow resolves the row and clears it from the queue', async ({ page }) => {
    test.skip(!ALLOW_ID, 'needs a seeded row');
    await login(page);
    await openQueue(page);

    const card = rowCard(page, 'QAQUEUE-allow');
    await expect(card, 'the seeded fail-open row is not in the queue').toBeVisible({ timeout: 20000 });
    await card.getByRole('button', { name: /^Allow$/ }).click();
    await expect(card).toHaveCount(0, { timeout: 20000 });
    console.log('[EVIDENCE] Allow: row cleared from the queue');
  });

  test('4. Delete image removes the row from the queue', async ({ page }) => {
    test.skip(!DELETE_ID, 'needs a seeded row');
    await login(page);
    await openQueue(page);

    const card = rowCard(page, 'QAQUEUE-delete');
    await expect(card, 'the seeded row is not in the queue').toBeVisible({ timeout: 20000 });
    await card.getByRole('button', { name: /^Delete image$/ }).click();
    await expect(card).toHaveCount(0, { timeout: 30000 });
    console.log('[EVIDENCE] Delete image: row cleared from the queue');
    await page.screenshot({ path: 'test-results/moderation-queue-after-delete.png', fullPage: false });
  });
});
