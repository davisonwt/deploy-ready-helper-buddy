import { test, expect, type Page } from '@playwright/test';

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
  await page.waitForTimeout(9000);

  const shelf = page.locator('button[aria-label="My Books"], button[aria-label="Books"]');
  let opened = false;
  for (let attempt = 0; attempt < 5 && !opened; attempt++) {
    const c = await shelf.count();
    for (let i = 0; i < c; i++) {
      if (await shelf.nth(i).isVisible()) {
        await shelf.nth(i).click({ force: true });
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
  test.skip(!GOSAT_E || !GOSAT_P, 'the gosat account is required in .env.test');
  test.setTimeout(6 * 60_000);
  await page.setViewportSize({ width: 390, height: 844 });

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
