import { test, expect, devices, type Page } from '@playwright/test';

/**
 * One automatic reload, whatever goes wrong.
 *
 * Reported 2026-09-21: a phone resuming a tab left open across ~35 deploys
 * reloaded itself several times before settling, and a manual refresh fixed
 * it with no deploy in between. Three separate code paths could each spend
 * their own reload:
 *
 *   1. lib/staleChunkReload.ts  -- the shared cooldown guard
 *   2. routes/lazyPages.ts      -- a private `chunk-retry:<key>` flag per page
 *   3. main.tsx controllerchange -- reloaded outright, no guard at all
 *
 * and (3) fired TWICE per recovery, because the worker was registered at
 * `/sw.js?v=<BUILD_ID>`: a registration is keyed by scope, so a tab that
 * reloaded onto a newer build registered a script URL its own controller
 * did not have, installed again, claimed again, and reloaded again.
 *
 * Run: npx playwright test --config=playwright.live.config.ts reload-guard
 *
 * Creates nothing and needs no account -- the stall it reads is public and
 * already published, so there is no fixture to tear down.
 */

const PHONE = { ...devices['iPhone 14 Pro'] };
const STALL = process.env.RELOAD_GUARD_STALL || '/stall/davison.taljaard';

/** Counts loads and captures the reasons the guard logs when it reloads. */
function instrument(page: Page) {
  const state = { loads: 0, reasons: [] as string[], pageErrors: [] as string[] };
  page.on('load', () => state.loads++);
  page.on('console', (m) => {
    const t = m.text();
    if (t.includes('[s2g] reloading once to recover:')) state.reasons.push(t);
  });
  page.on('pageerror', (e) => state.pageErrors.push(e.message));
  return state;
}

/** 404s a chunk matching `name` forever -- a deploy that is genuinely gone. */
async function breakChunk(page: Page, name: RegExp) {
  const state = { blocked: 0 };
  await page.route(name, async (route) => {
    state.blocked++;
    await route.fulfill({ status: 404, contentType: 'text/plain', body: 'gone' });
  });
  return state;
}

const bodyText = (page: Page) =>
  page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400));

test.describe('Reload guard', () => {
  test('the registered worker URL carries no build id', async ({ browser }) => {
    // The whole of the double-reload bug in one assertion. A query string
    // here means every recovery reload installs another "new" worker and
    // reloads a second time.
    const ctx = await browser.newContext({ ...PHONE });
    const page = await ctx.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const scriptUrl = await page.evaluate(async () => {
      for (let i = 0; i < 40; i++) {
        const reg = await navigator.serviceWorker.getRegistration();
        const w = reg?.active || reg?.installing || reg?.waiting;
        if (w) return w.scriptURL;
        await new Promise((r) => setTimeout(r, 500));
      }
      return null;
    });

    console.log('[worker] scriptURL =', JSON.stringify(scriptUrl));
    expect(scriptUrl, 'no service worker registered at all -- push notifications depend on it').not.toBeNull();
    expect(scriptUrl, 'the worker URL still carries a build id, so every reload installs another worker')
      .not.toMatch(/\?/);
    expect(scriptUrl).toMatch(/\/sw\.js$/);
    await ctx.close();
  });

  test('a dead chunk costs exactly one reload, then the updated card', async ({ browser }) => {
    // serviceWorkers blocked so page.route actually sees the chunk request
    // -- a worker-originated fetch bypasses it and the failure cannot be
    // staged at all. The reload paths under test are all page-side.
    const ctx = await browser.newContext({ ...PHONE, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const seen = instrument(page);

    const chunk = await breakChunk(page, /StallVisitPage-.*\.js/);
    await page.goto(STALL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(25000);

    const text = await bodyText(page);
    console.log('[dead chunk] blocked=%d loads=%d reasons=%s', chunk.blocked, seen.loads, JSON.stringify(seen.reasons));
    console.log('[dead chunk] body: %s', JSON.stringify(text));
    await page.screenshot({ path: 'test-results/reload-guard-dead-chunk.png' });

    expect(chunk.blocked, 'the chunk was never requested -- nothing was staged').toBeGreaterThan(0);
    // Initial load + exactly one recovery. Three was the bug.
    expect(seen.loads, `reloaded more than once: ${seen.reasons.join(' | ')}`).toBeLessThanOrEqual(2);
    expect(seen.loads, 'it never tried to recover at all').toBe(2);
    // What it says when it cannot recover MATTERS, and this assertion used
    // to demand the opposite. A chunk that 404s after a deploy is not a
    // crash: nothing is broken, the tab is just running a build that no
    // longer exists. It used to land on "Something went wrong" with a stack
    // trace, an Error ID and a Report button, which is frightening and
    // wrong. ErrorBoundary now recognises the stale-chunk case and says so.
    expect(text, 'it should say the app updated, once it cannot recover').toMatch(/S2G has updated/i);
    expect(text, 'a stale chunk must never be dressed up as a crash').not.toMatch(/Something went wrong/i);
    expect(text, 'the member needs the one control that fixes it').toMatch(/Tap to reload/i);
    await ctx.close();
  });

  test('a chunk that comes back recovers in one reload and renders', async ({ browser }) => {
    const ctx = await browser.newContext({ ...PHONE, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const seen = instrument(page);

    // Fails once, then lets it through: the ordinary stale-shell case.
    const state = { blocked: 0 };
    await page.route(/StallVisitPage-.*\.js/, async (route) => {
      if (state.blocked < 1) {
        state.blocked++;
        await route.fulfill({ status: 404, contentType: 'text/plain', body: 'gone' });
        return;
      }
      await route.continue();
    });

    await page.goto(STALL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(25000);

    const text = await bodyText(page);
    console.log('[recovers] blocked=%d loads=%d reasons=%s', state.blocked, seen.loads, JSON.stringify(seen.reasons));
    console.log('[recovers] body: %s', JSON.stringify(text));
    await page.screenshot({ path: 'test-results/reload-guard-recovered.png' });

    expect(state.blocked, 'the chunk was never requested').toBe(1);
    expect(seen.loads, 'exactly one recovery reload').toBe(2);
    expect(text, 'the error screen is showing after a recoverable failure').not.toMatch(/Something went wrong/i);
    await ctx.close();
  });
});
