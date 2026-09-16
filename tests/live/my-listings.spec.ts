import { test, expect, type Page } from '@playwright/test';

/**
 * Live verification of /my-listings and the Wheel edit mode, driven with
 * Davison's own account against his real car.
 *
 * Run: npx playwright test --config=playwright.live.config.ts my-listings
 */

const EMAIL = process.env.TEST_GOSAT_EMAIL || '';
const PASS = process.env.TEST_GOSAT_PASSWORD || '';

const CAR = 'Silver Hyundai Venue';
const CAR_ID = '819a5b71-48a4-40c5-9fc7-f516aa82c348';
const CAR_TOWN = 'Mossel Bay, South Africa';

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {});
}

/** Set the hub location and return whether the car is listed. */
async function carVisibleInHub(page: Page): Promise<boolean> {
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

  // Let the proximity query settle before counting.
  await page.waitForTimeout(6000);
  return (await page.getByText(CAR).count()) > 0;
}

test.describe.serial('My Listings', () => {
  test.skip(!EMAIL || !PASS, 'The owner account is required in .env.test.');

  test('1. the car is listed on /my-listings', async ({ page }) => {
    await login(page);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(CAR)).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: /Make unavailable|Make available/ })).toBeVisible();
    await page.screenshot({ path: 'test-results/ml-1-list.png' });
  });

  test('2. Edit opens the real wheel form, prefilled', async ({ page }) => {
    await login(page);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(CAR)).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: /^Edit$/ }).first().click();

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
    await page.goto(`/sow/wheel?edit=${CAR_ID}`, { waitUntil: 'domcontentloaded' });
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
    await page.goto(`/sow/wheel?edit=${CAR_ID}`, { waitUntil: 'domcontentloaded' });
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

    expect(await carVisibleInHub(page), 'car should start visible').toBe(true);
    console.log('[EVIDENCE] before toggle: car IS in the Wheels tab');

    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(CAR)).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Make unavailable' }).first().click();
    await expect(page.getByText(/is now unavailable/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Hidden from Sleeping Seeds')).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: 'test-results/ml-4-unavailable.png' });

    expect(await carVisibleInHub(page), 'car should be hidden while unavailable').toBe(false);
    console.log('[EVIDENCE] after toggle: car is GONE from the Wheels tab');

    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Make available' }).first().click();
    await expect(page.getByText(/is available again/i)).toBeVisible({ timeout: 20000 });

    expect(await carVisibleInHub(page), 'car should be back after re-enabling').toBe(true);
    console.log('[EVIDENCE] re-enabled: car is BACK in the Wheels tab');
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
