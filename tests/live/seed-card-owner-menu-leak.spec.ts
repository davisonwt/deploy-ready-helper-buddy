import { test, expect, type Page } from '@playwright/test';
import { panHotspotIntoView, waitForInteriorReady } from './support/interior';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  asUser, createStallFixture, createShelfSeedFixture, setStallHotspots, deleteStallFixture,
  sweepProducts, sweepStorage, reportSweep,
} from './support/fixtures';

/**
 * A plain member must never see Edit or Delete on someone else's seed.
 *
 * Reported 2026-09-18: an owner menu appearing on a stall the viewer did not
 * own. Delete on another member's seeds would be a serious hole, so this is
 * the assertion that matters most in the whole share/menu area.
 *
 * davisontest1 carries NO roles (verified against public.user_roles), which is
 * the point -- testing this as a gosat would prove nothing about a member.
 * davison.taljaard is gosat + admin + radio_admin, so the pair also answers
 * the second question: does a ROLE open the menu on a stall you do not own?
 *
 * Run: npx playwright test --config=playwright.live.config.ts seed-card-owner-menu-leak
 */

/** Plain member, no roles. */
const MEMBER_E = process.env.TEST_A_EMAIL || '';
const MEMBER_P = process.env.TEST_A_PASSWORD || '';
/** gosat + admin, and the owner of the stall below. */
const GOSAT_E = process.env.TEST_GOSAT_EMAIL || '';
const GOSAT_P = process.env.TEST_GOSAT_PASSWORD || '';

/** Owned by davison.taljaard -- someone else's stall, for both viewers below. */
const OTHERS_STALL = '/stall/davison.taljaard';

// The gosat leg needs a stall the gosat account does NOT own, with a book on
// its shelf. It used to borrow a standing davisontest1 stall that was torn
// down on 2026-09-21; now it builds its own and removes it in afterAll.
const STAMP = Date.now();
const QA_STALL = `QA menu-leak ${STAMP} stall`;
const QA_BOOK = `QA menu-leak ${STAMP} book`;
let fixture: { client: SupabaseClient; userId: string; stallId: string | null; objectPaths: string[] } | null = null;

test.afterAll(async () => {
  if (!fixture) return;
  if (fixture.stallId) await deleteStallFixture(fixture.client, fixture.stallId);
  if (fixture.objectPaths.length) await sweepStorage(fixture.client, 'stalls', fixture.objectPaths);
  reportSweep('seed-card-owner-menu-leak', await sweepProducts(fixture.client, fixture.userId, [QA_BOOK]));
  const { data: left } = await fixture.client.from('stalls').select('id').eq('user_id', fixture.userId).eq('name', QA_STALL);
  console.log(`[RESIDUE] ${QA_STALL}: ${left?.length ?? 0} left (expected 0)`);
  expect(left ?? []).toHaveLength(0);
});

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

/** Open a shelf that holds seeds, then the first card's "..." menu. */
async function openFirstCardMenu(page: Page, stall: string): Promise<string> {
  await page.goto(stall, { waitUntil: 'domcontentloaded' });
  // The pan strip's hotspots are laid out only once its image has loaded.
  if ((page.viewportSize()?.width ?? 1440) < 1024) await waitForInteriorReady(page);
  else await page.waitForTimeout(9000);

  // On a phone the interior is a horizontal pan strip and the Books box can
  // sit off-screen -- "visible" to isVisible() but not clickable. Pan it in
  // first (same fix as share-controls-audit, 2026-09-25).
  let opened = false;
  for (let attempt = 0; attempt < 5 && !opened; attempt++) {
    for (const label of ['My Books', 'Books']) {
      const pan = await panHotspotIntoView(page, label, 0);
      if (pan.found && pan.inWindow) {
        await page.waitForTimeout(500);
        await page.locator(`button[aria-label="${label}"]`).filter({ visible: true }).first().click();
        await page.waitForTimeout(5000);
        opened = true;
        break;
      }
    }
    if (!opened) await page.waitForTimeout(1500);
  }
  expect(opened, 'no books shelf opened on that stall').toBe(true);

  const more = page.locator('button[aria-label="More"]');
  const n = await more.count();
  console.log(`[MENU] "..." controls on the shelf: ${n}`);
  for (let i = 0; i < Math.min(n, 6); i++) {
    const b = more.nth(i);
    if (!(await b.isVisible().catch(() => false))) continue;
    await b.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2000);
    if (await page.locator('[data-radix-popper-content-wrapper]').count()) break;
  }
  const texts = await page.locator('[data-radix-popper-content-wrapper]').allInnerTexts();
  return texts.join(' | ');
}

test('a plain member sees only Share and Report on someone else\'s seed', async ({ page }) => {
  test.skip(!MEMBER_E || !MEMBER_P, 'a no-roles member account is required in .env.test');
  test.setTimeout(6 * 60_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await login(page, MEMBER_E, MEMBER_P);
  const menu = await openFirstCardMenu(page, OTHERS_STALL);
  console.log(`[MEMBER] menu on someone else's seed: ${JSON.stringify(menu)}`);
  await page.screenshot({ path: 'test-results/menu-plain-member.png' });

  expect(menu, 'the menu did not open at all').not.toBe('');
  expect(menu, 'EDIT LEAKED to a plain member on another member\'s seed').not.toMatch(/\bEdit\b/);
  expect(menu, 'DELETE LEAKED to a plain member on another member\'s seed').not.toMatch(/\bDelete\b/);
  expect(menu, 'a visitor lost Share').toMatch(/Share/);
  expect(menu, 'a visitor lost Report').toMatch(/Report/);
});

test('a gosat/admin on someone else\'s stall: report what they actually get', async ({ page }) => {
  test.setTimeout(6 * 60_000);
  await page.setViewportSize({ width: 390, height: 844 });

  const member = await asUser(MEMBER_E, MEMBER_P, 'TEST_A (davisontest1)');
  fixture = { ...member, stallId: null, objectPaths: [] };
  const created = await createStallFixture(member.client, member.userId, QA_STALL);
  fixture.stallId = created.stallId; fixture.objectPaths = created.objectPaths;
  const bookId = await createShelfSeedFixture(member.client, member.userId, QA_BOOK);
  await setStallHotspots(member.client, created.stallId, [
    { id: 'qa-books', kind: 'books', label: 'Books', x: 30, y: 40, w: 40, h: 40, seed_ids: [bookId] },
  ]);

  // This account OWNS the stall above, so it is tested against a different one
  // -- otherwise "owner menu on your own stall" would masquerade as a leak.
  await login(page, GOSAT_E, GOSAT_P);
  const menu = await openFirstCardMenu(page, '/stall/davisontest1');
  console.log(`[GOSAT] menu on a stall they do NOT own: ${JSON.stringify(menu)}`);
  await page.screenshot({ path: 'test-results/menu-gosat.png' });

  // Reported, then asserted: a role must not confer Delete over another
  // member's seeds. If this fails, it is the hole, not a quirk.
  expect(menu, 'DELETE is available to a gosat on another member\'s seed').not.toMatch(/\bDelete\b/);
});
