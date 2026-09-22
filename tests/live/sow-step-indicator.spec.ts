import { test, expect, type Page } from '@playwright/test';
import { asUser, sweepProducts, reportSweep, trackUploads, sweepTrackedUploads, type TrackedUpload } from './support/fixtures';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run: npx playwright test --config=playwright.live.config.ts sow-step-indicator
 */

const OWNER_EMAIL = process.env.TEST_GOSAT_EMAIL || '';
const OWNER_PASS = process.env.TEST_GOSAT_PASSWORD || '';
const PHOTO = path.resolve(__dirname, '../../src/assets/tier-grove.jpg');
const STAMP = process.env.QA_STAMP ?? String(Date.now()).slice(-6);
const QA_TITLE = `QAHAND ${STAMP}`;

const VIEWPORTS = [
  { w: 390, h: 844, name: 'mobile-390' },
  { w: 1280, h: 720, name: 'desktop-1280' },
];

interface SowForm {
  route: string;
  firstStep: RegExp;
  steps: number;
  pick: RegExp;
  /**
   * Whatever else step 1 needs before it counts as done. Wheel and Hand
   * complete step 1 on the choice alone. Pillow's step 1 is "Your units",
   * and a unit is not valid until it also has a name and a price -- so
   * picking a kind legitimately leaves step 1 unfinished there.
   */
  finishStep1?: (page: Page) => Promise<void>;
}

const FORMS: SowForm[] = [
  // The choice buttons put the label and its hint in one accessible name
  // ("CarA normal car. People and small loads."), so these anchor at the
  // start only. An exact match finds nothing and waits out the timeout.
  { route: '/sow/wheel', firstStep: /^1\. What is it\?$/, steps: 6, pick: /^Car/ },
  // Pillow was restructured into units: the form now opens with "What can
  // people book?" and has 6 steps, not the 7-step "What kind of place is
  // it?" flow this line was written against. The old expectation could
  // never match, so this case had been failing on setup, not on layout.
  {
    route: '/sow/pillow',
    firstStep: /^1\. What can people book\?$/,
    steps: 6,
    pick: /^Cottage/,
    finishStep1: async (page) => {
      await page.locator('input[placeholder="Family chalet"]').fill('QA unit');
      await page.locator('input[placeholder="—"]').first().fill('250');
      await page.waitForTimeout(800);
    },
  },
  { route: '/sow/hand', firstStep: /^1\. What do you do\?$/, steps: 7, pick: /^Electrician/ },
];

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', OWNER_EMAIL);
    await page.fill('input[type="password"]', OWNER_PASS);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

/** Geometry of the indicator and the rate chip, measured in the page. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const nav = document.querySelector('nav[aria-label*="steps"]') as HTMLElement | null;
    if (!nav) return null;
    const r = nav.getBoundingClientRect();
    const chips = Array.from(nav.querySelectorAll('li')) as HTMLElement[];
    const rate = chips.find((c) => /what you charge/i.test(c.textContent || ''));
    const rr = rate?.getBoundingClientRect();
    const doneChips = chips.filter((c) => (c.textContent || '').includes('(done)'));
    // What is actually painted at the rate chip's centre: if something else
    // is on top, "legible" would be a lie.
    const hit = rr ? document.elementFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2) : null;
    return {
      viewportH: vh,
      navTop: Math.round(r.top),
      navBottom: Math.round(r.bottom),
      navFullyVisibleWithoutScrolling: r.top >= 0 && r.bottom <= vh,
      chipCount: chips.length,
      doneLabels: doneChips.map((c) => (c.textContent || '').replace(/\(done\)/, '').replace(/\s+/g, ' ').trim()),
      step1Done: (chips[0]?.textContent || '').includes('(done)'),
      rateChipText: (rate?.textContent || '').replace(/\(done\)/, '').replace(/\s+/g, ' ').trim(),
      rateChipTop: rr ? Math.round(rr.top) : null,
      rateChipVisible: rr ? rr.top >= 0 && rr.bottom <= vh : false,
      rateChipOnTop: !!hit && !!rate && (rate.contains(hit) || hit === rate),
      subline: (nav.querySelector('p')?.textContent || '').replace(/\s+/g, ' ').trim(),
      firstQuestionTop: Math.round((document.querySelector('h2')?.getBoundingClientRect().top) ?? -1),
    };
  });
}

test.describe.serial('The sow forms name every step up front', () => {

  /** Objects this spec's own pages upload, swept in afterAll. */
  const trackedUploads: TrackedUpload[] = [];
  test.beforeEach(({ page }) => trackUploads(page, trackedUploads));
  test.skip(!OWNER_EMAIL || !OWNER_PASS, 'The owner account is required.');

  /**
   * The hand-registration test at the bottom creates a real listing and
   * had no teardown, so every run left a QAHAND row behind (QAHAND 451790
   * and QAHAND 867817 were both swept by hand on 2026-09-22).
   */
  test.afterAll(async () => {
    if (!OWNER_EMAIL || !OWNER_PASS) return;
    const { client, userId } = await asUser(OWNER_EMAIL, OWNER_PASS, 'the owner account');
    reportSweep('sow-step-indicator', await sweepProducts(client, userId, [QA_TITLE]));
    await sweepTrackedUploads(client, trackedUploads, 'sow-step-indicator');
  });

  for (const vp of VIEWPORTS) {
    for (const form of FORMS) {
      test(`${form.route} at ${vp.name}: indicator above the fold, rate named`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await login(page);
        await page.goto(form.route, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: form.firstStep })).toBeVisible({ timeout: 30000 });
        await page.waitForTimeout(1500);

        const before = await measure(page);
        console.log(`\n[${form.route} @ ${vp.name}] BEFORE ANY CHOICE\n` + JSON.stringify(before));
        expect(before, 'no step indicator rendered').not.toBeNull();

        expect(before!.chipCount, 'wrong number of steps').toBe(form.steps);
        expect(before!.navFullyVisibleWithoutScrolling, 'the indicator needs scrolling').toBe(true);
        expect(before!.rateChipVisible, 'the charge step is not on the first screen').toBe(true);
        expect(before!.rateChipOnTop, 'the charge step is covered by something').toBe(true);
        expect(before!.rateChipText).toMatch(/What you charge/i);
        // The location is prefilled from the member's wandering role, so a
        // step can legitimately be done before anyone touches the form. What
        // must not be done is step 1, the one choice everything waits on.
        expect(before!.step1Done, 'step 1 cannot be done before a choice').toBe(false);
        expect(before!.subline, 'the subline must name the rate step').toMatch(/what you charge at step \d/i);
        // The indicator must sit above the first question, not after it.
        expect(before!.navBottom).toBeLessThanOrEqual(before!.firstQuestionTop);

        await page.screenshot({ path: `test-results/steps-${form.route.split('/').pop()}-${vp.name}-before.png` });

        // --- now pick the first choice and re-measure ---------------------
        await page.getByRole('button', { name: form.pick }).first().click();
        if (form.finishStep1) await form.finishStep1(page);
        await page.waitForTimeout(2500);
        const after = await measure(page);
        console.log(`[${form.route} @ ${vp.name}] AFTER PICKING\n` + JSON.stringify(after));

        expect(after, 'the indicator vanished after a choice').not.toBeNull();
        expect(after!.chipCount).toBe(form.steps);
        expect(after!.step1Done, 'step 1 was not marked done after picking').toBe(true);
        expect(after!.subline, 'the subline did not switch to progress').toMatch(/\d+ of \d+ done/i);
        await page.screenshot({ path: `test-results/steps-${form.route.split('/').pop()}-${vp.name}-after.png` });
      });
    }
  }

  test('a full hand registration saves a rate and shows it back', async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto('/sow/hand', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Electrician/ }).first().click();

    await page.locator('input[type="file"]').nth(0).setInputFiles(PHOTO);
    await expect(page.locator('#hand-title')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2500);

    await page.fill('#hand-qualification', 'Registered electrician, wireman licence');
    await page.locator('#hand-years').fill('12');
    await page.fill('#hand-title', QA_TITLE);
    await page.fill('#hand-desc', 'QA: rate must be asked for and saved.');

    await expect(page.getByRole('heading', { name: /5\. What do you charge\?/i })).toBeVisible({ timeout: 15000 });
    await page.fill('#hand-currency', 'ZAR');
    await page.locator('#rate_hourly').fill('450.00');
    await page.locator('input[placeholder="Town or area"]').fill('Mossel Bay, South Africa');
    await page.locator('#hand-legal').click();

    // The indicator must now show the rate step done.
    const m = await measure(page);
    console.log('[full registration] indicator state:\n' + JSON.stringify(m));
    expect(m!.doneLabels.join('|'), 'the rate step is not marked done').toMatch(/What you charge/i);

    const btn = page.getByRole('button', { name: /^Offer my hand$|^List my service$|^Plant/ });
    await expect(btn).toBeEnabled({ timeout: 30000 });
    await btn.click();
    await page.waitForURL(/\/seed\/hand\/[0-9a-f-]+$/, { timeout: 90000 });
    const id = page.url().split('/').pop()!;
    console.log('[EVIDENCE] hand listing created:', id);

    await expect(page.getByText(/Rates in ZAR/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/450[.,]00/).first()).toBeVisible();
    console.log('[EVIDENCE] rate displayed back on the listing page');
    await page.screenshot({ path: 'test-results/hand-listing-with-rate.png', fullPage: true });
  });
});
