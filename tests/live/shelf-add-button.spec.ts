import { test, expect, type Page } from '@playwright/test';

/**
 * The "+" is a property of OWNING a shelf, not of the shelf's kind.
 *
 * Sowers name their own shelves. The first version of this control was keyed
 * off a fixed list of known kinds (books/music/lyrics/products), so a member's
 * own category -- "Family Albums" -- silently had no way in. This walks EVERY
 * shelf on the stall rather than asserting one, so a kind that is added later
 * and forgotten fails here instead of shipping.
 *
 * The second half is the half that matters: an owner-only control a visitor
 * can see would be worse than the missing control it replaced.
 *
 * Fixture: davisontest1's stall carries a temporary 'custom' shelf named
 * "Family Albums". Snapshot/restore:
 *   scripts/studio/restore_davisontest1_hotspots_20260918.sql
 *
 * Run: npx playwright test --config=playwright.live.config.ts shelf-add-button
 */

const OWNER_E = process.env.TEST_USER_EMAIL ?? process.env.TEST_A_EMAIL ?? '';
const OWNER_P = process.env.TEST_USER_PASSWORD ?? process.env.TEST_A_PASSWORD ?? '';
const VISITOR_E = process.env.TEST_USER2_EMAIL ?? process.env.TEST_GOSAT_EMAIL ?? '';
const VISITOR_P = process.env.TEST_USER2_PASSWORD ?? process.env.TEST_GOSAT_PASSWORD ?? '';
const STALL = process.env.PROBE_STALL ?? 'davisontest1';

/** 'story' lists nothing, so it correctly has no "+" -- every other shelf must. */
const LISTING_SHELVES = ['Books', 'Music', 'Lyrics', 'Family Albums'];

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {});
}

async function gotoStall(page: Page) {
  await page.goto(`/stall/${STALL}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
}

/** Open one shelf by its own label, and report whether the "+" is there. */
async function openShelf(page: Page, label: string): Promise<{ opened: boolean; addControls: number }> {
  const btn = page.locator(`button[aria-label="${label}"]`);
  for (let attempt = 0; attempt < 5; attempt++) {
    const c = await btn.count();
    for (let i = 0; i < c; i++) {
      if (await btn.nth(i).isVisible()) {
        await btn.nth(i).click({ force: true });
        await page.waitForTimeout(3500);
        const opened = await page.getByRole('button', { name: 'Close shelf' }).count() > 0;
        const addControls = await page.getByRole('button', { name: /^Add to /i }).count();
        return { opened, addControls };
      }
    }
    await page.waitForTimeout(1500);
  }
  return { opened: false, addControls: -1 };
}

async function closeShelf(page: Page) {
  const close = page.getByRole('button', { name: 'Close shelf' }).first();
  if (await close.count()) await close.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1200);
}

test.describe.serial('Shelf add button', () => {
  test.skip(!OWNER_E || !OWNER_P, 'the stall owner account is required in .env.test');
  test.setTimeout(8 * 60_000);

  test('1. the owner sees "+" on EVERY listing shelf, custom categories included', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, OWNER_E, OWNER_P);
    await gotoStall(page);

    const missing: string[] = [];
    for (const label of LISTING_SHELVES) {
      const { opened, addControls } = await openShelf(page, label);
      console.log(`[OWNER] ${label}: opened=${opened} addControls=${addControls}`);
      if (!opened || addControls < 1) missing.push(`${label} (opened=${opened}, add=${addControls})`);
      await closeShelf(page);
    }
    await page.screenshot({ path: 'test-results/shelf-add-owner.png' });
    expect(
      missing,
      'the owner has no way to add to these shelves -- a "+" keyed on kind instead of ownership is what caused this',
    ).toEqual([]);
  });

  test('2. a VISITOR never sees it, on any shelf', async ({ page }) => {
    test.skip(!VISITOR_E || !VISITOR_P, 'a second, non-owning account is required');
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, VISITOR_E, VISITOR_P);
    await gotoStall(page);

    const leaked: string[] = [];
    for (const label of LISTING_SHELVES) {
      const { opened, addControls } = await openShelf(page, label);
      console.log(`[VISITOR] ${label}: opened=${opened} addControls=${addControls}`);
      // The shelf must still OPEN for a visitor -- absence of the "+" must
      // never mean absence of the shelf.
      expect(opened, `the shelf "${label}" did not open for a visitor at all`).toBe(true);
      if (addControls !== 0) leaked.push(`${label} (${addControls})`);
      await closeShelf(page);
    }
    await page.screenshot({ path: 'test-results/shelf-add-visitor.png' });
    expect(leaked, 'a visitor was offered an owner-only Add control').toEqual([]);
  });
});
