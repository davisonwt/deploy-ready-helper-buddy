import { test, expect, type Page } from '@playwright/test';

/**
 * A shelf shows the name its SOWER gave it -- to the owner and to a visitor
 * alike -- and never the underlying kind.
 *
 * Custom shelf names are display-only: the seed always stores one of the real
 * kinds, so "Family Albums", "Foto's" and "Memories" are all findable together
 * as photos. This is the other half of that bargain -- the sower's own wording
 * is what everyone actually reads.
 *
 * Runs against Davison's REAL stall, which is where the renames live: his mugs
 * shelf is "Coffee Mugs", his books "My Books". Read-only; it opens shelves and
 * reads titles, it never edits.
 *
 * Run: npx playwright test --config=playwright.live.config.ts shelf-labels-are-the-sowers
 */

/** TEST_GOSAT is Davison's own account, so this is the owner view. */
const OWNER_E = process.env.TEST_GOSAT_EMAIL || '';
const OWNER_P = process.env.TEST_GOSAT_PASSWORD || '';
/** Any other signed-in member is a visitor on his stall. */
const VISITOR_E = process.env.TEST_A_EMAIL || '';
const VISITOR_P = process.env.TEST_A_PASSWORD || '';
const STALL = '/stall/davison.taljaard';

/** His own wording, as stored in stalls.hotspots. */
const SOWER_NAMED = ['Coffee Mugs', 'My Books', 'My Music'];
/** Enum values that must never reach a member's eyes. */
const RAW_KINDS = ['mugs', 'custom', 'orchard', 'companion_info'];

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

async function shelfNamesOnStall(page: Page): Promise<string[]> {
  await page.goto(STALL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button[aria-label]'))
      .map((b) => b.getAttribute('aria-label') ?? '')
      .filter(Boolean));
}

/** Open one shelf and read the title the sheet renders. */
async function shelfTitle(page: Page, label: string): Promise<string | null> {
  const btn = page.locator(`button[aria-label="${label}"]`);
  for (let attempt = 0; attempt < 5; attempt++) {
    const c = await btn.count();
    for (let i = 0; i < c; i++) {
      if (await btn.nth(i).isVisible()) {
        await btn.nth(i).click({ force: true });
        await page.waitForTimeout(3500);
        const title = await page.evaluate(() => {
          const h = document.querySelector('h2.font-serif');
          return h?.textContent?.trim() ?? null;
        });
        const close = page.getByRole('button', { name: 'Close shelf' }).first();
        if (await close.count()) await close.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1200);
        return title;
      }
    }
    await page.waitForTimeout(1500);
  }
  return null;
}

for (const who of ['owner', 'visitor'] as const) {
  test(`${who}: every shelf reads the name its sower gave it`, async ({ page }) => {
    const email = who === 'owner' ? OWNER_E : VISITOR_E;
    const pass = who === 'owner' ? OWNER_P : VISITOR_P;
    test.skip(!email || !pass, `${who} account required in .env.test`);
    test.setTimeout(6 * 60_000);

    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, email, pass);

    const names = await shelfNamesOnStall(page);
    console.log(`[${who.toUpperCase()}] shelf controls: ${JSON.stringify(names.filter((n) => SOWER_NAMED.includes(n)))}`);

    // 1. His own wording is on the stall itself.
    for (const expected of SOWER_NAMED) {
      expect(names, `"${expected}" is not on the stall for a ${who}`).toContain(expected);
    }

    // 2. And the sheet that opens is titled the same, not by kind.
    for (const expected of SOWER_NAMED) {
      const title = await shelfTitle(page, expected);
      console.log(`[${who.toUpperCase()}] "${expected}" -> sheet title ${JSON.stringify(title)}`);
      expect(title, `the sheet for "${expected}" is titled something else`).toBe(expected);
    }

    // 3. No shelf is NAMED by its raw kind.
    //
    // Scanning the page text for the word was the wrong check and failed on
    // its first run: "Coffee Mugs" contains "Mugs", which is his own wording,
    // not an enum leaking. What matters is whether a shelf CONTROL is titled
    // with the bare kind -- the case displayLabel used to fall through to.
    const rawNamed = names.filter((n) => RAW_KINDS.includes(n.trim().toLowerCase())
      && n.trim() === n.trim().toLowerCase());
    console.log(`[${who.toUpperCase()}] shelves named by a raw kind: ${JSON.stringify(rawNamed)}`);
    expect(rawNamed, `a shelf is showing a ${who} its database kind instead of a name`).toEqual([]);

    await page.screenshot({ path: `test-results/shelf-labels-${who}.png`, fullPage: true });
  });
}
