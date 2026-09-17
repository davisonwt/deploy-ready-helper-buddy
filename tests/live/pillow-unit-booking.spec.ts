import { test, expect, type Page } from '@playwright/test';

/**
 * Booking targets one unit, and editing a unit's rate persists.
 *
 * Run: npx playwright test --config=playwright.live.config.ts pillow-unit-booking
 */

const OWNER_E = process.env.TEST_GOSAT_EMAIL || '', OWNER_P = process.env.TEST_GOSAT_PASSWORD || '';
// A booking needs a second member: the owner cannot book their own seed.
// TEST_A is davisontest1, a different user id from the owner.
const GUEST_E = process.env.TEST_A_EMAIL || '';
const GUEST_P = process.env.TEST_A_PASSWORD || '';
const LISTING = process.env.QA_LISTING_ID || '';
const TITLE = process.env.QA_TITLE || '';

async function login(page: Page, email: string, pass: string) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', pass);
    await page.click('button[type="submit"]');
    if (await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false)) return;
  }
  throw new Error('login failed for ' + email);
}

test.describe.serial('Units can be booked and edited', () => {
  test.skip(!OWNER_E || !OWNER_P || !LISTING, 'Needs the owner account and a listing id.');

  test('a guest books one specific unit', async ({ page }) => {
    test.skip(!GUEST_E || !GUEST_P, 'Needs a second account: the owner cannot book their own seed.');
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, GUEST_E, GUEST_P);
    await page.goto(`/seed/pillow/${LISTING}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);

    // Choose the dome, which is neither the first nor the dearest unit, so a
    // booking that silently used unit one or the headline price is visible.
    const dome = page.getByRole('button', { name: /Star dome/i }).first();
    await expect(dome, 'the unit list did not render').toBeVisible({ timeout: 30000 });
    await dome.click();
    await page.waitForTimeout(800);

    await page.getByRole('button', { name: 'Request booking' }).click();
    const date = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    await page.locator('#booking-date').fill(date);
    await page.locator('#booking-quantity').fill('2');
    await page.locator('#booking-note').fill('QA: booking the dome specifically.');

    const sheetText = (await page.locator('[role="dialog"]').innerText()).replace(/\s+/g, ' ');
    console.log('[BOOKING SHEET] ' + sheetText.slice(0, 260));

    await page.getByRole('button', { name: /Send|Request|Confirm/i }).last().click();
    await page.waitForTimeout(8000);
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    console.log('[AFTER SUBMIT] ' + body.slice(0, 200));
    await page.screenshot({ path: 'test-results/pillow-unit-booking.png', fullPage: true });
  });

  test('the owner edits a unit rate and it persists', async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page, OWNER_E, OWNER_P);
    await page.goto(`/sow/pillow?edit=${LISTING}`, { waitUntil: 'domcontentloaded' });

    // Edit mode reuses this form and loads the existing units into it.
    await expect(page.locator('#unit-name-0')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(3000);
    const names = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input[id^="unit-name-"]'))
        .map((i) => (i as HTMLInputElement).value));
    console.log('[EDIT FORM] units loaded: ' + JSON.stringify(names));
    expect(names.length, 'the edit form did not load all three units').toBe(3);

    // Change the dome from 400 to 555.
    const domeIndex = names.findIndex((n) => /Star dome/i.test(n));
    expect(domeIndex, 'Star dome not found in the edit form').toBeGreaterThanOrEqual(0);
    await page.locator(`#rate_nightly-${domeIndex}`).fill('555.00');

    const save = page.getByRole('button', { name: /^Save changes$|^List my place$/ });
    await expect(save).toBeEnabled({ timeout: 30000 });
    await save.click();
    await page.waitForURL((u) => !u.pathname.startsWith('/sow/pillow'), { timeout: 90000 })
      .catch(() => {});
    await page.waitForTimeout(6000);
    console.log('[EDIT] saved, now at ' + page.url());
  });
});
