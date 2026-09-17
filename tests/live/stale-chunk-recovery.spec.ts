import { test, expect, type Page } from '@playwright/test';

/**
 * Does the stale-chunk recovery actually fire, or is it only present?
 *
 * Run: npx playwright test --config=playwright.live.config.ts stale-chunk-recovery
 */

const EMAIL = process.env.TEST_GOSAT_EMAIL || '';
const PASS = process.env.TEST_GOSAT_PASSWORD || '';
const HAND_ID = 'a81857e8-b6b9-4f42-b4ae-17be0eecdd1d';
const GUARD = 'sow2grow:stale-chunk-reload-attempted';

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

/** Fail the first request for the hand detail chunk, like a stale deploy. */
async function breakChunkOnce(page: Page, counter: { blocked: number }) {
  await page.route(/HandSeedDetailPage-.*\.js/, async (route) => {
    if (counter.blocked === 0) {
      counter.blocked++;
      await route.fulfill({ status: 404, contentType: 'text/plain', body: 'gone' });
      return;
    }
    await route.continue();
  });
}

test.describe.serial('Stale chunk recovery', () => {
  test.skip(!EMAIL || !PASS, 'The owner account is required.');
  // Without this the app's service worker answers the chunk request itself
  // and page.route never sees it, so the failure cannot be staged at all.
  test.use({ serviceWorkers: 'block' });

  test('1. with a clean tab it reloads and recovers', async ({ page }) => {
    const counter = { blocked: 0 };
    let loads = 0;
    const consoleErrors: string[] = [];
    page.on('load', () => loads++);
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });

    await login(page);
    await page.evaluate((k) => { try { sessionStorage.removeItem(k); } catch { /* ignore */ } }, GUARD);
    await breakChunkOnce(page, counter);

    loads = 0;
    await page.goto(`/seed/hand/${HAND_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(12000);

    const state = await page.evaluate((k) => ({
      guard: (() => { try { return sessionStorage.getItem(k); } catch { return 'unreadable'; } })(),
      bodyStart: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200),
      url: location.pathname,
    }), GUARD);

    console.log('[CLEAN TAB] blocked=%d loads=%d %s', counter.blocked, loads, JSON.stringify(state));
    console.log('[CLEAN TAB] console errors:', JSON.stringify(consoleErrors.slice(0, 4)));
    await page.screenshot({ path: 'test-results/stale-chunk-clean-tab.png', fullPage: false });

    expect(counter.blocked, 'the chunk was never requested').toBe(1);
    expect(loads, 'the page did not reload after the failed chunk').toBeGreaterThanOrEqual(2);
    expect(state.bodyStart, 'the error screen is still showing').not.toMatch(/Something went wrong/i);
  });

  test('2. with the guard already set it does NOT recover', async ({ page }) => {
    const counter = { blocked: 0 };
    let loads = 0;
    page.on('load', () => loads++);

    await login(page);
    // One earlier stale-chunk reload in this tab is all it takes: the guard
    // is written before the reload and never cleared afterwards.
    await page.evaluate((k) => { try { sessionStorage.setItem(k, '1'); } catch { /* ignore */ } }, GUARD);
    await breakChunkOnce(page, counter);

    loads = 0;
    await page.goto(`/seed/hand/${HAND_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(12000);

    const state = await page.evaluate(() => ({
      bodyStart: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 220),
      url: location.pathname,
    }));

    console.log('[GUARD ALREADY SET] blocked=%d loads=%d %s', counter.blocked, loads, JSON.stringify(state));
    await page.screenshot({ path: 'test-results/stale-chunk-guard-set.png', fullPage: false });
    // Recorded, not asserted as desirable: this documents the live behaviour.
    console.log('[GUARD ALREADY SET] reloaded =', loads >= 2);
  });
});
