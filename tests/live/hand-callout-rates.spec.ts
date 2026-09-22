import { test, expect, type Page } from '@playwright/test';
import { asUser, sweepProducts, reportSweep } from './support/fixtures';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run: npx playwright test --config=playwright.live.config.ts hand-callout-rates
 */

const E = process.env.TEST_GOSAT_EMAIL || '', P = process.env.TEST_GOSAT_PASSWORD || '';
const PHOTO = path.resolve(__dirname, '../../src/assets/tier-grove.jpg');
const STAMP = process.env.QA_STAMP ?? String(Date.now()).slice(-6);

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

const VIEWPORTS = [
  { w: 390, h: 844, n: 'mobile-390', callout: '350.00', perKm: '7.50', hourly: '400.00' },
  { w: 1280, h: 720, n: 'desktop-1280', callout: '275.00', perKm: '9.25', hourly: '500.00' },
];

test.describe.serial('Call-out charging for Sleeping Hands', () => {
  /**
   * Teardown in a hook, never a final test: this block is serial, so a
   * failure marks every later test "did not run" and a cleanup test
   * would be skipped on exactly the runs that leak.
   */
  test.afterAll(async () => {
    if (!E || !P) return;
    const { client, userId } = await asUser(E, P, 'hand-callout-rates');
    reportSweep('hand-callout-rates', await sweepProducts(client, userId, VIEWPORTS.map((vp) => `QACALLOUT ${vp.n} ${STAMP}`)));
  });

  test.skip(!E || !P, 'The owner account is required.');

  for (const vp of VIEWPORTS) {
    test(`${vp.n}: both fields save, persist through an edit, and display`, async ({ page }) => {
      test.setTimeout(300_000);
      const title = `QACALLOUT ${vp.n} ${STAMP}`;
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await login(page);
      await page.goto('/sow/hand', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /^Electrician/ }).first().click();

      await page.locator('input[type="file"]').nth(0).setInputFiles(PHOTO);
      await expect(page.locator('#hand-title')).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(2500);

      await page.fill('#hand-qualification', 'Registered electrician');
      await page.locator('#hand-years').fill('9');
      await page.fill('#hand-title', title);
      await page.fill('#hand-desc', 'QA: call-out and per km.');

      // 1. Both fields must be on the price step.
      await expect(page.getByRole('heading', { name: /5\. What do you charge\?/i }))
        .toBeVisible({ timeout: 20000 });
      const callout = page.locator('#rate_callout');
      const perKm = page.locator('#rate_per_km');
      await expect(callout, 'no Call-out fee field').toBeVisible({ timeout: 15000 });
      await expect(perKm, 'no Per km travelled field').toBeVisible();
      await expect(page.getByText('Call-out fee').first()).toBeVisible();
      await expect(page.getByText('Per km travelled').first()).toBeVisible();

      await page.fill('#hand-currency', 'ZAR');
      await page.locator('#rate_hourly').fill(vp.hourly);
      await callout.fill(vp.callout);
      await perKm.fill(vp.perKm);
      await page.locator('input[placeholder="Town or area"]').fill('Mossel Bay, South Africa');
      await page.locator('#hand-legal').click();

      const submit = page.getByRole('button', { name: /^Offer my hand$|^List my service$|^Plant/ });
      await expect(submit).toBeEnabled({ timeout: 30000 });
      await submit.click();
      await page.waitForURL(/\/seed\/hand\/[0-9a-f-]+$/, { timeout: 90000 });
      const id = page.url().split('/').pop()!;
      console.log(`[${vp.n}] created ${id}`);

      // 2. The detail page shows both, labelled, in the listing's currency.
      const travel = page.locator('div').filter({ hasText: /^Travel, on top of the rate/ }).last();
      await expect(travel).toBeVisible({ timeout: 30000 });
      const travelText = (await travel.innerText()).replace(/\s+/g, ' ').trim();
      console.log(`[${vp.n}] DETAIL PAGE TRAVEL BLOCK: ${travelText}`);
      expect(travelText).toMatch(/Call-out fee/);
      expect(travelText).toMatch(/Per km travelled/);
      // ZAR, not converted and not a viewer-locale currency.
      expect(travelText, 'the call-out fee is not in the listing currency')
        .toMatch(new RegExp(`R\\s*${vp.callout.replace('.', '[.,]')}`));
      expect(travelText, 'the per km rate is not in the listing currency')
        .toMatch(new RegExp(`R\\s*${vp.perKm.replace('.', '[.,]')}`));
      await page.screenshot({ path: `test-results/callout-detail-${vp.n}.png`, fullPage: true });

      // 3. Both survive a round trip through the edit form.
      await page.goto(`/sow/hand?edit=${id}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#rate_callout')).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(2500);
      const loadedCallout = await page.locator('#rate_callout').inputValue();
      const loadedPerKm = await page.locator('#rate_per_km').inputValue();
      console.log(`[${vp.n}] EDIT FORM LOADED callout=${loadedCallout} perKm=${loadedPerKm}`);
      expect(Number(loadedCallout), 'the call-out fee did not load into the edit form')
        .toBeCloseTo(Number(vp.callout), 2);
      expect(Number(loadedPerKm), 'the per km rate did not load into the edit form')
        .toBeCloseTo(Number(vp.perKm), 2);

      // Change one and save, to prove the edit path writes them too.
      await page.locator('#rate_per_km').fill('12.00');
      const save = page.getByRole('button', { name: /^Save|^Offer my hand$|^List my service$|^Plant/ });
      await expect(save.first()).toBeEnabled({ timeout: 30000 });
      await save.first().click();
      await page.waitForURL(/\/(seed\/hand\/[0-9a-f-]+|my-listings)$/, { timeout: 90000 });

      await page.goto(`/seed/hand/${id}`, { waitUntil: 'domcontentloaded' });
      const after = page.locator('div').filter({ hasText: /^Travel, on top of the rate/ }).last();
      await expect(after).toBeVisible({ timeout: 30000 });
      const afterText = (await after.innerText()).replace(/\s+/g, ' ').trim();
      console.log(`[${vp.n}] AFTER EDIT: ${afterText}`);
      expect(afterText, 'the edited per km rate did not persist').toMatch(/R\s*12[.,]00/);
      expect(afterText, 'the call-out fee was lost by the edit')
        .toMatch(new RegExp(`R\\s*${vp.callout.replace('.', '[.,]')}`));

      // Hand the id to the cleanup step.
      test.info().annotations.push({ type: 'created', description: id });
    });
  }
});
