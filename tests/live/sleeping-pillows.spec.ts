import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Live verification of Sleeping Pillows, mirroring the Wheels suite.
 *
 * Run: npx playwright test --config=playwright.live.config.ts sleeping-pillows
 */

const EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL || '';
const PASS = process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD || '';
const BUYER_EMAIL = process.env.TEST_USER2_EMAIL || process.env.TEST_B_EMAIL || '';
const BUYER_PASS = process.env.TEST_USER2_PASSWORD || process.env.TEST_B_PASSWORD || '';

const STAMP = process.env.PILLOW_STAMP ?? String(Date.now()).slice(-6);
const PHOTO = path.resolve(__dirname, '../../src/assets/tier-grove.jpg');

const TOWN = 'Bethlehem, South Africa';
/** ~230 km off, so distance sorting has something to sort. */
const FAR_TOWN = 'Bloemfontein, South Africa';
const CURRENCY = 'EUR'; // deliberately not USD, so "native currency" is provable

/** The seven stay types, each with a distinct rate column and amenity. */
const TYPES = [
  { label: 'Room in my home',  value: 'room_in_home',     rate: 'rate_nightly', amount: '30.00', amenity: 'Own bathroom', sleeps: 2, unitType: 'Room' },
  { label: 'The whole place',  value: 'whole_place',      rate: 'rate_weekly',  amount: '420.00', amenity: 'Kitchen access', sleeps: 6, unitType: 'Cottage' },
  { label: 'Guest house',      value: 'guest_house',      rate: 'rate_nightly', amount: '55.00', amenity: 'Breakfast', sleeps: 4, unitType: 'Room' },
  { label: 'Hotel or motel',   value: 'hotel_motel_room', rate: 'rate_nightly', amount: '75.00', amenity: 'Wifi', sleeps: 2, unitType: 'Room' },
  { label: 'Farm stay',        value: 'farm_stay',        rate: 'rate_monthly', amount: '900.00', amenity: 'Braai', sleeps: 8, unitType: 'Cottage' },
  { label: 'Bush camp',        value: 'bush_camp',        rate: 'rate_nightly', amount: '20.00', amenity: 'Parking', sleeps: 4, unitType: 'Tent' },
  { label: 'Something else',   value: 'other',            rate: 'rate_weekly',  amount: '300.00', amenity: 'Wifi', sleeps: 3, unitType: 'Something else' },
] as const;

async function login(page: Page, email = EMAIL, pass = PASS) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', pass);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

/** Set the hub to a town and return whether a title is listed. */
async function hubAt(page: Page, town: string, title?: string) {
  await page.goto('/sleeping?tab=pillows', { waitUntil: 'domcontentloaded' });
  const input = page.getByLabel('Town or city');
  const change = page.getByRole('button', { name: /^Change$/ });
  await expect(input.or(change).first()).toBeVisible({ timeout: 45000 });
  if (await change.count()) { await change.click(); await expect(input).toBeVisible({ timeout: 20000 }); }
  await input.fill(town);
  await page.getByRole('button', { name: /^Go$/ }).click();
  await expect(change).toBeVisible({ timeout: 45000 });
  await page.getByRole('tab', { name: 'Pillows' }).click();
  await page.waitForTimeout(6000);
  return title ? (await page.getByText(title).count()) > 0 : true;
}

async function fillPillowForm(
  page: Page,
  t: typeof TYPES[number],
  opts: { tickLegal: boolean; town?: string; title?: string },
) {
  await page.goto('/sow/pillow', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /List your place/i })).toBeVisible({ timeout: 25000 });

  // Units replaced the stay-type grid, the sleeps counter and the
  // listing-level rate step (20260917110000_pillow_units). The form opens
  // with unit 1 present, so this fills it rather than picking a type first.
  await page.locator('#unit-name-0').fill(`${t.label} ${STAMP}`);
  await page.locator('#unit-sleeps-0').fill(String(t.sleeps));
  await page.locator(`#${t.rate}-0`).fill(t.amount);
  const unitTypeBtn = page.getByRole('button', { name: t.unitType, exact: true });
  if (await unitTypeBtn.count()) await unitTypeBtn.first().click();

  // Photos: the first CoverDropZone is the outside, the second the inside.
  const files = page.locator('input[type="file"]');
  await files.nth(0).setInputFiles(PHOTO);
  await expect(page.locator('#pillow-title')).toBeVisible({ timeout: 25000 });
  await files.nth(1).setInputFiles(PHOTO);
  await page.waitForTimeout(3000);

  await page.fill('#pillow-title', opts.title ?? `QAP ${t.label} ${STAMP}`);
  await page.fill('#pillow-desc', `QA pillow listing for ${t.value}.`);

  const amenity = page.getByRole('button', { name: t.amenity, exact: true });
  if (await amenity.count()) await amenity.first().click();

  await page.fill('#pillow-currency', CURRENCY);

  await page.locator('input[placeholder="Town or area"]').fill(opts.town ?? TOWN);

  if (opts.tickLegal) {
    await page.locator('#pillow-legal').click();
    await expect(page.locator('#pillow-legal')).toHaveAttribute('data-state', 'checked', { timeout: 5000 });
  }
  return page.getByRole('button', { name: /^List my place$/ });
}

test.describe.serial('Sleeping Pillows', () => {
  test.skip(!EMAIL || !PASS, 'A test account is required in .env.test.');

  // --- 5. legal checkbox blocks submission ---------------------------------
  test('5. the legal checkbox blocks submission when unticked', async ({ page }) => {
    await login(page);
    const btn = await fillPillowForm(page, TYPES[0], { tickLegal: false });
    // Six required items now, not seven: one units check replaced the
    // separate stay-type, sleeps and rate checks (20260917110000_pillow_units).
    // .first(): the count appears on the step indicator and on the plant
    // button, and either one being visible is the point.
    await expect(page.getByText(/5 of 6/).first()).toBeVisible({ timeout: 25000 });
    await expect(btn).toBeDisabled();
    await expect(page.getByText(/You have to tick this before you can list/i)).toBeVisible();
    await page.locator('#pillow-legal').click();
    await expect(btn).toBeEnabled({ timeout: 10000 });
    console.log('[EVIDENCE] disabled at 5 of 6, enabled the moment the box is ticked');
  });

  // --- 1. register one of each of the 7 stay types -------------------------
  for (const t of TYPES) {
    test(`1. register a ${t.label} (${t.value})`, async ({ page }) => {
      await login(page);
      const btn = await fillPillowForm(page, t, { tickLegal: true });
      await expect(btn).toBeEnabled({ timeout: 25000 });
      await btn.click();
      await page.waitForURL(/\/seed\/pillow\/[0-9a-f-]+$/, { timeout: 60000 });
      await expect(page.getByRole('heading', { name: `QAP ${t.label} ${STAMP}` })).toBeVisible({ timeout: 25000 });
      console.log(`[EVIDENCE] ${t.value} -> ${page.url()}`);
    });
  }

  // --- 2. all seven in the Pillows tab, photos loading ---------------------
  test('2. all seven appear in the Pillows tab with photos that load', async ({ page }) => {
    const failures: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/storage/v1/object/') && r.status() >= 400) failures.push(`${r.status()} ${r.url().slice(0, 100)}`);
    });

    await login(page);
    await hubAt(page, TOWN);
    for (const t of TYPES) {
      await expect(page.getByText(`QAP ${t.label} ${STAMP}`)).toBeVisible({ timeout: 30000 });
    }

    const img = page.locator('a[href^="/seed/pillow/"]').first().locator('img').first();
    await expect.poll(async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth),
      { timeout: 40000 }).toBeGreaterThan(0);
    const src = await img.evaluate((el: HTMLImageElement) => el.currentSrc || el.src);
    console.log(`\n[EVIDENCE] first pillow photo: ${src}`);
    console.log(`[EVIDENCE] failed storage responses: ${failures.length}`);
    expect(src).toContain('/storage/v1/object/sign/premium-room/');
    expect(failures.length).toBe(0);
    await page.screenshot({ path: 'test-results/pillow-hub.png' });
  });

  // --- 6. native currency --------------------------------------------------
  test('6. rates show in the listing currency, never converted', async ({ page }) => {
    await login(page);
    await hubAt(page, TOWN);
    await page.getByText(`QAP Guest house ${STAMP}`).first().click();
    await page.waitForURL(/\/seed\/pillow\//, { timeout: 30000 });
    await expect(page.getByText(`Rates in ${CURRENCY}`)).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/55[.,]00/).first()).toBeVisible();
    await expect(page.getByText('Payment is processed in USD', { exact: false })).toHaveCount(0);
    console.log('[EVIDENCE] detail page reads "Rates in EUR" with 55.00 and no converted figure');
  });

  // --- 3. distance sort ----------------------------------------------------
  test('3. distance sort is correct', async ({ page }) => {
    await login(page);
    const farTitle = `QAP Far ${STAMP}`;
    const btn = await fillPillowForm(page, TYPES[0], { tickLegal: true, town: FAR_TOWN, title: farTitle });
    await expect(btn).toBeEnabled({ timeout: 25000 });
    await btn.click();
    await page.waitForURL(/\/seed\/pillow\//, { timeout: 60000 });

    await hubAt(page, TOWN);
    await page.locator('#radius').click();
    await page.getByRole('option').last().click();
    await expect(page.getByText(farTitle)).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(3000);

    const texts = await page.locator('p', { hasText: /\d\s*(km|mi)\s*away/ }).allTextContents();
    const dist = texts.map((s) => Number(/([\d.]+)\s*(km|mi)\s*away/.exec(s)?.[1])).filter((n) => Number.isFinite(n));
    console.log(`\n[EVIDENCE] distances in DOM order: ${JSON.stringify(dist)}`);
    expect(dist.length).toBeGreaterThan(1);
    expect(new Set(dist).size, 'every distance identical, nothing to sort').toBeGreaterThan(1);
    expect(dist).toEqual([...dist].sort((a, b) => a - b));

    const titles = await page.locator('h3').allTextContents();
    expect(titles[titles.length - 1]).toContain(farTitle);
    console.log('[EVIDENCE] the far listing sorts last');
  });

  // --- 4. filters ----------------------------------------------------------
  test('4. each filter returns correct results', async ({ page }) => {
    await login(page);
    await hubAt(page, TOWN);
    await page.getByRole('button', { name: /^Filters/ }).click();

    // Stay type
    await page.getByRole('button', { name: 'Farm stay', exact: true }).click();
    await expect(page.getByText(`QAP Farm stay ${STAMP}`)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(`QAP Bush camp ${STAMP}`)).toHaveCount(0);
    console.log('[EVIDENCE] stay type: Farm stay shown, Bush camp hidden');
    await page.getByRole('button', { name: 'Farm stay', exact: true }).click();

    // Amenity (must have all)
    await page.getByRole('button', { name: 'Braai', exact: true }).click();
    await expect(page.getByText(`QAP Farm stay ${STAMP}`)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(`QAP Hotel or motel ${STAMP}`)).toHaveCount(0);
    console.log('[EVIDENCE] amenity Braai: farm stay shown, hotel hidden');
    await page.getByRole('button', { name: 'Braai', exact: true }).click();

    // Rate period
    await page.getByRole('button', { name: 'Per month', exact: true }).click();
    await expect(page.getByText(`QAP Farm stay ${STAMP}`)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(`QAP Guest house ${STAMP}`)).toHaveCount(0);
    console.log('[EVIDENCE] rate period Per month: only the monthly listing');
    await page.getByRole('button', { name: 'Per month', exact: true }).click();

    // Sleeps
    await page.getByRole('button', { name: '8+', exact: true }).click();
    await expect(page.getByText(`QAP Farm stay ${STAMP}`)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(`QAP Room in my home ${STAMP}`)).toHaveCount(0);
    console.log('[EVIDENCE] sleeps 8+: farm stay shown, 2-sleeper hidden');
    await page.getByRole('button', { name: '8+', exact: true }).click();

    await expect(page.getByText(`QAP Guest house ${STAMP}`)).toBeVisible({ timeout: 30000 });
  });

  // --- 8. My Listings: all five actions ------------------------------------
  test('8. all five My Listings actions work on a pillow', async ({ page }) => {
    await login(page);
    const title = `QAP Guest house ${STAMP}`;

    // Open
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(title)).toBeVisible({ timeout: 30000 });
    const row = page.locator('li').filter({ hasText: title }).first();
    await row.getByRole('link', { name: /^Open$/ }).click();
    await page.waitForURL(/\/seed\/pillow\//, { timeout: 30000 });
    console.log(`[EVIDENCE] Open -> ${page.url()}`);

    // Share
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(title)).toBeVisible({ timeout: 30000 });
    await page.locator('li').filter({ hasText: title }).first().getByRole('button', { name: /^Share$/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('tab', { name: 'Tribe' })).toBeVisible();
    console.log('[EVIDENCE] Share opened the shared ShareSeedDialog');
    await page.keyboard.press('Escape');

    // Edit, persisting a changed rate
    await page.locator('li').filter({ hasText: title }).first().getByRole('button', { name: /^Edit$/ }).click();
    await page.waitForURL(/\/sow\/pillow\?edit=/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Edit your place/i })).toBeVisible({ timeout: 25000 });
    const editUrl = page.url();
    const before = await page.locator('#rate_nightly').inputValue();
    const after = String(Number(before) + 1);
    console.log(`[EVIDENCE] editing rate_nightly ${before} -> ${after}`);
    await page.locator('#rate_nightly').fill(after);
    await page.getByRole('button', { name: /^Save changes$/ }).click();
    await page.waitForURL(/\/my-listings/, { timeout: 40000 });
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#rate_nightly')).toHaveValue(after, { timeout: 25000 });
    console.log(`[EVIDENCE] rate persisted as ${after}`);
    await page.locator('#rate_nightly').fill(before);
    await page.getByRole('button', { name: /^Save changes$/ }).click();
    await page.waitForURL(/\/my-listings/, { timeout: 40000 });

    // Availability toggle removes it from the hub, then restores it
    expect(await hubAt(page, TOWN, title), 'should start visible').toBe(true);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await page.locator('li').filter({ hasText: title }).first()
      .getByRole('button', { name: 'Make unavailable' }).click();
    await expect(page.getByText(/is now unavailable/i)).toBeVisible({ timeout: 20000 });
    expect(await hubAt(page, TOWN, title), 'should be hidden').toBe(false);
    console.log('[EVIDENCE] unavailable removed it from the Pillows tab');

    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await page.locator('li').filter({ hasText: title }).first()
      .getByRole('button', { name: 'Make available' }).click();
    await expect(page.getByText(/is available again/i)).toBeVisible({ timeout: 20000 });
    expect(await hubAt(page, TOWN, title), 'should be back').toBe(true);
    console.log('[EVIDENCE] re-enabled and back in the Pillows tab');
  });

  // --- 7. booking end to end ----------------------------------------------
  test('7. a booking request completes end to end', async ({ page }) => {
    test.skip(!BUYER_EMAIL || !BUYER_PASS, 'A second test account is required.');
    await login(page, BUYER_EMAIL, BUYER_PASS);
    await hubAt(page, TOWN);
    await page.getByText(`QAP Guest house ${STAMP}`).first().click();
    await page.waitForURL(/\/seed\/pillow\//, { timeout: 30000 });

    await page.getByRole('button', { name: /Request booking/i }).click();
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await page.fill('#booking-date', tomorrow);
    await expect(page.getByText(/Payment is processed in USD/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /^Send request$/ }).click();
    await expect(page.getByText(/Booking request sent/i)).toBeVisible({ timeout: 30000 });
    console.log('[EVIDENCE] booking request sent, charge currency disclosed first');
  });
});
