import { test, expect, type Page } from '@playwright/test';
import { panHotspotIntoView } from './support/interior';

/**
 * Every share affordance, clicked -- as owner and as non-owner, at phone and
 * desktop width.
 *
 * Two share controls shipped dead this week: one whose whole chain had never
 * been clicked by a human, and one whose dialog was unusable on a short
 * screen. So this asserts the thing a member experiences -- a dialog that is
 * actually ON SCREEN and reachable -- not merely that a handler exists.
 *
 * Read-only: it opens dialogs and reads geometry. It never sends a share, so
 * it creates no rooms, messages or notifications. The send path is covered
 * separately where real rows are acceptable.
 *
 * Run: npx playwright test --config=playwright.live.config.ts share-controls-audit
 */

/** Owns the stall under test. */
const OWNER_E = process.env.TEST_GOSAT_EMAIL || '';
const OWNER_P = process.env.TEST_GOSAT_PASSWORD || '';
/** Plain member, no roles -- the non-owner view. */
const OTHER_E = process.env.TEST_A_EMAIL || '';
const OTHER_P = process.env.TEST_A_PASSWORD || '';

const STALL = '/stall/davison.taljaard';
const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];

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

/**
 * A dialog counts as REACHABLE only if it is on screen and its interactive
 * bottom is inside the viewport. "Rendered" is not the same as "usable": the
 * 2026-09-18 fault was a dialog that existed and could not be reached.
 */
async function dialogReachable(page: Page) {
  return page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]') as HTMLElement | null;
    if (!d) return { present: false, onScreen: false, bottomInside: false, height: 0, note: 'no dialog' };
    const r = d.getBoundingClientRect();
    const vh = window.innerHeight;
    const style = getComputedStyle(d);
    const visible = style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.1;
    // The last focusable control has to be inside the viewport, or the member
    // cannot finish what the dialog asks of them.
    const focusables = Array.from(d.querySelectorAll('button, input, [role="tab"], a[href]')) as HTMLElement[];
    const last = focusables[focusables.length - 1];
    const lastBottom = last ? last.getBoundingClientRect().bottom : r.bottom;
    return {
      present: true,
      onScreen: visible && r.top < vh && r.bottom > 0 && r.width > 0,
      bottomInside: lastBottom <= vh + 1,
      height: Math.round(r.height),
      note: `top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} lastCtrlBottom=${Math.round(lastBottom)} vh=${vh}`,
    };
  });
}

async function closeAnyDialog(page: Page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);
}

/** Open a shelf with seeds on it, then that card's "..." menu. */
async function openShelfMenu(page: Page): Promise<number> {
  await page.goto(STALL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);
  // On a phone the interior is a horizontal pan strip, and the Books box
  // can sit off-screen (x -309 at 390px on 2026-09-25) -- "visible" to
  // isVisible() but not clickable. Pan it into the window first.
  for (let attempt = 0; attempt < 5; attempt++) {
    for (const label of ['My Books', 'Books']) {
      const pan = await panHotspotIntoView(page, label, 0);
      if (pan.found && pan.inWindow) {
        await page.waitForTimeout(500);
        await page.locator(`button[aria-label="${label}"]`).filter({ visible: true }).first().click();
        await page.waitForTimeout(5000);
        const more = page.locator('button[aria-label="More"]');
        const n = await more.count();
        if (n) {
          await more.first().click({ force: true });
          await page.waitForTimeout(1800);
        }
        return n;
      }
    }
    await page.waitForTimeout(1500);
  }
  return 0;
}

for (const vp of VIEWPORTS) {
  for (const who of ['owner', 'non-owner'] as const) {
    test(`${who} @ ${vp.name}: seed card Share opens a reachable dialog`, async ({ page }) => {
      const email = who === 'owner' ? OWNER_E : OTHER_E;
      const pass = who === 'owner' ? OWNER_P : OTHER_P;
      test.skip(!email || !pass, `${who} account required`);
      test.setTimeout(6 * 60_000);

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, email, pass);

      const menuCount = await openShelfMenu(page);
      console.log(`[${who}/${vp.name}] "..." controls: ${menuCount}`);
      expect(menuCount, 'no seed card menu on that shelf').toBeGreaterThan(0);

      const share = page.getByRole('button', { name: /^Share$/ });
      const shareCount = await share.count();
      console.log(`[${who}/${vp.name}] Share items in menu: ${shareCount}`);
      // Owner AND non-owner both get Share -- the owner's was disabled before.
      expect(shareCount, 'Share is missing from the menu').toBeGreaterThan(0);
      await expect(share.first(), 'Share is present but not clickable').toBeEnabled();

      await share.first().click();
      await page.waitForTimeout(3000);

      const d = await dialogReachable(page);
      console.log(`[${who}/${vp.name}] share dialog: ${JSON.stringify(d)}`);
      expect(d.present, 'Share fired but no dialog opened -- the inert case').toBe(true);
      expect(d.onScreen, 'the share dialog is not visible on screen').toBe(true);
      expect(d.bottomInside, 'the share dialog is clipped -- its last control is below the fold').toBe(true);

      await page.screenshot({ path: `test-results/share-${who}-${vp.name}.png` });
      await closeAnyDialog(page);
    });
  }
}

test('the stall front Share control fires and yields a link', async ({ page }) => {
  test.skip(!OTHER_E || !OTHER_P, 'a member account is required');
  test.setTimeout(5 * 60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

  await login(page, OTHER_E, OTHER_P);
  await page.goto(STALL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);

  const share = page.getByRole('button', { name: /Share this stall/i });
  const n = await share.count();
  console.log(`[STALL FRONT] share controls: ${n}`);
  expect(n, 'no Share control on the stall front').toBeGreaterThan(0);

  await share.first().click({ force: true });
  await page.waitForTimeout(2500);

  // Either a dialog opened, or the link reached the clipboard. Silence is the
  // failure -- that is what "inert" looks like from a member's side.
  const d = await dialogReachable(page);
  const clip = await page.evaluate(() => navigator.clipboard?.readText?.().catch(() => '') ?? '');
  const toast = await page.evaluate(() => /copied|shared/i.test(document.body.innerText));
  console.log(`[STALL FRONT] dialog=${d.present} clipboard=${JSON.stringify(String(clip).slice(0, 80))} toast=${toast}`);
  expect(
    d.present || toast || String(clip).includes('/stall/'),
    'the stall Share did nothing a member could observe',
  ).toBe(true);
  await page.screenshot({ path: 'test-results/share-stall-front.png' });
});
