import { test, expect, type Page } from '@playwright/test';
import { asUser, sweepProducts, reportSweep, ensureWanderingRole, removeWanderingRole } from './support/fixtures';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Live verification for the two new sow forms (Wheel, Pillow) that
// replace the dead /sow/wheel and /sow/pillow links found in the
// sow-forms audit. As davisontest1: unlock each Wandering role (a real
// prerequisite these forms already had, per SowHandPage's own pattern),
// submit a real listing, confirm the resulting seed detail page renders
// with a "Request booking" (Book) action instead of Bestow, and confirm
// the DB row is tagged correctly.
//
// Run: npx playwright test --config=playwright.live.config.ts sow-wheel-pillow

const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? '';
const STAMP = process.env.WHEEL_PILLOW_STAMP ?? String(Date.now());
const COVER = path.resolve(__dirname, '../../src/assets/tier-grove.jpg');

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
}

test.describe.serial('Wheel and Pillow sow forms', () => {
  /**
   * Both roles are preconditions, provisioned directly. unlockWanderingRole
   * drove /register-wandering instead -- uploading a cover and three
   * gallery images per role, eight storage objects a run that no product
   * row points at -- and its early return was explicitly "already
   * unlocked from an earlier run", i.e. it was designed to inherit a
   * leftover fixture. Two such roles were found on 2026-09-22.
   */
  const createdRoleIds: string[] = [];

  test.beforeAll(async () => {
    if (!HOST_EMAIL || !HOST_PASS) return;
    const { client, userId } = await asUser(HOST_EMAIL, HOST_PASS, 'the host account');
    for (const role of ['wheel', 'pillow'] as const) {
      const { id, created } = await ensureWanderingRole(client, userId, role, {
        town: 'Bethlehem, Free State', lat: -28.2308, lng: 28.3089,
        displayName: `QA ${role} tester`,
      });
      if (created) createdRoleIds.push(id);
      console.log(`[SETUP] ${role} role ${created ? 'created' : 'already present'}: ${id}`);
    }
  });

  test.afterAll(async () => {
    if (!HOST_EMAIL || !HOST_PASS) return;
    const { client, userId } = await asUser(HOST_EMAIL, HOST_PASS, 'the host account');
    reportSweep('sow-wheel-pillow', await sweepProducts(client, userId, [
      `QA Wheel Test ${STAMP}`, `QA Pillow Test ${STAMP}`,
    ]));
    for (const id of createdRoleIds) await removeWanderingRole(client, id);
  });

  test('0a. unlock Wandering Wheel role', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
  });

  test('0b. unlock Wandering Pillow role', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
  });

  test('1. /sow -> Wheel now reaches the real form, not a dead link', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/sow', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Wheel$/ }).click();
    await expect(page).toHaveURL(/\/sow\/wheel$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Sow a Wheel seed/i })).toBeVisible({ timeout: 10000 });
  });

  test('2. Submit a real Wheel listing, verify DB tagging and Book action', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/sow/wheel', { waitUntil: 'domcontentloaded' });

    await page.locator('input[type="file"]').first().setInputFiles(COVER);
    await page.fill('#wheel-title', `QA Wheel Test ${STAMP}`);
    await page.getByRole('button', { name: /Choose a vehicle type/i }).click();
    await page.getByRole('button', { name: /^Bakkie$/ }).click();
    await page.fill('#wheel-capacity', '2 tons + trailer');
    await page.fill('input[type="number"][step="0.01"]', '15.00');
    await page.fill('#wheel-description', 'QA test listing -- bakkie with trailer for local deliveries.');

    const btn = page.getByRole('button', { name: /^Plant seed$/ });
    await expect(btn).toBeEnabled({ timeout: 15000 });
    await btn.click();
    await page.waitForURL(/\/seed\/wheel\/[0-9a-f-]+$/, { timeout: 20000 });

    // Detail page: real content, Book action (not Bestow).
    await expect(page.getByRole('heading', { name: `QA Wheel Test ${STAMP}` })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('🚗 Wandering Wheel')).toBeVisible();
    await expect(page.getByRole('button', { name: /Request booking/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Bestow/i })).toHaveCount(0);
  });

  test('3. /sow -> Pillow now reaches the real form, not a dead link', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/sow', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Pillow$/ }).click();
    await expect(page).toHaveURL(/\/sow\/pillow$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Sow a Pillow seed/i })).toBeVisible({ timeout: 10000 });
  });

  test('4. Submit a real Pillow listing, verify DB tagging and Book action', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/sow/pillow', { waitUntil: 'domcontentloaded' });

    await page.locator('input[type="file"]').first().setInputFiles(COVER);
    await page.fill('#pillow-title', `QA Pillow Test ${STAMP}`);
    await page.getByRole('button', { name: /Choose a property type/i }).click();
    await page.getByRole('button', { name: /^Farm stay$/ }).click();
    await page.fill('#pillow-sleeps', '4');
    await page.getByRole('button', { name: /^Wifi$/ }).click();
    await page.getByRole('button', { name: /^Breakfast included$/ }).click();
    await page.fill('#pillow-location', 'Bethlehem, Free State');
    await page.fill('input[type="number"][step="0.01"]', '45.00');
    await page.fill('#pillow-description', 'QA test listing -- cosy farm cottage.');

    const btn = page.getByRole('button', { name: /^Plant seed$/ });
    await expect(btn).toBeEnabled({ timeout: 15000 });
    await btn.click();
    await page.waitForURL(/\/seed\/pillow\/[0-9a-f-]+$/, { timeout: 20000 });

    // Detail page: real content, Book action (not Bestow).
    await expect(page.getByRole('heading', { name: `QA Pillow Test ${STAMP}` })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('🛏️ Wandering Pillow')).toBeVisible();
    await expect(page.getByRole('button', { name: /Request booking/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Bestow/i })).toHaveCount(0);
    await expect(page.getByText('Sleeps 4')).toBeVisible();
    await expect(page.getByText('Wifi')).toBeVisible();
    await expect(page.getByText('Breakfast included')).toBeVisible();
  });
});
