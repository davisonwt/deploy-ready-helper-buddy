import { test, expect, type Page } from '@playwright/test';

/**
 * A sower can manage their own seed from their own stall -- and a visitor
 * cannot see that they could.
 *
 * Davison went looking for Delete on his own stall's Music shelf on
 * 2026-09-18 and it was not there. That shelf renders SeedCard, whose "..."
 * menu was Share/Gift/Report for everyone including the owner; the owner menu
 * it replaced (LivingSeedCard) only came back on MyProductsPage.
 *
 * The second half of this spec is the one that matters most: an owner menu a
 * visitor can see would be worse than the missing menu it replaced.
 *
 * Test 2 deletes what it is pointed at, so it needs a disposable music seed --
 * never one of Davison's real ones. Publish one titled "QAOWNER-delete ...":
 *   QA_DELETE_TITLE="QAOWNER-delete 123" npx playwright test \
 *     --config=playwright.live.config.ts stall-owner-menu
 */

const OWNER_E = process.env.TEST_GOSAT_EMAIL || '';
const OWNER_P = process.env.TEST_GOSAT_PASSWORD || '';
const VISITOR_E = process.env.TEST_A_EMAIL || '';
const VISITOR_P = process.env.TEST_A_PASSWORD || '';
const DELETE_TITLE = process.env.QA_DELETE_TITLE || '';
const STALL = '/stall/davison.taljaard';

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

/** Open the stall's Music shelf. */
async function openMusicShelf(page: Page) {
  await page.goto(STALL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);
  const music = page.getByRole('button', { name: /^Music$/i }).first();
  await expect(music, 'no Music hotspot on the stall').toHaveCount(1, { timeout: 20000 });
  await music.click();
  await page.waitForTimeout(7000);
}

/** Open the first card's "..." and return the menu's text. */
async function openCardMenu(page: Page): Promise<string[]> {
  const more = page.locator('button[aria-label="More"]');
  const n = await more.count();
  for (let i = 0; i < Math.min(n, 6); i++) {
    const b = more.nth(i);
    if (!(await b.isVisible().catch(() => false))) continue;
    await b.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1800);
    if (await page.locator('[data-radix-popper-content-wrapper]').count()) break;
  }
  return page.locator('[data-radix-popper-content-wrapper]').allInnerTexts();
}

/** A missing fixture FAILS -- see CLAUDE.md's "a live spec never skips silently". */
function requireFixture(value: string, envName: string) {
  if (value) return;
  throw new Error(
    `${envName} is not set, so this spec cannot run. It DELETES the seed it is `
    + 'pointed at, so it needs a disposable music seed on the owner stall -- never '
    + 'one of Davison\'s real ones. Publish one titled "QAOWNER-delete <something>", '
    + `then re-run with ${envName}="<that exact title>". A FAILURE, not a skip.`,
  );
}

test.describe.serial('Stall owner menu', () => {
  test.skip(!OWNER_E || !OWNER_P, 'The owner account is required in .env.test.');

  test('1. the owner sees Edit and Delete on their own music card', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, OWNER_E, OWNER_P);
    await openMusicShelf(page);

    const menu = (await openCardMenu(page)).join(' ');
    console.log(`[EVIDENCE] owner menu: ${JSON.stringify(menu)}`);
    expect(menu, 'owner cannot Edit from their own stall').toMatch(/Edit/);
    expect(menu, 'owner cannot Delete from their own stall').toMatch(/Delete/);
    // Reporting your own seed is meaningless.
    expect(menu, 'Report is offered to the owner on their own seed').not.toMatch(/Report/);
    await page.screenshot({ path: 'test-results/owner-menu-owner.png' });
  });

  test('2. Delete actually removes the seed from the shelf', async ({ page }) => {
    requireFixture(DELETE_TITLE, 'QA_DELETE_TITLE');
    await page.setViewportSize({ width: 390, height: 844 });
    page.on('dialog', (d) => d.accept());
    await login(page, OWNER_E, OWNER_P);
    await openMusicShelf(page);

    const card = page.locator('div[data-seed-id]').filter({ hasText: DELETE_TITLE }).first();
    await expect(card, 'the disposable seed is not on the shelf').toBeVisible({ timeout: 20000 });

    await card.locator('button[aria-label="More"]').click({ force: true });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /^Delete$/ }).first().click();
    await page.waitForTimeout(6000);

    await expect(card, 'the card is still on the shelf after Delete').toHaveCount(0, { timeout: 20000 });
    console.log('[EVIDENCE] deleted seed is gone from the shelf');
    await page.screenshot({ path: 'test-results/owner-menu-after-delete.png' });
  });

  test('3. a VISITOR on the same stall sees only Share and Report', async ({ page }) => {
    test.skip(!VISITOR_E || !VISITOR_P, 'needs a second account');
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, VISITOR_E, VISITOR_P);
    await openMusicShelf(page);

    const menu = (await openCardMenu(page)).join(' ');
    console.log(`[EVIDENCE] visitor menu: ${JSON.stringify(menu)}`);
    expect(menu, 'a visitor was offered Edit on someone else’s seed').not.toMatch(/Edit/);
    expect(menu, 'a visitor was offered Delete on someone else’s seed').not.toMatch(/Delete/);
    expect(menu, 'the visitor menu lost Share').toMatch(/Share/);
    expect(menu, 'the visitor menu lost Report').toMatch(/Report/);
    await page.screenshot({ path: 'test-results/owner-menu-visitor.png' });
  });
});
