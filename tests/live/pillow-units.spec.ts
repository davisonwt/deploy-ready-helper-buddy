import { test, expect, type Page } from '@playwright/test';
import { asUser, sweepProducts, reportSweep } from './support/fixtures';
import { waitForCoverAccepted } from './support/coverUpload';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run: npx playwright test --config=playwright.live.config.ts pillow-units
 */

const E = process.env.TEST_GOSAT_EMAIL || '', P = process.env.TEST_GOSAT_PASSWORD || '';
const PHOTO = path.resolve(__dirname, '../../src/assets/tier-grove.jpg');
const STAMP = process.env.QA_STAMP ?? String(Date.now()).slice(-6);
const TITLE = `QAUNITS ${STAMP}`;

// Three units of different types. The cheapest is the dome at 400, so the
// hub must quote "from 400", and the biggest sleeps 8, so a 6-person filter
// must keep this listing while a 12-person filter must drop it.
const UNITS = [
  { type: 'Room',          name: 'Garden room',  sleeps: '2', nightly: '900.00' },
  { type: 'Geodesic dome', name: 'Star dome',    sleeps: '4', nightly: '400.00' },
  { type: 'Safari tent',   name: 'Bush tent',    sleeps: '8', nightly: '1200.00' },
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

async function setPlace(page: Page, place: string) {
  await page.goto('/sleeping', { waitUntil: 'domcontentloaded' });
  const box = page.getByLabel('Town or city');
  await expect(box).toBeVisible({ timeout: 30000 });
  await box.fill(place);
  await page.getByRole('button', { name: 'Go' }).click();
  await expect(page.locator('#radius')).toBeVisible({ timeout: 30000 });
  await page.getByRole('tab', { name: 'Pillows' }).click();
  await page.waitForTimeout(3000);
}

test.describe.serial('A pillow listing is made of units', () => {
  /**
   * Teardown in a hook, never a final test: this block is serial, so a
   * failure marks every later test "did not run" and a cleanup test
   * would be skipped on exactly the runs that leak.
   */
  test.afterAll(async () => {
    if (!E || !P) return;
    const { client, userId } = await asUser(E, P, 'pillow-units');
    reportSweep('pillow-units', await sweepProducts(client, userId, [TITLE]));
  });

  test.skip(!E || !P, 'The owner account is required.');
  let listingId = '';

  for (const vp of [{ w: 390, h: 844, n: 'mobile-390' }, { w: 1280, h: 800, n: 'desktop-1280' }]) {
    test(`${vp.n}: the form opens with one unit and takes three`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await login(page);
      await page.goto('/sow/pillow', { waitUntil: 'domcontentloaded' });

      // It must NOT ask what kind of place this is before anything else.
      await expect(page.getByRole('heading', { name: /What can people book/i }))
        .toBeVisible({ timeout: 30000 });
      await expect(page.getByText(/What kind of place is it/i)).toHaveCount(0);
      // One unit ready to fill in, no clicking required.
      await expect(page.getByLabel('What do you call it?')).toHaveCount(1);
      await page.screenshot({ path: `test-results/pillow-units-form-${vp.n}.png` });

      if (vp.n !== 'mobile-390') return; // one full registration is enough

      for (let i = 0; i < UNITS.length; i++) {
        if (i > 0) await page.getByRole('button', { name: 'Add another unit' }).click();
        await page.waitForTimeout(500);
        const u = UNITS[i];
        await page.getByRole('button', { name: u.type, exact: true }).nth(i).click();
        await page.locator(`#unit-name-${i}`).fill(u.name);
        await page.locator(`#unit-sleeps-${i}`).fill(u.sleeps);
        await page.locator(`#rate_nightly-${i}`).fill(u.nightly);
      }
      console.log('[FORM] three units entered');

      await page.locator('input[type="file"]').nth(0).setInputFiles(PHOTO);
      // #pillow-title is always visible now, so it proved nothing. Wait for the
      // cover to be accepted, and say so plainly when it is rejected instead.
      await waitForCoverAccepted(page, 'Add a photo of the outside');
      await page.fill('#pillow-title', TITLE);
      await page.fill('#pillow-desc', 'QA: multi-unit listing.');
      await page.fill('#pillow-currency', 'ZAR');
      await page.locator('input[placeholder="Town or area"]').fill('Mossel Bay, South Africa');
      await page.locator('#pillow-legal').click();

      const submit = page.getByRole('button', { name: /^List my place$/ });
      await expect(submit, 'submit never enabled').toBeEnabled({ timeout: 30000 });
      await submit.click();
      await page.waitForURL(/\/seed\/pillow\/[0-9a-f-]+$/, { timeout: 90000 });
      listingId = page.url().split('/').pop()!;
      console.log('[CREATED] ' + listingId);

      // Every unit is listed on the detail page.
      for (const u of UNITS) {
        await expect(page.getByText(u.name, { exact: false }).first(),
          `${u.name} missing from the detail page`).toBeVisible({ timeout: 30000 });
      }
      await page.screenshot({ path: 'test-results/pillow-units-detail.png', fullPage: true });
    });
  }

  test('the hub quotes "from" the cheapest unit', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await setPlace(page, 'Mossel Bay, South Africa');

    const card = page.locator('a').filter({ hasText: TITLE }).first();
    await expect(card).toBeVisible({ timeout: 30000 });
    const text = (await card.innerText()).replace(/\s+/g, ' ');
    console.log('[HUB CARD] ' + text);
    expect(text, 'no "from" price').toMatch(/from/i);
    expect(text, 'the from price is not the cheapest unit').toMatch(/400[.,]00/);
    expect(text, 'quoted a dearer unit instead').not.toMatch(/1[ ,]?200[.,]00/);
    expect(text, 'unit count not shown').toMatch(/3 units/i);
    expect(text, 'capacity should be the largest unit').toMatch(/8/);
    await page.screenshot({ path: 'test-results/pillow-units-hub.png' });
  });

  test('the sleeps filter matches any unit, and excludes correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page);

    const near = async (minSleeps: number) => page.evaluate(async (n) => {
      const r = await fetch(
        'https://zuwkgasbkpjlxzsjzumu.supabase.co/rest/v1/rpc/sleeping_pillows_near',
        {
          method: 'POST',
          headers: {
            apikey: 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            _lat: -34.1832022, _lng: 22.1536248, _radius_m: 50000, _min_sleeps: n,
          }),
        },
      );
      return (await r.json()).map((x: { title: string; max_sleeps: number }) => x.title);
    }, minSleeps);

    const six = await near(6);
    const twelve = await near(12);
    console.log('[FILTER] min_sleeps=6  -> ' + JSON.stringify(six));
    console.log('[FILTER] min_sleeps=12 -> ' + JSON.stringify(twelve));

    // Kept: the 8-person tent satisfies 6 even though two units do not.
    expect(six, 'a listing whose biggest unit sleeps 8 must match min 6').toContain(TITLE);
    // Excluded: no unit sleeps 12.
    expect(twelve, 'no unit sleeps 12, so it must be excluded').not.toContain(TITLE);
  });
});
