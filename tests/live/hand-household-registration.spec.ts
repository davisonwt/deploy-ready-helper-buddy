import { test, expect, type Page } from '@playwright/test';
import { asUser, sweepProducts, reportSweep } from './support/fixtures';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * A real household registration, through the form, on a phone.
 *
 * This is the case the household-reference trigger broke on 2026-09-17 and
 * the one the API tests cannot cover: they exercise the order by hand, this
 * exercises the order the submit handler actually uses.
 *
 * Run: npx playwright test --config=playwright.live.config.ts hand-household-registration
 */

const E = process.env.TEST_GOSAT_EMAIL || '', P = process.env.TEST_GOSAT_PASSWORD || '';
const PHOTO = path.resolve(__dirname, '../../src/assets/tier-grove.jpg');
const STAMP = process.env.QA_STAMP ?? String(Date.now()).slice(-6);
const TITLE = `QAHOUSE ${STAMP}`;

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

/** No describe block here, so this is a file-level teardown hook. */
test.afterAll(async () => {
  if (!E || !P) return;
  const { client, userId } = await asUser(E, P, 'hand-household-registration');
  reportSweep('hand-household-registration', await sweepProducts(client, userId, [TITLE]));
});

test('a household service registers end to end at 390x844', async ({ page }) => {
  test.skip(!E || !P, 'The owner account is required.');
  test.setTimeout(300_000);

  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().replace(/\s+/g, ' ').slice(0, 200));
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto('/sow/hand', { waitUntil: 'domcontentloaded' });

  // A household category, which is what requires a reference.
  await page.getByRole('button', { name: /^Domestic work/ }).first().click();

  await page.locator('input[type="file"]').nth(0).setInputFiles(PHOTO);
  await expect(page.locator('#hand-title')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(2500);

  await page.locator('#hand-years').fill('6');
  await page.fill('#hand-title', TITLE);
  await page.fill('#hand-desc', 'QA: household registration must complete.');
  await page.fill('#hand-currency', 'ZAR');
  await page.locator('#rate_hourly').fill('120.00');
  await page.locator('input[placeholder="Town or area"]').fill('Mossel Bay, South Africa');

  // The referee. Required for a household category, and the whole point.
  // The three inputs are addressed by placeholder and aria-label, which is
  // what the markup actually carries; there are no ids on them.
  await expect(page.getByRole('heading', { name: /6\. References/i }))
    .toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1000);

  // The section starts with no referee rows at all; one must be added first.
  await page.getByRole('button', { name: 'Add a reference' }).first().click();
  await expect(page.getByPlaceholder('Their name').first()).toBeVisible({ timeout: 15000 });

  await page.getByPlaceholder('Their name').first().fill('Jane Referee');
  await page.getByPlaceholder('How they know your work').first().fill('Former employer');
  await page.getByPlaceholder('Phone or email').first().fill('0123456789');
  console.log('[FORM] referee filled: Jane Referee / Former employer / 0123456789');

  await page.locator('#hand-legal').click();

  const submit = page.getByRole('button', { name: /^Offer my hand$|^List my service$|^Plant/ });
  await expect(submit, 'the submit button never enabled').toBeEnabled({ timeout: 30000 });
  await submit.click();

  // The failure mode being guarded: the trigger refuses the detail row and
  // the member is left on the form with an error toast.
  const landed = await page.waitForURL(/\/seed\/hand\/[0-9a-f-]+$/, { timeout: 90000 })
    .then(() => true).catch(() => false);
  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  console.log('[FORM] landed on seed page: ' + landed + ' url=' + page.url());
  console.log('[FORM] console errors: ' + JSON.stringify(errors.slice(0, 4)));

  expect(body, 'the reference rule rejected a legitimate household listing')
    .not.toMatch(/must list at least one reference/i);
  expect(landed, 'the registration did not complete').toBe(true);

  const id = page.url().split('/').pop()!;
  console.log('[FORM] created hand listing ' + id);
  await expect(page.getByText(TITLE).first()).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'test-results/household-registration-390.png', fullPage: true });

  // Hand the id back for cleanup.
  console.log('[CLEANUP-ID] ' + id);
});
