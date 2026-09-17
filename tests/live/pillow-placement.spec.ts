import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * "Beautifull Geodesic Domes Surrounded with Mountains" was saved at the
 * owner's profile default (-26.2, 28 -- Johannesburg), 1050 km from Mossel
 * Bay, so the Pillows tab found nothing at 31 mi while My Listings still
 * said "Showing in Sleeping Seeds".
 *
 * Run: npx playwright test --config=playwright.live.config.ts pillow-placement
 */

const EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL || '';
const PASS = process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD || '';
const OWNER_EMAIL = process.env.TEST_GOSAT_EMAIL || '';
const OWNER_PASS = process.env.TEST_GOSAT_PASSWORD || '';

const TITLE = 'Beautifull Geodesic Domes Surrounded with Mountains';
const QA_TITLE = `QAPLACE ${process.env.QA_STAMP ?? String(Date.now()).slice(-6)}`;

async function login(page: Page, email: string, pass: string) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', pass);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error(`login failed for ${email}`);
}

/** Point the hub at a place and wait for the radius control to appear. */
async function setPlace(page: Page, place: string) {
  await page.goto('/sleeping', { waitUntil: 'domcontentloaded' });
  const box = page.getByLabel('Town or city');
  await expect(box).toBeVisible({ timeout: 30000 });
  await box.fill(place);
  await page.getByRole('button', { name: 'Go' }).click();
  await expect(page.locator('#radius')).toBeVisible({ timeout: 30000 });
}

test.describe.serial('A pillow listing is placed where it actually is', () => {
  test.skip(!EMAIL || !PASS, 'A test account is required.');

  test('1. the Pillows tab finds it from Mossel Bay at 31 mi', async ({ page }) => {
    await login(page, EMAIL, PASS);
    await setPlace(page, 'Mossel Bay, South Africa');

    // 31 mi / 50 km is the default, which is the radius Davison used.
    await expect(page.locator('#radius')).toContainText(/31 mi|50 km/, { timeout: 15000 });

    await page.getByRole('tab', { name: 'Pillows' }).click();
    const card = page.getByText(TITLE, { exact: false }).first();
    await expect(card, 'the listing must appear in the Pillows tab').toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/No places to stay near you yet/i)).toHaveCount(0);

    // Its photo must actually decode, not merely carry a src. The cover
    // lives in a private bucket, so SignedImg holds src empty until the
    // signed URL arrives -- measuring immediately reads 0x0 on a good image.
    const loaded = await page.waitForFunction((title) => {
      const leaf = Array.from(document.querySelectorAll('*'))
        .find((n) => n.children.length === 0 && n.textContent?.includes(title));
      let card: HTMLElement | null = leaf as HTMLElement | null;
      while (card && !card.querySelector('img')) card = card.parentElement;
      const pic = card?.querySelector('img') as HTMLImageElement | null;
      if (!pic || !pic.src || pic.naturalWidth === 0) return null;
      return { src: pic.src.slice(0, 90), w: pic.naturalWidth, h: pic.naturalHeight };
    }, TITLE, { timeout: 30000 }).then((h) => h.jsonValue());
    console.log('[EVIDENCE] photo:', JSON.stringify(loaded));
    expect(loaded!.w, 'the photo did not decode').toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/pillow-mossel-bay.png', fullPage: true });
  });

  test('2. it is absent from a place it is not near', async ({ page }) => {
    await login(page, EMAIL, PASS);
    await setPlace(page, 'Johannesburg, South Africa');
    await page.getByRole('tab', { name: 'Pillows' }).click();
    await page.waitForTimeout(6000);
    await expect(
      page.getByText(TITLE, { exact: false }),
      'a Mossel Bay listing must not show in Johannesburg',
    ).toHaveCount(0);
    console.log('[EVIDENCE] absent from Johannesburg at the default radius');
  });

  test('3. the owner card states where it shows, not just that it shows', async ({ page }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASS, 'The owner account is required.');
    await login(page, OWNER_EMAIL, OWNER_PASS);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });

    const row = page.locator('li').filter({ hasText: TITLE }).first();
    await expect(row).toBeVisible({ timeout: 30000 });
    // The claim must name the place, which is what makes a wrong one visible.
    await expect(row.getByText(/Showing in Sleeping Seeds near /i)).toBeVisible({ timeout: 20000 });
    await expect(row.getByText(/Checking where this shows/i)).toHaveCount(0);

    const text = (await row.innerText()).replace(/\s+/g, ' ');
    console.log('[EVIDENCE] owner card:', text.slice(0, 220));
    await page.screenshot({ path: 'test-results/my-listings-placed.png', fullPage: true });
  });

  test('4. an unplaceable listing is reported as not showing', async ({ page }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASS, 'The owner account is required.');
    await login(page, OWNER_EMAIL, OWNER_PASS);

    // Blank the coordinates in the page's own session, then re-render, so the
    // no-coordinates branch is exercised through the real component rather
    // than by damaging live data.
    await page.route('**/rest/v1/pillow_seed_details*', async (route) => {
      const res = await route.fetch();
      let body: any;
      try { body = await res.json(); } catch { return route.fulfill({ response: res }); }
      if (Array.isArray(body)) {
        body = body.map((r: any) => ({ ...r, base_lat: null, base_lng: null }));
      }
      await route.fulfill({ response: res, body: JSON.stringify(body) });
    });

    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    const row = page.locator('li').filter({ hasText: TITLE }).first();
    await expect(row).toBeVisible({ timeout: 30000 });
    await expect(row.getByText(/Not showing in Sleeping Seeds/i)).toBeVisible({ timeout: 20000 });
    await expect(row.getByText(/Tap Edit and give a town or city/i)).toBeVisible();

    const text = (await row.innerText()).replace(/\s+/g, ' ');
    console.log('[EVIDENCE] unplaced card:', text.slice(0, 260));
    await page.screenshot({ path: 'test-results/my-listings-unplaced.png', fullPage: true });
  });

  test('5. a wheel card names its place too -- the branch is shared', async ({ page }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASS, 'The owner account is required.');
    await login(page, OWNER_EMAIL, OWNER_PASS);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });

    const wheel = page.locator('li').filter({ hasText: 'Silver Hyundai Venue' }).first();
    await expect(wheel).toBeVisible({ timeout: 30000 });
    await expect(wheel.getByText(/Showing in Sleeping Seeds near /i)).toBeVisible({ timeout: 20000 });
    console.log('[EVIDENCE] wheel card:', (await wheel.innerText()).replace(/\s+/g, ' ').slice(0, 160));
  });

  test('6. a three-part location now resolves instead of falling back', async ({ page }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASS, 'The owner account is required.');
    test.setTimeout(240_000);
    await login(page, OWNER_EMAIL, OWNER_PASS);
    await page.goto('/sow/pillow', { waitUntil: 'domcontentloaded' });
    // Units replaced the stay-type grid: the form opens with unit 1 ready.
    await page.locator('#unit-name-0').fill('QA unit');
    await page.locator('#unit-sleeps-0').fill('2');
    await page.locator('#rate_nightly-0').fill('100.00');

    await page.locator('input[type="file"]').nth(0)
      .setInputFiles(path.resolve(__dirname, '../../src/assets/tier-grove.jpg'));
    await expect(page.locator('#pillow-title')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2500);

    await page.fill('#pillow-title', QA_TITLE);
    await page.fill('#pillow-desc', 'QA: three-part location must not fall back to the profile default.');
    await page.fill('#pillow-currency', 'ZAR');
    // The exact string that used to save Johannesburg coordinates.
    await page.locator('input[placeholder="Town or area"]').fill('Mossel Bay, Seven Bells, Western Cape');
    await page.locator('#pillow-legal').click();

    const btn = page.getByRole('button', { name: /^List my place$/ });
    await expect(btn).toBeEnabled({ timeout: 30000 });
    await btn.click();
    await page.waitForURL(/\/seed\/pillow\/[0-9a-f-]+$/, { timeout: 90000 });
    const id = page.url().split('/').pop()!;
    console.log('[EVIDENCE] QA listing created:', id);

    // It must be findable from Mossel Bay, which is the whole point.
    await setPlace(page, 'Mossel Bay, South Africa');
    await page.getByRole('tab', { name: 'Pillows' }).click();
    await expect(page.getByText(QA_TITLE, { exact: false }).first())
      .toBeVisible({ timeout: 30000 });
    console.log('[EVIDENCE] QA listing is visible from Mossel Bay at the default radius');
  });
});
