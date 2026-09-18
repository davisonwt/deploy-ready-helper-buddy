import { test, expect, type Page } from '@playwright/test';

/**
 * The "+" on a shelf sheet is the OWNER's way to add another seed without
 * leaving the stall. A visitor must never see it.
 *
 * The second half is the half that matters: an owner control a visitor can see
 * would be worse than the missing control it replaced.
 *
 * Run: npx playwright test --config=playwright.live.config.ts shelf-add-button
 */

const OWNER_E = process.env.TEST_USER_EMAIL ?? process.env.TEST_A_EMAIL ?? '';
const OWNER_P = process.env.TEST_USER_PASSWORD ?? process.env.TEST_A_PASSWORD ?? '';
const VISITOR_E = process.env.TEST_USER2_EMAIL ?? process.env.TEST_GOSAT_EMAIL ?? '';
const VISITOR_P = process.env.TEST_USER2_PASSWORD ?? process.env.TEST_GOSAT_PASSWORD ?? '';
/** The stall OWNER_E owns. */
const STALL = process.env.PROBE_STALL ?? 'davisontest1';

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {});
}

async function openBooksShelf(page: Page) {
  await page.goto(`/stall/${STALL}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  const books = page.locator('button[aria-label="Books"]');
  for (let attempt = 0; attempt < 6; attempt++) {
    const c = await books.count();
    for (let i = 0; i < c; i++) {
      if (await books.nth(i).isVisible()) {
        await books.nth(i).click({ force: true });
        await page.waitForTimeout(4000);
        return;
      }
    }
    await page.waitForTimeout(1500);
  }
  throw new Error('Books hotspot never became visible');
}

test.describe.serial('Shelf add button', () => {
  test.skip(!OWNER_E || !OWNER_P, 'the stall owner account is required in .env.test');
  test.setTimeout(6 * 60_000);

  test('1. the owner sees "+" on their own shelf', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, OWNER_E, OWNER_P);
    await openBooksShelf(page);

    const add = page.getByRole('button', { name: /^Add to /i });
    const count = await add.count();
    console.log(`[OWNER] add controls: ${count}`);
    // The header "+" is present whether or not the shelf already has seeds;
    // EmptyState's own link may add a second on a bare shelf, which is fine.
    expect(count, 'the owner has no way to add to their own shelf').toBeGreaterThan(0);
    await page.screenshot({ path: 'test-results/shelf-add-owner.png' });
  });

  test('2. a VISITOR never sees it', async ({ page }) => {
    test.skip(!VISITOR_E || !VISITOR_P, 'a second, non-owning account is required');
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, VISITOR_E, VISITOR_P);
    await openBooksShelf(page);

    const add = page.getByRole('button', { name: /^Add to /i });
    const count = await add.count();
    console.log(`[VISITOR] add controls: ${count}`);
    expect(count, 'a visitor was offered an owner-only Add control').toBe(0);

    // The shelf itself must still be there -- absence of the "+" must not mean
    // absence of the sheet.
    const closeShelf = page.getByRole('button', { name: 'Close shelf' });
    await expect(closeShelf, 'the shelf did not open for the visitor at all').toHaveCount(1);
    await page.screenshot({ path: 'test-results/shelf-add-visitor.png' });
  });
});
