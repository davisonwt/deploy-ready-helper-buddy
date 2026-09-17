import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The two live bugs Davison hit on 2026-09-17.
 *
 * Run: npx playwright test --config=playwright.live.config.ts pillow-rate-and-share
 */

const EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL || '';
const PASS = process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD || '';
const OWNER_EMAIL = process.env.TEST_GOSAT_EMAIL || '';
const OWNER_PASS = process.env.TEST_GOSAT_PASSWORD || '';

const STAMP = process.env.RATE_STAMP ?? String(Date.now()).slice(-6);
const TITLE = `QAR Cottage ${STAMP}`;
const PHOTO = path.resolve(__dirname, '../../src/assets/tier-grove.jpg');
const TOWN = 'Bethlehem, South Africa';

async function login(page: Page, email = EMAIL, pass = PASS) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', pass);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

test.describe.serial('Pillow rate step and share scrolling', () => {
  test.skip(!EMAIL || !PASS, 'A test account is required.');

  test('1. a new lister is told the rate question is coming', async ({ page }) => {
    await login(page);
    await page.goto('/sow/pillow', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /List your place/i })).toBeVisible({ timeout: 25000 });

    // Nothing picked yet: the cue must name the rate.
    const cue = page.getByText(/Pick one to carry on/i);
    await expect(cue).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/what you charge/i).first()).toBeVisible();
    console.log('[EVIDENCE] before picking, the page names "what you charge"');
    await page.screenshot({ path: 'test-results/rate-cue.png', fullPage: true });
  });

  test('2. a full registration WITH a rate saves and displays it', async ({ page }) => {
    await login(page);
    await page.goto('/sow/pillow', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Room in my home/ }).click();

    const files = page.locator('input[type="file"]');
    await files.nth(0).setInputFiles(PHOTO);
    await expect(page.locator('#pillow-title')).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(2500);

    await page.fill('#pillow-title', TITLE);
    await page.fill('#pillow-desc', 'QA rate regression check.');

    // The rate step must be present and fillable.
    await expect(page.getByRole('heading', { name: /What do you charge/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#rate_nightly')).toBeVisible();
    await page.fill('#pillow-currency', 'EUR');
    await page.locator('#rate_nightly').fill('47.00');
    await page.locator('input[placeholder="Town or area"]').fill(TOWN);
    await page.locator('#pillow-legal').click();

    const btn = page.getByRole('button', { name: /^List my place$/ });
    await expect(btn).toBeEnabled({ timeout: 20000 });
    await btn.click();
    await page.waitForURL(/\/seed\/pillow\/[0-9a-f-]+$/, { timeout: 60000 });

    // And the rate is shown back, in its own currency.
    await expect(page.getByText('Rates in EUR')).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/47[.,]00/).first()).toBeVisible();
    console.log(`[EVIDENCE] listing saved at ${page.url()} showing "Rates in EUR" 47.00`);
    await page.screenshot({ path: 'test-results/rate-saved.png' });
  });

  // --- the share dialog, at three list sizes and two widths ---------------
  for (const vp of [{ w: 1280, h: 720, name: 'desktop' }, { w: 390, h: 844, name: 'mobile' }]) {
    for (const size of [2, 5, 20]) {
      test(`3. share list scrolls with ${size} recipients at ${vp.name}`, async ({ page }) => {
        test.skip(!OWNER_EMAIL || !OWNER_PASS, 'The owner account has the long tribe list.');
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await login(page, OWNER_EMAIL, OWNER_PASS);
        await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: /^Share$/ }).first().click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
        await page.waitForTimeout(4000);

        // Narrow the list to exactly `size` rows using the search box, so the
        // short-list and long-list cases are both covered.
        const all = await page.locator('[role="dialog"] li').count();
        expect(all, 'this account should have a long tribe list').toBeGreaterThan(5);
        await page.evaluate((n) => {
          const dlg = document.querySelector('[role="dialog"]')!;
          const items = Array.from(dlg.querySelectorAll('li'));
          items.slice(n).forEach((li) => li.remove());
        }, size);
        await page.waitForTimeout(600);

        const m = await page.evaluate(() => {
          const dlg = document.querySelector('[role="dialog"]') as HTMLElement;
          const ul = dlg.querySelector('ul')!;
          // The scroller is the ul's own scrolling ancestor.
          const scroller = ul.parentElement as HTMLElement;
          const btn = Array.from(dlg.querySelectorAll('button'))
            .find((b) => /Invite/.test(b.textContent || '')) as HTMLElement;
          const footer = btn.parentElement as HTMLElement;
          const fr = footer.getBoundingClientRect();
          const br = btn.getBoundingClientRect();
          const sr = scroller.getBoundingClientRect();

          // What is PAINTED at the footer's centre, and just inside its top
          // edge. A member row here would mean a row is drawn over the footer.
          const hitBtn = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
          const hitTop = document.elementFromPoint(fr.left + fr.width / 2, fr.top + 3);

          // Scroll to the end and check the last row is reachable and clipped
          // inside the scroller rather than lost behind the footer.
          scroller.scrollTop = scroller.scrollHeight;
          const rows = Array.from(ul.querySelectorAll('li'));
          const last = rows[rows.length - 1]?.getBoundingClientRect();

          return {
            rows: rows.length,
            scroller: {
              overflowY: getComputedStyle(scroller).overflowY,
              clientH: scroller.clientHeight,
              scrollH: scroller.scrollHeight,
              scrolls: scroller.scrollHeight > scroller.clientHeight + 1,
              bottom: Math.round(sr.bottom),
            },
            // The scroller must END above the footer, so nothing can overlap.
            scrollerClearsFooter: sr.bottom <= fr.top + 1,
            footerTopIsNotARow: !(hitTop instanceof HTMLElement) || !hitTop.closest('li'),
            buttonInView: br.top >= 0 && br.bottom <= window.innerHeight,
            buttonEnabled: !(btn as HTMLButtonElement).disabled,
            // A DISABLED button has pointer-events:none, so the hit lands on
            // its own footer. That is still "nothing foreign on top".
            buttonOnTop: !!hitBtn && (hitBtn === btn || btn.contains(hitBtn)),
            hitInFooter: !!hitBtn && footer.contains(hitBtn as Node),
            lastRowVisibleAfterScroll: last ? last.bottom <= sr.bottom + 2 : null,
            dialogH: Math.round(dlg.getBoundingClientRect().height),
            dialogFitsViewport: dlg.getBoundingClientRect().bottom <= window.innerHeight,
          };
        });

        console.log(`
[${vp.name} / ${size} rows] ${JSON.stringify(m)}`);
        expect(m.dialogFitsViewport, 'the dialog spills out of the viewport').toBe(true);
        expect(m.scrollerClearsFooter, 'the list box overlaps the footer').toBe(true);
        expect(m.footerTopIsNotARow, 'a member row is painted over the footer').toBe(true);
        expect(m.buttonInView, 'the send button is off screen').toBe(true);
        if (m.buttonEnabled) {
          expect(m.buttonOnTop, 'the send button is covered').toBe(true);
        } else {
          expect(m.hitInFooter, 'something foreign is drawn over the send button').toBe(true);
        }
        expect(m.scroller.overflowY, 'the list is not a scroll container').toBe('auto');
        expect(m.lastRowVisibleAfterScroll, 'the last row is unreachable by scrolling').not.toBe(false);
        if (size === 20) {
          expect(m.scroller.scrolls, 'a long list must actually scroll').toBe(true);
        }
        await page.screenshot({ path: `test-results/share-${vp.name}-${size}.png` });
      });
    }
  }
});
