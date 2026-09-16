import { test, expect, type Page } from '@playwright/test';

/**
 * Live verification that images stored in the private premium-room bucket
 * render everywhere, not just on the Wheels surfaces.
 *
 * The defect: a getPublicUrl() link to a private bucket answers HTTP 400
 * "Bucket not found", so the <img> fails with naturalWidth 0 and shows
 * nothing. SignedImg re-signs it.
 *
 * Run: npx playwright test --config=playwright.live.config.ts private-bucket
 */

const A_EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL || '';
const A_PASS = process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD || '';
const OWNER_EMAIL = process.env.TEST_GOSAT_EMAIL || '';
const OWNER_PASS = process.env.TEST_GOSAT_PASSWORD || '';

const CAR = 'Silver Hyundai Venue';
const CAR_TOWN = 'Mossel Bay, South Africa';
const CAR_ID = '819a5b71-48a4-40c5-9fc7-f516aa82c348';

async function login(page: Page, email: string, pass: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', pass);
    await page.click('button[type="submit"]');
    const ok = await page
      .waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error('could not sign in after two attempts');
}

/** Every premium-room image on the page, with whether it actually decoded. */
async function premiumImages(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .map((i) => ({ src: i.currentSrc || i.src, w: i.naturalWidth }))
      .filter((i) => i.src.includes('premium-room')));
}

test.describe.serial('Private-bucket images render', () => {
  test.skip(!A_EMAIL || !A_PASS, 'A test account is required in .env.test.');

  test('1. the seed detail page decodes every premium-room image', async ({ page }) => {
    const failures: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/storage/v1/object/') && r.status() >= 400) {
        failures.push(`${r.status()} ${r.url().slice(0, 110)}`);
      }
    });

    await login(page, A_EMAIL, A_PASS);
    // The car's detail page renders three separate premium-room fields: the
    // listing cover, the owner's wandering profile photo, and the wandering
    // gallery. HandSeedDetailPage and PillowSeedDetailPage render the same
    // fields through the same components, so this is that shared path.
    await page.goto(`/seed/wheel/${CAR_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10000);

    const imgs = await premiumImages(page);
    console.log(`
[EVIDENCE] premium-room images on the seed detail page: ${imgs.length}`);
    for (const i of imgs) console.log(`   w=${i.w}  ${i.src.slice(0, 120)}`);
    console.log(`[EVIDENCE] failed storage responses: ${failures.length}`);
    for (const f of failures) console.log('   ' + f);

    expect(imgs.length, 'no premium-room image on the page to test').toBeGreaterThan(0);
    for (const i of imgs) {
      expect(i.src, 'still using the public path that 400s').not.toContain('/object/public/premium-room/');
      expect(i.w, `image did not decode: ${i.src.slice(0, 90)}`).toBeGreaterThan(0);
    }
    expect(failures.length, 'a storage request still failed').toBe(0);
    await page.screenshot({ path: 'test-results/pbi-1-detail.png', fullPage: true });
  });

  test('2. no page-level storage failures on the pillow sow form', async ({ page }) => {
    const failures: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/storage/v1/object/') && r.status() >= 400) failures.push(`${r.status()} ${r.url().slice(0, 110)}`);
    });
    await login(page, A_EMAIL, A_PASS);
    await page.goto('/sow/pillow', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    const imgs = await premiumImages(page);
    console.log(`
[EVIDENCE] /sow/pillow premium-room images: ${imgs.length}, storage failures: ${failures.length}`);
    for (const i of imgs) expect(i.w).toBeGreaterThan(0);
    expect(failures.length).toBe(0);
    await page.screenshot({ path: 'test-results/pbi-2-sow-pillow.png' });
  });

  test('3. regression: the Wheels tab photo still decodes', async ({ page }) => {
    await login(page, A_EMAIL, A_PASS);
    await page.goto('/sleeping', { waitUntil: 'domcontentloaded' });

    const input = page.getByLabel('Town or city');
    const change = page.getByRole('button', { name: /^Change$/ });
    await expect(input.or(change).first()).toBeVisible({ timeout: 45000 });
    if (await change.count()) { await change.click(); await expect(input).toBeVisible({ timeout: 20000 }); }
    await input.fill(CAR_TOWN);
    await page.getByRole('button', { name: /^Go$/ }).click();
    await expect(change).toBeVisible({ timeout: 45000 });
    await expect(page.getByText(CAR)).toBeVisible({ timeout: 40000 });

    const img = page.locator('a[href^="/seed/wheel/"]').first().locator('img').first();
    await expect.poll(async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth),
      { timeout: 40000 }).toBeGreaterThan(0);
    const src = await img.evaluate((el: HTMLImageElement) => el.currentSrc || el.src);
    console.log(`\n[EVIDENCE] hub car photo: ${src.slice(0, 120)}`);
    expect(src).toContain('/storage/v1/object/sign/');
  });

  test('4. regression: Share sits on My Listings with the other actions', async ({ page }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASS, 'The owner account is required.');
    await login(page, OWNER_EMAIL, OWNER_PASS);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(CAR)).toBeVisible({ timeout: 30000 });

    for (const name of ['Open', 'Edit', 'Share', 'Delete']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${name}$`) }).or(
        page.getByRole('link', { name: new RegExp(`^${name}$`) })).first()).toBeVisible({ timeout: 20000 });
    }
    await expect(page.getByRole('button', { name: /Make unavailable|Make available/ })).toBeVisible();

    // And the listing's own photo decodes here too.
    const img = page.locator('li img').first();
    if (await img.count()) {
      await expect.poll(async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth),
        { timeout: 30000 }).toBeGreaterThan(0);
      console.log('[EVIDENCE] My Listings thumbnail decoded');
    }
    await page.screenshot({ path: 'test-results/pbi-4-my-listings.png' });
  });
});
