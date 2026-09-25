import { test, expect, type Page } from '@playwright/test';

/**
 * Stale-chunk recovery, including the case that actually broke: a tab that
 * has already recovered once.
 *
 * Run: npx playwright test --config=playwright.live.config.ts stale-chunk-recovery
 */

const EMAIL = process.env.TEST_GOSAT_EMAIL || '';
const PASS = process.env.TEST_GOSAT_PASSWORD || '';
const HAND_ID = 'a81857e8-b6b9-4f42-b4ae-17be0eecdd1d';
const WHEEL_ID = '819a5b71-48a4-40c5-9fc7-f516aa82c348';
const RELOAD_AT = 'sow2grow:stale-chunk-reload-at';

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

/**
 * Break a named chunk exactly `times` times, then let it through.
 * Returns the counter so a test can prove the failure was really staged.
 */
async function breakChunk(page: Page, name: RegExp, times: number) {
  const state = { blocked: 0 };
  await page.route(name, async (route) => {
    if (state.blocked < times) {
      state.blocked++;
      await route.fulfill({ status: 404, contentType: 'text/plain', body: 'gone' });
      return;
    }
    await route.continue();
  });
  return state;
}

const bodyText = (page: Page) =>
  // Wide enough that the listing title is not cut in half by the slice.
  page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400));

test.describe.serial('Stale chunk recovery', () => {
  test.skip(!EMAIL || !PASS, 'The owner account is required.');
  // Without this the app's service worker answers the chunk request itself
  // and page.route never sees it, so the failure cannot be staged at all.
  test.use({ serviceWorkers: 'block' });

  test('1. a clean tab recovers', async ({ page }) => {
    let loads = 0;
    page.on('load', () => loads++);
    await login(page);
    await page.evaluate((k) => { try { sessionStorage.removeItem(k); } catch { /* ignore */ } }, RELOAD_AT);

    const hand = await breakChunk(page, /HandSeedDetailPage-.*\.js/, 1);
    loads = 0;
    await page.goto(`/seed/hand/${HAND_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(12000);

    const text = await bodyText(page);
    console.log('[1 clean tab] blocked=%d loads=%d %s', hand.blocked, loads, JSON.stringify(text));
    expect(hand.blocked, 'the chunk was never requested').toBe(1);
    expect(loads, 'no reload happened').toBeGreaterThanOrEqual(2);
    expect(text, 'the error screen is showing').not.toMatch(/Something went wrong/i);
    expect(text, 'the listing did not render').toMatch(/S2G Electricians/i);
  });

  test('2. a tab that ALREADY recovered recovers again', async ({ page }) => {
    let loads = 0;
    page.on('load', () => loads++);
    await login(page);
    await page.evaluate((k) => { try { sessionStorage.removeItem(k); } catch { /* ignore */ } }, RELOAD_AT);

    // --- first recovery -------------------------------------------------
    const hand = await breakChunk(page, /HandSeedDetailPage-.*\.js/, 1);
    loads = 0;
    await page.goto(`/seed/hand/${HAND_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(12000);
    const firstText = await bodyText(page);
    const loadsAfterFirst = loads;
    console.log('[2 first] blocked=%d loads=%d %s', hand.blocked, loadsAfterFirst, JSON.stringify(firstText));
    expect(hand.blocked).toBe(1);
    expect(loadsAfterFirst, 'the first recovery did not happen').toBeGreaterThanOrEqual(2);
    expect(firstText).toMatch(/S2G Electricians/i);

    // The record is cleared ten seconds after load, so by now this tab looks
    // untouched again. Under the old one-shot latch it stayed set forever.
    const guardAfterSettle = await page.evaluate((k) => {
      try { return sessionStorage.getItem(k); } catch { return 'unreadable'; }
    }, RELOAD_AT);
    console.log('[2] reload record after settling:', JSON.stringify(guardAfterSettle));
    expect(guardAfterSettle, 'the record was never cleared, so this tab is spent').toBeNull();

    // --- second, different chunk, same tab ------------------------------
    const wheel = await breakChunk(page, /WheelSeedDetailPage-.*\.js/, 1);
    loads = 0;
    await page.goto(`/seed/wheel/${WHEEL_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(12000);
    const secondText = await bodyText(page);
    console.log('[2 second] blocked=%d loads=%d %s', wheel.blocked, loads, JSON.stringify(secondText));

    expect(wheel.blocked, 'the second chunk was never requested').toBe(1);
    expect(loads, 'THE BUG: the second stale chunk did not reload').toBeGreaterThanOrEqual(2);
    expect(secondText, 'the error screen is showing on the second failure').not.toMatch(/Something went wrong/i);
    expect(secondText, 'the second listing did not render').toMatch(/Silver Hyundai Venue/i);
    await page.screenshot({ path: 'test-results/stale-chunk-second-recovery.png' });
  });

  test('3. a genuinely broken deploy still cannot loop', async ({ page }) => {
    let loads = 0;
    page.on('load', () => loads++);
    await login(page);
    await page.evaluate((k) => { try { sessionStorage.removeItem(k); } catch { /* ignore */ } }, RELOAD_AT);

    // Never let it through: this is a deploy that is actually broken.
    const hand = await breakChunk(page, /HandSeedDetailPage-.*\.js/, 999);
    loads = 0;
    await page.goto(`/seed/hand/${HAND_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(20000);

    const text = await bodyText(page);
    console.log('[3 broken deploy] blocked=%d loads=%d %s', hand.blocked, loads, JSON.stringify(text));
    // One reload, then it gives up and shows the error rather than cycling.
    expect(loads, 'it reloaded more than once: that is a loop').toBeLessThanOrEqual(2);
    // Same card reload-guard asserts (a4a3b4df): a chunk that still 404s
    // after the one reload is a deploy the tab can't reach, not a crash, and
    // ErrorBoundary says so rather than showing "Something went wrong".
    expect(text, 'it should say the app updated, once it cannot recover').toMatch(/S2G has updated/i);
    expect(text, 'a stale chunk must never be dressed up as a crash').not.toMatch(/Something went wrong/i);
    expect(text, 'the member needs the one control that fixes it').toMatch(/Tap to reload/i);
  });
});
