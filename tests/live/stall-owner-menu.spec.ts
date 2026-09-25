import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  asUser, createStallFixture, createShelfSeedFixture, setStallHotspots, deleteStallFixture,
  sweepProducts, sweepStorage, reportSweep,
} from './support/fixtures';

/**
 * A sower can manage their own seed from their own stall -- and a visitor
 * cannot see that they could.
 *
 * Davison went looking for Delete on his own stall's Music shelf on
 * 2026-09-18 and it was not there. That shelf renders SeedCard, whose "..."
 * menu was Share/Gift/Report for everyone including the owner; the owner menu
 * it replaced (LivingSeedCard) only came back on MyProductsPage.
 *
 * The third test is the one that matters most: an owner menu a visitor can
 * see would be worse than the missing menu it replaced.
 *
 * Fixtures, created and deleted by this run (2026-09-25; it used to need a
 * hand-published seed on Davison's real stall, passed in as QA_DELETE_TITLE):
 * a stall on davisontest1 (TEST_A, the owner) with two books on one shelf --
 * "QAOWNER-keep" and "QAOWNER-delete". Test 2 deletes only the second, which
 * this run created. davisontest2 (TEST_B) is the visitor. afterAll removes
 * the stall, both books and the stall's files, and proves it. The owner menu
 * is SeedCard's and does not depend on the seed's kind, so books stand in
 * for the Music shelf the report was about.
 *
 * Run: npx playwright test --config=playwright.live.config.ts stall-owner-menu
 */

const STAMP = Date.now();
const QA_STALL = `QA owner-menu ${STAMP} stall`;
const KEEP_TITLE = `QAOWNER-keep ${STAMP}`;
const DELETE_TITLE = `QAOWNER-delete ${STAMP}`;
const SHELF = 'QA SHELF';
const STALL = '/stall/davisontest1';

let fixture: { client: SupabaseClient; userId: string; stallId: string | null; objectPaths: string[] } | null = null;

async function login(page: Page, email: string, pass: string) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', pass);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error(`login failed for ${email}`);
}

/** Open the fixture stall's shelf and wait for both books. */
async function openShelf(page: Page) {
  await page.goto(STALL, { waitUntil: 'domcontentloaded' });
  const shelf = page.locator(`button[aria-label="${SHELF}"]`).filter({ visible: true }).first();
  await expect(shelf, 'no QA shelf on the fixture stall').toBeVisible({ timeout: 45000 });
  await shelf.click();
  await expect(page.getByText(KEEP_TITLE).filter({ visible: true }).first()).toBeVisible({ timeout: 30000 });
}

/** Open one card's "..." and return the menu's text. */
async function openCardMenu(page: Page, title: string): Promise<string> {
  const card = page.locator('div[data-seed-id]').filter({ hasText: title }).filter({ visible: true }).first();
  await card.locator('button[aria-label="More"]').click({ force: true });
  const menu = page.locator('[data-radix-popper-content-wrapper]');
  await expect(menu.first()).toBeVisible({ timeout: 10000 });
  return (await menu.allInnerTexts()).join(' ');
}

test.describe.serial('Stall owner menu', () => {
  test.beforeAll(async () => {
    const owner = await asUser(process.env.TEST_A_EMAIL || '', process.env.TEST_A_PASSWORD || '', 'TEST_A (davisontest1, stall owner)');
    fixture = { ...owner, stallId: null, objectPaths: [] };
    const created = await createStallFixture(owner.client, owner.userId, QA_STALL);
    fixture.stallId = created.stallId; fixture.objectPaths = created.objectPaths;
    const keepId = await createShelfSeedFixture(owner.client, owner.userId, KEEP_TITLE);
    const deleteId = await createShelfSeedFixture(owner.client, owner.userId, DELETE_TITLE);
    await setStallHotspots(owner.client, created.stallId, [
      { id: 'qa-shelf', kind: 'books', label: SHELF, x: 40, y: 40, w: 20, h: 30, seed_ids: [keepId, deleteId] },
    ]);
  });

  test.afterAll(async () => {
    if (!fixture) return;
    if (fixture.stallId) await deleteStallFixture(fixture.client, fixture.stallId);
    if (fixture.objectPaths.length) await sweepStorage(fixture.client, 'stalls', fixture.objectPaths);
    reportSweep('stall-owner-menu', await sweepProducts(fixture.client, fixture.userId, [KEEP_TITLE, DELETE_TITLE]));
    const { data: stalls } = await fixture.client.from('stalls').select('id').eq('user_id', fixture.userId).eq('name', QA_STALL);
    const { data: seeds } = await fixture.client.from('products').select('id').in('title', [KEEP_TITLE, DELETE_TITLE]);
    console.log(`[RESIDUE] stall-owner-menu: ${stalls?.length ?? 0} stalls, ${seeds?.length ?? 0} seeds left (expected 0, 0)`);
    expect(stalls ?? []).toHaveLength(0);
    expect(seeds ?? []).toHaveLength(0);
  });

  test('1. the owner sees Edit and Delete on their own seed', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, process.env.TEST_A_EMAIL!, process.env.TEST_A_PASSWORD!);
    await openShelf(page);

    const menu = await openCardMenu(page, KEEP_TITLE);
    console.log(`[EVIDENCE] owner menu: ${JSON.stringify(menu)}`);
    expect(menu, 'owner cannot Edit from their own stall').toMatch(/Edit/);
    expect(menu, 'owner cannot Delete from their own stall').toMatch(/Delete/);
    // Reporting your own seed is meaningless.
    expect(menu, 'Report is offered to the owner on their own seed').not.toMatch(/Report/);
    await page.screenshot({ path: 'test-results/owner-menu-owner.png' });
  });

  test('2. Delete actually removes the seed from the shelf', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    page.on('dialog', (d) => d.accept());
    await login(page, process.env.TEST_A_EMAIL!, process.env.TEST_A_PASSWORD!);
    await openShelf(page);

    // Scoped to this run's own disposable card, and its title checked, before anything is clicked.
    const card = page.locator('div[data-seed-id]').filter({ hasText: DELETE_TITLE }).filter({ visible: true }).first();
    await expect(card, 'the disposable seed is not on the shelf').toBeVisible({ timeout: 20000 });
    await expect(card).toContainText('QAOWNER-delete');

    await card.locator('button[aria-label="More"]').click({ force: true });
    const menu = page.locator('[data-radix-popper-content-wrapper]');
    await menu.getByRole('button', { name: /^Delete$/ }).first().click();
    const confirm = page.getByRole('alertdialog');
    if (await confirm.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
      await confirm.getByRole('button', { name: /^Delete$/ }).click();
    }

    await expect(card, 'the card is still on the shelf after Delete').toHaveCount(0, { timeout: 20000 });
    await expect(page.getByText(KEEP_TITLE).filter({ visible: true }).first(), 'Delete removed only the one seed').toBeVisible();
    const { data } = await fixture!.client.from('products').select('id').eq('title', DELETE_TITLE);
    expect(data ?? [], 'the deleted seed is gone from the database').toHaveLength(0);
    console.log('[EVIDENCE] deleted seed is gone from the shelf and the database');
    await page.screenshot({ path: 'test-results/owner-menu-after-delete.png' });
  });

  test('3. a VISITOR on the same stall sees only Share and Report', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, process.env.TEST_B_EMAIL || '', process.env.TEST_B_PASSWORD || '');
    await openShelf(page);

    const menu = await openCardMenu(page, KEEP_TITLE);
    console.log(`[EVIDENCE] visitor menu: ${JSON.stringify(menu)}`);
    expect(menu, 'a visitor was offered Edit on someone else’s seed').not.toMatch(/Edit/);
    expect(menu, 'a visitor was offered Delete on someone else’s seed').not.toMatch(/Delete/);
    expect(menu, 'the visitor menu lost Share').toMatch(/Share/);
    expect(menu, 'the visitor menu lost Report').toMatch(/Report/);
    await page.screenshot({ path: 'test-results/owner-menu-visitor.png' });
  });
});
