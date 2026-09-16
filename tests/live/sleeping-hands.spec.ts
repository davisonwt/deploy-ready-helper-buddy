import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Live verification of Sleeping Hands, mirroring the Wheels and Pillows
 * suites, plus the references privacy rule which is unique to Hands.
 *
 * Run: npx playwright test --config=playwright.live.config.ts sleeping-hands
 */

const EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL || '';
const PASS = process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD || '';
const B_EMAIL = process.env.TEST_USER2_EMAIL || process.env.TEST_B_EMAIL || '';
const B_PASS = process.env.TEST_USER2_PASSWORD || process.env.TEST_B_PASSWORD || '';

const SUPA = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const PUBKEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

const STAMP = process.env.HAND_STAMP ?? String(Date.now()).slice(-6);
const PHOTO = path.resolve(__dirname, '../../src/assets/tier-grove.jpg');
const TOWN = 'Bethlehem, South Africa';
const FAR_TOWN = 'Bloemfontein, South Africa';
const CURRENCY = 'EUR';

const PRO_TITLE = `QAH Plumber ${STAMP}`;
const HOUSE_TITLE = `QAH Cleaner ${STAMP}`;
const FAR_TITLE = `QAH Far ${STAMP}`;

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

/** /sow/hand needs an active hand wandering role. Unlock it once. */
async function ensureHandRole(page: Page) {
  await page.goto('/sow/hand', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  if (page.url().includes('/sow/hand')) return;

  // Landed on the unlock page.
  await page.locator('input[type="file"]').first().setInputFiles(PHOTO);
  await page.waitForTimeout(3000);
  await page.fill('#wandering-name', 'QA hand tester');
  await page.fill('#wandering-town', 'Bethlehem');
  await page.fill('#wandering-tagline', 'QA hand listing tester');
  const galleryInput = page.locator('input[type="file"]').nth(1);
  for (let i = 0; i < 3; i++) { await galleryInput.setInputFiles(PHOTO); await page.waitForTimeout(2500); }
  await page.fill('input[placeholder="Name"]', 'QA Customer');
  await page.fill('input[placeholder="Town"]', 'Bethlehem');
  await page.fill('textarea[placeholder="A short quote about working with you"]', 'Great work.');
  for (const rowText of ['I own this and I operate it myself', "I accept Sow2Grow's"]) {
    const row = page.locator('div', { has: page.getByText(rowText, { exact: false }) })
      .filter({ has: page.locator('button[role="checkbox"]') }).last();
    const box = await row.boundingBox();
    if (box) await page.mouse.click(box.x + box.width - 8, box.y + 8);
  }
  const btn = page.getByRole('button', { name: /^Unlock/ });
  await expect(btn).toBeEnabled({ timeout: 20000 });
  await btn.click();
  await page.waitForTimeout(6000);
}

async function hubAt(page: Page, town: string, title?: string) {
  await page.goto('/sleeping?tab=hands', { waitUntil: 'domcontentloaded' });
  const input = page.getByLabel('Town or city');
  const change = page.getByRole('button', { name: /^Change$/ });
  await expect(input.or(change).first()).toBeVisible({ timeout: 45000 });
  if (await change.count()) { await change.click(); await expect(input).toBeVisible({ timeout: 20000 }); }
  await input.fill(town);
  await page.getByRole('button', { name: /^Go$/ }).click();
  await expect(change).toBeVisible({ timeout: 45000 });
  await page.getByRole('tab', { name: 'Hands' }).click();
  await page.waitForTimeout(6000);
  return title ? (await page.getByText(title).count()) > 0 : true;
}

interface FormOpts {
  categoryLabel: string;
  title: string;
  qualification?: string;
  reference?: boolean;
  tickLegal?: boolean;
  town?: string;
  rateColumn?: string;
  amount?: string;
  years?: string;
  language?: string;
}

async function fillHandForm(page: Page, o: FormOpts) {
  await page.goto('/sow/hand', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Offer your hand/i })).toBeVisible({ timeout: 25000 });

  await page.getByRole('button', { name: o.categoryLabel, exact: true }).click();

  if (o.qualification) await page.fill('#hand-qualification', o.qualification);
  await page.fill('#hand-years', o.years ?? '5');
  await page.getByRole('button', { name: o.language ?? 'English', exact: true }).first().click();

  const files = page.locator('input[type="file"]');
  await files.nth(0).setInputFiles(PHOTO);
  await expect(page.locator('#hand-title')).toBeVisible({ timeout: 25000 });
  await page.waitForTimeout(2500);

  await page.fill('#hand-title', o.title);
  await page.fill('#hand-desc', 'QA hand listing.');
  await page.locator('input[placeholder="Town or area"]').fill(o.town ?? TOWN);
  await page.fill('#hand-currency', CURRENCY);
  await page.locator(`#${o.rateColumn ?? 'rate_hourly'}`).fill(o.amount ?? '120.00');

  if (o.reference) {
    await page.getByRole('button', { name: 'Add a reference' }).click();
    await page.getByLabel('Referee 1 name').fill('Thandi Mokoena');
    await page.getByLabel('Referee 1 relationship').fill('Former employer');
    await page.getByLabel('Referee 1 contact').fill('+27 82 555 0143');
  }

  if (o.tickLegal !== false) {
    await page.locator('#hand-legal').click();
    await expect(page.locator('#hand-legal')).toHaveAttribute('data-state', 'checked', { timeout: 5000 });
  }
  return page.getByRole('button', { name: /^Offer my hand$/ });
}

test.describe.serial('Sleeping Hands', () => {
  test.skip(!EMAIL || !PASS, 'A test account is required in .env.test.');

  test('0. unlock the hand role', async ({ page }) => {
    await login(page);
    await ensureHandRole(page);
    await page.goto('/sow/hand', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Offer your hand/i })).toBeVisible({ timeout: 25000 });
    console.log('[EVIDENCE] /sow/hand reachable');
  });

  test('2a. qualification blocks a PROFESSIONAL listing when empty', async ({ page }) => {
    await login(page);
    const btn = await fillHandForm(page, {
      categoryLabel: 'Plumber', title: PRO_TITLE, reference: false,
    });
    await expect(btn).toBeDisabled();
    await expect(page.getByText(/Add your qualification or licence/i)).toBeVisible({ timeout: 10000 });
    console.log('[EVIDENCE] professional without qualification: button disabled, reason shown');
    await page.fill('#hand-qualification', 'Red Seal qualified plumber, 2016');
    await expect(btn).toBeEnabled({ timeout: 10000 });
    console.log('[EVIDENCE] enabled once the qualification is typed');
  });

  test('2b. qualification does NOT block a HOUSEHOLD listing', async ({ page }) => {
    await login(page);
    const btn = await fillHandForm(page, {
      categoryLabel: 'Cleaning', title: HOUSE_TITLE, reference: true,
    });
    const qual = await page.locator('#hand-qualification').inputValue();
    expect(qual).toBe('');
    await expect(btn).toBeEnabled({ timeout: 15000 });
    console.log('[EVIDENCE] household with EMPTY qualification and a reference: button enabled');
  });

  test('3. references block a HOUSEHOLD listing when empty', async ({ page }) => {
    await login(page);
    const btn = await fillHandForm(page, {
      categoryLabel: 'Cleaning', title: HOUSE_TITLE, reference: false,
    });
    await expect(btn).toBeDisabled();
    await expect(page.getByText(/Add at least one reference/i)).toBeVisible({ timeout: 10000 });
    console.log('[EVIDENCE] household with no reference: button disabled, reason shown');
  });

  test('4. the legal checkbox blocks submission when unticked', async ({ page }) => {
    await login(page);
    const btn = await fillHandForm(page, {
      categoryLabel: 'Plumber', title: PRO_TITLE,
      qualification: 'Red Seal qualified plumber, 2016', tickLegal: false,
    });
    await expect(btn).toBeDisabled();
    await expect(page.getByText(/You have to tick this before you can offer/i)).toBeVisible();
    await page.locator('#hand-legal').click();
    await expect(btn).toBeEnabled({ timeout: 10000 });
    console.log('[EVIDENCE] legal unticked disables, ticking enables');
  });

  test('1a. register the PROFESSIONAL listing', async ({ page }) => {
    await login(page);
    const btn = await fillHandForm(page, {
      categoryLabel: 'Plumber', title: PRO_TITLE,
      qualification: 'Red Seal qualified plumber, 2016', years: '12',
      rateColumn: 'rate_hourly', amount: '120.00',
    });
    await expect(btn).toBeEnabled({ timeout: 25000 });
    await btn.click();
    await page.waitForURL(/\/seed\/hand\/[0-9a-f-]+$/, { timeout: 60000 });
    console.log(`[EVIDENCE] professional -> ${page.url()}`);
  });

  test('1b. register the HOUSEHOLD listing, with a reference', async ({ page }) => {
    await login(page);
    const btn = await fillHandForm(page, {
      categoryLabel: 'Cleaning', title: HOUSE_TITLE, reference: true,
      years: '4', rateColumn: 'rate_daily', amount: '350.00', language: 'Afrikaans',
    });
    await expect(btn).toBeEnabled({ timeout: 25000 });
    await btn.click();
    await page.waitForURL(/\/seed\/hand\/[0-9a-f-]+$/, { timeout: 60000 });
    console.log(`[EVIDENCE] household -> ${page.url()}`);
  });

  test('5. both appear in the Hands tab with photos that load', async ({ page }) => {
    const failures: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/storage/v1/object/') && r.status() >= 400) failures.push(`${r.status()} ${r.url().slice(0, 90)}`);
    });
    await login(page);
    await hubAt(page, TOWN);
    await expect(page.getByText(PRO_TITLE)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(HOUSE_TITLE)).toBeVisible({ timeout: 30000 });

    const img = page.locator('a[href^="/seed/hand/"]').first().locator('img').first();
    await expect.poll(async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth),
      { timeout: 40000 }).toBeGreaterThan(0);
    const src = await img.evaluate((el: HTMLImageElement) => el.currentSrc || el.src);
    console.log(`\n[EVIDENCE] hand photo: ${src.slice(0, 130)}`);
    console.log(`[EVIDENCE] failed storage responses: ${failures.length}`);
    expect(src).toContain('/storage/v1/object/sign/premium-room/');
    expect(failures.length).toBe(0);
  });

  test('6. rates show in the listing currency, never converted', async ({ page }) => {
    await login(page);
    await hubAt(page, TOWN);
    await page.getByText(PRO_TITLE).first().click();
    await page.waitForURL(/\/seed\/hand\//, { timeout: 30000 });
    await expect(page.getByText(`Rates in ${CURRENCY}`)).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/120[.,]00/).first()).toBeVisible();
    await expect(page.getByText('Payment is processed in USD', { exact: false })).toHaveCount(0);
    console.log('[EVIDENCE] "Rates in EUR" with 120.00 and no converted figure');
  });

  test('7. distance sort is correct', async ({ page }) => {
    await login(page);
    const btn = await fillHandForm(page, {
      categoryLabel: 'Plumber', title: FAR_TITLE,
      qualification: 'Qualified 2019', town: FAR_TOWN, amount: '99.00',
    });
    await expect(btn).toBeEnabled({ timeout: 25000 });
    await btn.click();
    await page.waitForURL(/\/seed\/hand\//, { timeout: 60000 });

    await hubAt(page, TOWN);
    await page.locator('#radius').click();
    await page.getByRole('option').last().click();
    await expect(page.getByText(FAR_TITLE)).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(3000);

    const texts = await page.locator('p', { hasText: /\d\s*(km|mi)\s*away/ }).allTextContents();
    const dist = texts.map((s) => Number(/([\d.]+)\s*(km|mi)\s*away/.exec(s)?.[1])).filter((n) => Number.isFinite(n));
    console.log(`\n[EVIDENCE] distances in DOM order: ${JSON.stringify(dist)}`);
    expect(dist.length).toBeGreaterThan(1);
    expect(new Set(dist).size).toBeGreaterThan(1);
    expect(dist).toEqual([...dist].sort((a, b) => a - b));
    const titles = await page.locator('h3').allTextContents();
    expect(titles[titles.length - 1]).toContain(FAR_TITLE);
    console.log('[EVIDENCE] the far listing sorts last');
  });

  test('8. each filter returns correct results', async ({ page }) => {
    await login(page);
    await hubAt(page, TOWN);
    await page.getByRole('button', { name: /^Filters/ }).click();

    // Group toggle
    await page.getByRole('button', { name: 'Around the home', exact: true }).click();
    await expect(page.getByText(HOUSE_TITLE)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(PRO_TITLE)).toHaveCount(0);
    console.log('[EVIDENCE] group "Around the home": cleaner shown, plumber hidden');
    await page.getByRole('button', { name: 'Around the home', exact: true }).click();

    // Category
    await page.getByRole('button', { name: 'Plumber', exact: true }).click();
    await expect(page.getByText(PRO_TITLE)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(HOUSE_TITLE)).toHaveCount(0);
    console.log('[EVIDENCE] category Plumber: plumber shown, cleaner hidden');
    await page.getByRole('button', { name: 'Plumber', exact: true }).click();

    // Rate period
    await page.getByRole('button', { name: 'Per day', exact: true }).click();
    await expect(page.getByText(HOUSE_TITLE)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(PRO_TITLE)).toHaveCount(0);
    console.log('[EVIDENCE] rate Per day: cleaner shown, hourly plumber hidden');
    await page.getByRole('button', { name: 'Per day', exact: true }).click();

    // Language
    await page.getByRole('button', { name: 'Afrikaans', exact: true }).click();
    await expect(page.getByText(HOUSE_TITLE)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(PRO_TITLE)).toHaveCount(0);
    console.log('[EVIDENCE] language Afrikaans: cleaner shown, English-only plumber hidden');
    await page.getByRole('button', { name: 'Afrikaans', exact: true }).click();

    // Minimum years
    await page.getByRole('button', { name: '10+', exact: true }).click();
    await expect(page.getByText(PRO_TITLE)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(HOUSE_TITLE)).toHaveCount(0);
    console.log('[EVIDENCE] years 10+: 12-year plumber shown, 4-year cleaner hidden');
    await page.getByRole('button', { name: '10+', exact: true }).click();
  });

  // --- THE PRIVACY TEST ----------------------------------------------------
  test('9. references are invisible without a booking, visible with one', async ({ page }) => {
    test.skip(!B_EMAIL || !B_PASS, 'A second test account is required.');
    const { createClient } = await import('@supabase/supabase-js');

    // Find the household listing's id (it is the one with a reference).
    await login(page);
    await hubAt(page, TOWN);
    await page.getByText(HOUSE_TITLE).first().click();
    await page.waitForURL(/\/seed\/hand\//, { timeout: 30000 });
    const productId = page.url().split('/seed/hand/')[1].split('?')[0];
    console.log(`\n[EVIDENCE] household listing id: ${productId}`);

    // --- as account B, with NO booking ---
    const asB = createClient(SUPA, PUBKEY, { auth: { persistSession: false } });
    const { error: bErr } = await asB.auth.signInWithPassword({ email: B_EMAIL, password: B_PASS });
    expect(bErr).toBeNull();

    const before = await asB.from('hand_seed_references')
      .select('id, referee_name, relationship, contact').eq('product_id', productId);
    console.log(`[EVIDENCE] B WITHOUT booking -> data=${JSON.stringify(before.data)} error=${JSON.stringify(before.error)}`);
    expect(before.error, 'RLS should filter, not error').toBeNull();
    expect(before.data, 'a browsing member must see ZERO reference rows').toEqual([]);

    const { data: countBefore } = await asB.rpc('hand_reference_count' as never, { _product_id: productId } as never);
    console.log(`[EVIDENCE] B count via SECURITY DEFINER -> ${countBefore}`);
    expect(Number(countBefore), 'the count must still be visible').toBeGreaterThan(0);

    // B's own eyes on the detail page: a count, no names.
    await login(page, B_EMAIL, B_PASS);
    await page.goto(`/seed/hand/${productId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    await expect(page.getByText(/reference(s)? available/i)).toBeVisible({ timeout: 25000 });
    await expect(page.getByText('Thandi Mokoena')).toHaveCount(0);
    await expect(page.getByText('+27 82 555 0143')).toHaveCount(0);
    console.log('[EVIDENCE] B sees the count, and neither the referee name nor the number');
    await page.screenshot({ path: 'test-results/hand-privacy-before.png' });

    // --- B books, then looks again ---
    await page.getByRole('button', { name: /Request booking/i }).click();
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await page.fill('#booking-date', tomorrow);
    const timeField = page.locator('#booking-time');
    if (await timeField.count()) await timeField.fill('09:00');
    await page.getByRole('button', { name: /^Send request$/ }).click();
    await expect(page.getByText(/Booking request sent/i)).toBeVisible({ timeout: 30000 });
    console.log('[EVIDENCE] B created a booking against the listing');

    const after = await asB.from('hand_seed_references')
      .select('id, referee_name, relationship, contact').eq('product_id', productId);
    console.log(`[EVIDENCE] B WITH booking -> data=${JSON.stringify(after.data)} error=${JSON.stringify(after.error)}`);
    expect(after.data?.length, 'after booking the referee must be readable').toBeGreaterThan(0);
    expect(after.data?.[0]?.referee_name).toBe('Thandi Mokoena');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    await expect(page.getByText('Thandi Mokoena')).toBeVisible({ timeout: 25000 });
    console.log('[EVIDENCE] the detail page now shows the referee to B');
    await page.screenshot({ path: 'test-results/hand-privacy-after.png' });
  });

  test('10. all five My Listings actions work on a hand listing', async ({ page }) => {
    await login(page);

    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(PRO_TITLE)).toBeVisible({ timeout: 30000 });
    const row = () => page.locator('li').filter({ hasText: PRO_TITLE }).first();

    await row().getByRole('link', { name: /^Open$/ }).click();
    await page.waitForURL(/\/seed\/hand\//, { timeout: 30000 });
    console.log(`[EVIDENCE] Open -> ${page.url()}`);

    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await row().getByRole('button', { name: /^Share$/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('tab', { name: 'Tribe' })).toBeVisible();
    console.log('[EVIDENCE] Share opened the shared ShareSeedDialog');
    await page.keyboard.press('Escape');

    await row().getByRole('button', { name: /^Edit$/ }).click();
    await page.waitForURL(/\/sow\/hand\?edit=/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Edit your service/i })).toBeVisible({ timeout: 25000 });
    const editUrl = page.url();
    const before = await page.locator('#rate_hourly').inputValue();
    const after = String(Number(before) + 1);
    console.log(`[EVIDENCE] editing rate_hourly ${before} -> ${after}`);
    await page.locator('#rate_hourly').fill(after);
    await page.getByRole('button', { name: /^Save changes$/ }).click();
    await page.waitForURL(/\/my-listings/, { timeout: 40000 });
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#rate_hourly')).toHaveValue(after, { timeout: 25000 });
    console.log(`[EVIDENCE] rate persisted as ${after}`);
    await page.locator('#rate_hourly').fill(before);
    await page.getByRole('button', { name: /^Save changes$/ }).click();
    await page.waitForURL(/\/my-listings/, { timeout: 40000 });

    expect(await hubAt(page, TOWN, PRO_TITLE), 'should start visible').toBe(true);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await row().getByRole('button', { name: 'Make unavailable' }).click();
    await expect(page.getByText(/is now unavailable/i)).toBeVisible({ timeout: 20000 });
    expect(await hubAt(page, TOWN, PRO_TITLE), 'should be hidden').toBe(false);
    console.log('[EVIDENCE] unavailable removed it from the Hands tab');

    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await row().getByRole('button', { name: 'Make available' }).click();
    await expect(page.getByText(/is available again/i)).toBeVisible({ timeout: 20000 });
    expect(await hubAt(page, TOWN, PRO_TITLE), 'should be back').toBe(true);
    console.log('[EVIDENCE] re-enabled and back in the Hands tab');
  });
});
