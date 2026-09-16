import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Live verification of Phase 1: Sleeping Seeds hub + Sleeping Wheels
 * registration, discovery and booking. Runs against the real deployment.
 *
 * Run: npx playwright test --config=playwright.live.config.ts sleeping-wheels
 *
 * Scenarios map 1:1 to the brief's VERIFY list.
 */

// The live specs in this directory use TEST_USER_*; the payments specs use
// TEST_A_*. Accept either so this runs whichever the file actually carries.
const EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL || '';
const PASS = process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD || '';
const BUYER_EMAIL = process.env.TEST_USER2_EMAIL || process.env.TEST_B_EMAIL || '';
const BUYER_PASS = process.env.TEST_USER2_PASSWORD || process.env.TEST_B_PASSWORD || '';

const STAMP = process.env.SLEEPING_STAMP ?? String(Date.now()).slice(-6);
const COVER = path.resolve(__dirname, '../../src/assets/tier-grove.jpg');

/** The five types the brief names, with a distinct rate column each. */
const TYPES = [
  { label: 'Car',             value: 'sedan',           rate: 'rate_per_trip', amount: '12.00' },
  { label: 'Bakkie / pickup', value: 'bakkie',          rate: 'rate_per_trip', amount: '18.00' },
  { label: 'Truck',           value: 'truck',           rate: 'rate_daily',    amount: '95.00' },
  { label: 'Yellow machine',  value: 'yellow_machine',  rate: 'rate_hourly',   amount: '40.00' },
  { label: 'Farming vehicle', value: 'farming_vehicle', rate: 'rate_daily',    amount: '70.00' },
] as const;

const BASE_TOWN = 'Bethlehem, South Africa';
/** Roughly 230 km from BASE_TOWN, so distance sorting has something to sort. */
const FAR_TOWN = 'Bloemfontein, South Africa';
const CURRENCY = 'EUR'; // deliberately not USD, so "native currency" is provable

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {});
}

/** Deny geolocation and set the location by typing a place instead. */
async function setLocationByTyping(page: Page, place: string) {
  await page.goto('/sleeping', { waitUntil: 'domcontentloaded' });
  const input = page.getByLabel('Town or city');
  await expect(input).toBeVisible({ timeout: 20000 });
  await input.fill(place);
  await page.getByRole('button', { name: /^Go$/ }).click();
  await expect(page.getByRole('button', { name: /^Change$/ })).toBeVisible({ timeout: 30000 });
}

async function registerVehicle(
  page: Page,
  t: typeof TYPES[number],
  opts: { tickLicence: boolean; town?: string; title?: string },
) {
  await page.goto('/sow/wheel', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Register your vehicle/i })).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: new RegExp(`^${t.label}`) }).click();

  await page.locator('input[type="file"]').first().setInputFiles(COVER);
  await expect(page.locator('#wheel-title')).toBeVisible({ timeout: 20000 });
  await page.fill('#wheel-title', opts.title ?? `QA ${t.label} ${STAMP}`);
  await page.fill('#wheel-desc', `QA Phase 1 listing for ${t.value}.`);

  await page.fill('input#wheel-currency', CURRENCY);

  // The rate field may sit under "Show all rate options" for this type.
  const rateField = page.locator(`#${t.rate}`);
  if (await rateField.count() === 0) {
    await page.getByRole('button', { name: /Show all rate options/i }).click();
  }
  await page.locator(`#${t.rate}`).fill(t.amount);

  const loc = page.locator('input[placeholder="Town or area"]');
  await loc.fill(opts.town ?? BASE_TOWN);

  if (opts.tickLicence) {
    await page.locator('#wheel-licence').click();
    await expect(page.locator('#wheel-licence')).toHaveAttribute('data-state', 'checked', { timeout: 5000 });
  }

  return page.getByRole('button', { name: /^Register vehicle$/ });
}

test.describe.serial('Phase 1 - Sleeping Seeds + Sleeping Wheels', () => {
  test.skip(!EMAIL || !PASS, 'No test account in .env.test (TEST_USER_EMAIL/TEST_A_EMAIL).');

  // --- 5. licensing checkbox blocks submission -----------------------------
  test('5. licensing checkbox blocks submission when unticked', async ({ page }) => {
    await login(page, EMAIL, PASS);
    const btn = await registerVehicle(page, TYPES[0], { tickLicence: false });

    // Every other required field is complete, so the ONLY thing holding
    // submission is the unticked confirmation: 6 of 7.
    await expect(page.getByText(/6 of 7/)).toBeVisible({ timeout: 20000 });
    await expect(btn).toBeDisabled();
    await expect(page.getByText(/You have to tick this before you can register/i)).toBeVisible();

    // And it becomes submittable the moment the box is ticked.
    await page.locator('#wheel-licence').click();
    await expect(btn).toBeEnabled({ timeout: 10000 });
  });

  // --- 1. register one vehicle of each of the 5 types -----------------------
  for (const t of TYPES) {
    test(`1. register a ${t.label} (${t.value})`, async ({ page }) => {
      await login(page, EMAIL, PASS);
      const btn = await registerVehicle(page, t, { tickLicence: true });
      await expect(btn).toBeEnabled({ timeout: 20000 });
      await btn.click();
      await page.waitForURL(/\/seed\/wheel\/[0-9a-f-]+$/, { timeout: 60000 });
      await expect(page.getByRole('heading', { name: `QA ${t.label} ${STAMP}` })).toBeVisible({ timeout: 20000 });
    });
  }

  // --- 7. rates display in the listing's own currency -----------------------
  test('7. detail page shows rates in the listing currency, never converted', async ({ page }) => {
    await login(page, EMAIL, PASS);
    await setLocationByTyping(page, BASE_TOWN);
    await page.getByRole('link', { name: new RegExp(`QA Truck ${STAMP}`) }).first().click();
    await page.waitForURL(/\/seed\/wheel\//, { timeout: 30000 });

    await expect(page.getByText(`Rates in ${CURRENCY}`)).toBeVisible({ timeout: 20000 });
    // The euro amount is rendered by Intl, so assert the value and that no
    // dollar-denominated rate is shown next to it.
    await expect(page.getByText(/95[.,]00/).first()).toBeVisible();
    await expect(page.getByText('Payment is processed in USD', { exact: false })).toHaveCount(0);
  });

  // --- 2. all five appear in the Wheels tab --------------------------------
  test('2. all five appear in the Wheels tab', async ({ page }) => {
    await login(page, EMAIL, PASS);
    await setLocationByTyping(page, BASE_TOWN);

    for (const t of TYPES) {
      await expect(page.getByText(`QA ${t.label} ${STAMP}`)).toBeVisible({ timeout: 30000 });
    }
  });

  // --- 3. distance sort ----------------------------------------------------
  // All five above share one town, so they all read 0.0 away and prove
  // nothing about ordering. Register a sixth in a town roughly 230 km off
  // and widen the radius, so there are genuinely different distances to sort.
  test('3. distance sort is correct', async ({ page }) => {
    await login(page, EMAIL, PASS);
    const farTitle = `QA Far ${STAMP}`;
    const btn = await registerVehicle(page, TYPES[0], {
      tickLicence: true,
      town: FAR_TOWN,
      title: farTitle,
    });
    await expect(btn).toBeEnabled({ timeout: 20000 });
    await btn.click();
    await page.waitForURL(/\/seed\/wheel\/[0-9a-f-]+$/, { timeout: 60000 });

    await setLocationByTyping(page, BASE_TOWN);

    // Widen to the largest radius so the far listing is inside it.
    await page.locator('#radius').click();
    await page.getByRole('option').last().click();

    await expect(page.getByText(farTitle)).toBeVisible({ timeout: 30000 });

    // Read every distance line in DOM order; it must be non-decreasing and
    // must contain more than one distinct value.
    const texts = await page.locator('p', { hasText: /\d\s*(km|mi)\s*away/ }).allTextContents();
    const dist = texts
      .map((s) => Number(/([\d.]+)\s*(km|mi)\s*away/.exec(s)?.[1]))
      .filter((n) => Number.isFinite(n));

    expect(dist.length).toBeGreaterThan(1);
    expect(new Set(dist).size).toBeGreaterThan(1);
    expect(dist).toEqual([...dist].sort((a, b) => a - b));

    // And the far one is genuinely last.
    const titles = await page.locator('h3').allTextContents();
    expect(titles[titles.length - 1]).toContain(farTitle);
  });

  // --- 4. filters ----------------------------------------------------------
  test('4. each filter returns correct results', async ({ page }) => {
    await login(page, EMAIL, PASS);
    await setLocationByTyping(page, BASE_TOWN);
    await page.getByRole('button', { name: /^Filters/ }).click();

    // Vehicle type: Truck only.
    await page.getByRole('button', { name: 'Truck', exact: true }).click();
    await expect(page.getByText(`QA Truck ${STAMP}`)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(`QA Car ${STAMP}`)).toHaveCount(0);
    await page.getByRole('button', { name: 'Truck', exact: true }).click(); // clear

    // Rate period: Per hour -> only the yellow machine was priced hourly.
    await page.getByRole('button', { name: 'Per hour', exact: true }).click();
    await expect(page.getByText(`QA Yellow machine ${STAMP}`)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(`QA Truck ${STAMP}`)).toHaveCount(0);
    await page.getByRole('button', { name: 'Per hour', exact: true }).click(); // clear

    await expect(page.getByText(`QA Truck ${STAMP}`)).toBeVisible({ timeout: 30000 });
  });

  // --- 6. geolocation denied -> typed foreign city --------------------------
  test('6. geolocation denied, a typed foreign city geocodes correctly', async ({ page, context }) => {
    await context.clearPermissions();
    await context.grantPermissions([]); // geolocation denied
    await login(page, EMAIL, PASS);

    await setLocationByTyping(page, 'Lyon, France');
    // Nominatim returns a full display name; assert the city came back.
    await expect(page.getByText(/Lyon/i).first()).toBeVisible({ timeout: 30000 });

    // A South African listing must NOT be within 50 km of Lyon.
    await expect(page.getByText(`QA Truck ${STAMP}`)).toHaveCount(0);
    await expect(page.getByText(/No vehicles near you yet/i)).toBeVisible({ timeout: 30000 });
  });

  // --- 8. booking request end to end ---------------------------------------
  test('8. a booking request completes end to end', async ({ page }) => {
    test.skip(!BUYER_EMAIL || !BUYER_PASS, 'No second test account for the buyer side.');
    await login(page, BUYER_EMAIL, BUYER_PASS);
    await setLocationByTyping(page, BASE_TOWN);

    await page.getByRole('link', { name: new RegExp(`QA Truck ${STAMP}`) }).first().click();
    await page.waitForURL(/\/seed\/wheel\//, { timeout: 30000 });

    await page.getByRole('button', { name: /Request booking/i }).click();

    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await page.fill('#booking-date', tomorrow);
    await page.fill('#booking-time', '09:00');

    // The charge-currency disclosure must be visible before sending.
    await expect(page.getByText(/Payment is processed in USD/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /^Send request$/ }).click();
    await expect(page.getByText(/Booking request sent/i)).toBeVisible({ timeout: 30000 });
  });
});
