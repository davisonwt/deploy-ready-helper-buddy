import { test, expect, type Page } from '@playwright/test';
import { asUser, createWheelListing, sweepProducts, reportSweep, trackUploads, sweepTrackedUploads, type TrackedUpload } from './support/fixtures';

/**
 * Live verification of /my-listings and the Wheel edit mode.
 *
 * Every mutating test here runs against a wheel listing this run creates
 * and deletes. It used to edit and pause the owner's real "Silver Hyundai
 * Venue" and put it back afterwards; that restore failed open twice --
 * 2026-09-17, and again on 2026-09-22, when test 4 failed between "Make
 * unavailable" and "Make available" and the afterAll net found no button,
 * did nothing and logged nothing. The listing sat missing from
 * /sleeping?tab=wheels until the owner noticed.
 *
 * Read-only assertions may still name the real car; nothing writes to it.
 *
 * Run: npx playwright test --config=playwright.live.config.ts my-listings
 */

const EMAIL = process.env.TEST_GOSAT_EMAIL || '';
const PASS = process.env.TEST_GOSAT_PASSWORD || '';

/**
 * The owner's real car -- READ ONLY. Never edited, paused or deleted.
 * CAR_ID is used only to navigate to a URL that must redirect away.
 */
const CAR = 'Silver Hyundai Venue';
const CAR_ID = '819a5b71-48a4-40c5-9fc7-f516aa82c348';
const CAR_TOWN = 'Mossel Bay, South Africa';

/** This run's own listing, the only row these tests may mutate. */
const STAMP = process.env.QA_STAMP ?? String(Date.now()).slice(-6);
const QA_CAR = `QAML Wheel ${STAMP}`;
let qaCarId = '';

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {});
}

/** Set the hub location and return whether `title` is listed there. */
async function listingVisibleInHub(page: Page, title: string): Promise<boolean> {
  await page.goto('/sleeping', { waitUntil: 'domcontentloaded' });

  // Either the location form renders (nothing stored yet) or the location is
  // already set and a Change button is shown. Wait for whichever appears.
  const input = page.getByLabel('Town or city');
  const change = page.getByRole('button', { name: /^Change$/ });
  await expect(input.or(change).first()).toBeVisible({ timeout: 45000 });

  if (await change.count()) {
    // Reset so this run always resolves the town it means to.
    await change.click();
    await expect(input).toBeVisible({ timeout: 20000 });
  }
  await input.fill(CAR_TOWN);
  await page.getByRole('button', { name: /^Go$/ }).click();
  await expect(change).toBeVisible({ timeout: 45000 });

  // Let the proximity query settle before counting. The hub no longer cuts
  // on radius (b43a7eb4), so a fixture in another town still appears.
  await page.waitForTimeout(6000);
  return (await page.getByText(title).count()) > 0;
}

/**
 * The card for the test car specifically.
 *
 * Every action on /my-listings renders once per listing. While the owner
 * account had a single listing, `.first()` was unambiguous; it now has a
 * wheel, a pillow and a hand, and "first" is not the car. An unscoped
 * `.first()` here took one of Davison's real listings offline on
 * 2026-09-17. Always scope a destructive action to its own card.
 */
function carCardOf(page: Page) {
  return page.locator('li').filter({ hasText: CAR }).first();
}

/** The card for THIS RUN's listing -- the only one a test may act on. */
function qaCardOf(page: Page) {
  return page.locator('li').filter({ hasText: QA_CAR }).first();
}

test.describe.serial('My Listings', () => {

  /** Objects this spec's own pages upload, swept in afterAll. */
  const trackedUploads: TrackedUpload[] = [];
  test.beforeEach(({ page }) => trackUploads(page, trackedUploads));
  // Test 4 toggles a REAL listing's availability against production. If it
  // fails between the two clicks, the car is left hidden from the Wheels hub
  // and the next run fails on its very first assertion -- which is exactly
  // what happened on 2026-09-17. Put it back whatever the outcome.
  test.beforeAll(async () => {
    if (!EMAIL || !PASS) return;
    const { client, userId } = await asUser(EMAIL, PASS, 'the owner account');
    qaCarId = await createWheelListing(client, userId, QA_CAR, { town: 'Bethlehem, Free State' });
  });

  /**
   * Deleting the fixture is the whole safety net now. The old one tried to
   * put the REAL car back by looking for a "Make available" button, and
   * when it found none it did nothing and said nothing -- a silent no-op
   * that read as success while the listing stayed hidden.
   */
  test.afterAll(async () => {
    if (!EMAIL || !PASS) return;
    const { client, userId } = await asUser(EMAIL, PASS, 'the owner account');
    reportSweep('my-listings', await sweepProducts(client, userId, [QA_CAR]));
    await sweepTrackedUploads(client, trackedUploads, 'my-listings');
  });

  test.skip(!EMAIL || !PASS, 'The owner account is required in .env.test.');

  test('1. the car is listed on /my-listings', async ({ page }) => {
    await login(page);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(CAR)).toBeVisible({ timeout: 30000 });
    // .first(): the owner account has several real listings now, so this
    // matches one button per card. The loop above already does the same.
    await expect(page.getByRole('button', { name: /Make unavailable|Make available/ }).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/ml-1-list.png' });
  });

  test('2. Edit opens the real wheel form, prefilled', async ({ page }) => {
    await login(page);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(CAR)).toBeVisible({ timeout: 30000 });
    // Scope Edit to the CAR's own card. .first() picked whichever listing
    // rendered first, which stopped being the car once the owner account had
    // a pillow and a hand listing too -- it then opened the wrong sow form.
    const carCard = page.locator('li').filter({ hasText: CAR }).first();
    await carCard.getByRole('button', { name: /^Edit$/ }).first().click();

    await page.waitForURL(/\/sow\/wheel\?edit=/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Edit your vehicle/i })).toBeVisible({ timeout: 30000 });

    // Prefilled from the listing, not a blank new form.
    await expect(page.locator('#wheel-title')).toHaveValue(CAR, { timeout: 20000 });
    const currency = await page.locator('#wheel-currency').inputValue();
    console.log(`[EVIDENCE] prefilled currency = ${currency}`);
    expect(currency).toMatch(/^[A-Z]{3}$/);
    await expect(page.getByRole('button', { name: /^Save changes$/ })).toBeVisible();
    await page.screenshot({ path: 'test-results/ml-2-edit.png' });
  });

  test('3. editing a rate saves and shows on the hub', async ({ page }) => {
    await login(page);
    // This run's own listing. It used to be the owner's real car.
    await page.goto(`/sow/wheel?edit=${qaCarId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Edit your vehicle/i })).toBeVisible({ timeout: 30000 });

    // Pick whichever rate field already carries a value and bump it.
    const cols = ['rate_per_trip', 'rate_hourly', 'rate_per_km', 'rate_daily', 'rate_weekly', 'rate_monthly'];
    let target = '';
    let before = '';
    for (const c of cols) {
      const el = page.locator(`#${c}`);
      if (await el.count()) {
        const v = await el.inputValue();
        if (v && Number(v) > 0) { target = c; before = v; break; }
      }
    }
    expect(target, 'no rate field carried a value').not.toBe('');
    const after = String(Number(before) + 1);
    console.log(`[EVIDENCE] editing ${target}: ${before} -> ${after}`);

    await page.locator(`#${target}`).fill(after);
    const save = page.getByRole('button', { name: /^Save changes$/ });
    await expect(save).toBeEnabled({ timeout: 20000 });
    await save.click();
    await page.waitForURL(/\/my-listings/, { timeout: 40000 });

    // Reopen and confirm it persisted.
    await page.goto(`/sow/wheel?edit=${qaCarId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Edit your vehicle/i })).toBeVisible({ timeout: 30000 });
    await expect(page.locator(`#${target}`)).toHaveValue(after, { timeout: 20000 });
    console.log(`[EVIDENCE] ${target} persisted as ${after}`);

    // Put it back.
    await page.locator(`#${target}`).fill(before);
    await page.getByRole('button', { name: /^Save changes$/ }).click();
    await page.waitForURL(/\/my-listings/, { timeout: 40000 });
  });

  test('4. unavailable hides it from the Wheels tab, available brings it back', async ({ page }) => {
    await login(page);

    expect(await listingVisibleInHub(page, QA_CAR), 'fixture should start visible').toBe(true);
    console.log('[EVIDENCE] before toggle: the fixture IS in the Wheels tab');

    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(QA_CAR)).toBeVisible({ timeout: 30000 });
    // Scope to THIS RUN's card. Unscoped, .first() hit whichever listing
    // rendered first and on 2026-09-17 that took a REAL listing offline
    // (scripts/studio/restore_s2g_electricians_availability_20260917.sql).
    await qaCardOf(page).getByRole('button', { name: 'Make unavailable' }).click();
    await expect(page.getByText(/is now unavailable/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Hidden from Sleeping Seeds')).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: 'test-results/ml-4-unavailable.png' });

    expect(await listingVisibleInHub(page, QA_CAR), 'fixture should be hidden while unavailable').toBe(false);
    console.log('[EVIDENCE] after toggle: the fixture is GONE from the Wheels tab');

    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await qaCardOf(page).getByRole('button', { name: 'Make available' }).click();
    await expect(page.getByText(/is available again/i)).toBeVisible({ timeout: 20000 });

    expect(await listingVisibleInHub(page, QA_CAR), 'fixture should be back after re-enabling').toBe(true);
    console.log('[EVIDENCE] re-enabled: the fixture is BACK in the Wheels tab');
  });

  test('5. EditForm refuses to open a service listing', async ({ page }) => {
    await login(page);
    await page.goto(`/products/edit/${CAR_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/my-listings/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible({ timeout: 20000 });
    console.log('[EVIDENCE] /products/edit/<car> redirected to /my-listings');
  });

  test('6. the Cockpit nav carries My Listings under Sleeping Seeds', async ({ page }) => {
    await login(page);
    await page.goto('/cockpit', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const body = await page.locator('body').innerText();
    expect(body).toContain('My Listings');
    const iSleep = body.indexOf('Sleeping Seeds');
    const iMine = body.indexOf('My Listings');
    console.log(`[EVIDENCE] nav order: Sleeping Seeds at ${iSleep}, My Listings at ${iMine}`);
    expect(iMine).toBeGreaterThan(iSleep);
    await page.screenshot({ path: 'test-results/ml-6-nav.png' });
  });
});
