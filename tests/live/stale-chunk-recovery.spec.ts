import { test, expect } from '@playwright/test';

// Verifies the stale-chunk auto-recovery path actually fires, against the
// LIVE deployment -- not just "the code looks right by inspection." Two
// independent listeners are supposed to catch this (see
// src/lib/staleChunkReload.ts's own doc comment):
//   1. main.tsx's `window.addEventListener('vite:preloadError', ...)`
//   2. ErrorBoundary.tsx's componentDidCatch, for the same failure arriving
//      through React's error-boundary path instead of the window event.
// This test simulates path #1 directly (dispatching the exact event Vite's
// own __vitePreload helper fires) -- the more realistic trigger, since it
// doesn't require actually breaking a real chunk. A real stale chunk after
// a genuine deploy exercises the identical two listeners either way.
//
// Run: npx playwright test --config=playwright.live.config.ts stale-chunk-recovery

test('stale chunk import triggers an automatic reload, not the crash screen', async ({ page }) => {
  // NOTE on method: an earlier version of this test tried to spy on
  // `window.location.reload` by patching `Location.prototype.reload` via
  // `addInitScript`. Verified directly (throwaway diagnostic script) that
  // Chromium does NOT let that patch intercept real `.reload()` calls --
  // even a MANUAL `window.location.reload()` call after the same patch
  // went unobserved. Location's operations are hardened against exactly
  // this kind of spoofing. So this test lets a REAL reload happen and
  // observes it via Playwright's own navigation/load events instead --
  // the only way to actually prove the call fired, not just that the code
  // leading up to it ran.
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const guardBefore = await page.evaluate(() => sessionStorage.getItem('sow2grow:stale-chunk-reload-attempted'));
  expect(guardBefore, 'reload guard should be unset on a fresh tab').toBeNull();

  const loadPromise = page.waitForEvent('load', { timeout: 15000 });

  // The exact failure Vite's __vitePreload dispatches for a stale chunk --
  // see staleChunkReload.ts's STALE_CHUNK_PATTERNS for the cross-browser
  // message variants this must match.
  await page.evaluate(() => {
    const err = new Error('Failed to fetch dynamically imported module: https://sow2growapp.com/assets/SomePage-stalehash.js');
    window.dispatchEvent(new CustomEvent('vite:preloadError', { detail: err, cancelable: true }));
  });

  // A genuine `window.location.reload()` call -- if it fired -- causes a
  // real navigation Playwright observes as a fresh 'load' event on this
  // same page, with no `page.goto()`/`page.reload()` call of our own.
  await loadPromise;
  console.log('Page reloaded on its own after a simulated stale-chunk vite:preloadError -- automatic recovery confirmed (no crash screen).');

  const crashScreen = page.locator('text=Something went wrong');
  await expect(crashScreen, 'the crash screen should never appear for a stale-chunk error').toHaveCount(0);

  // Guard is per-tab (sessionStorage), survives the reload (same origin,
  // same tab) -- proves it was this exact code path, not some unrelated
  // navigation, and that a SECOND stale-chunk event in the same tab
  // session would be a no-op rather than looping into a second reload.
  const guardAfter = await page.evaluate(() => sessionStorage.getItem('sow2grow:stale-chunk-reload-attempted'));
  console.log(`Reload guard after recovery: ${guardAfter} (expected '1' -- confirms this exact reload path, and blocks a second reload this tab session)`);
  expect(guardAfter, 'the stale-chunk reload guard should be set after recovering, preventing a reload loop').toBe('1');
});
