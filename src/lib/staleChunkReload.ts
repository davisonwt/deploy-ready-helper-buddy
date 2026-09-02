// Stale-chunk detection + single-reload guard.
//
// After a deploy, a tab that's been open since before it (or one loading
// index.html from a lagging edge cache) still references the OLD
// content-hashed chunk filenames for lazy routes/components. Those files
// no longer exist on the server, so any lazy import for one throws --
// browsers word this differently ("TypeError: Importing a module script
// failed" in Safari/Firefox, "Failed to fetch dynamically imported
// module" in Chrome) but it's the same underlying cause every time.
//
// Two independent paths can observe this failure:
//  - main.tsx's `window.addEventListener('vite:preloadError', ...)` --
//    Vite's own documented pattern; its `__vitePreload` helper dispatches
//    this event on the exact same failure before re-throwing it.
//  - ErrorBoundary.tsx, via React's normal error-boundary path -- a
//    rejected React.lazy() import throws into the component tree
//    independently of the window event above.
// Both share the same guard key here so whichever catches it first
// reloads, and the other is a no-op rather than a second reload.
//
// sessionStorage, not localStorage: it naturally resets per tab, so a
// fresh tab (or a full browser restart) always gets one genuine reload
// attempt again. This is a guard against looping within one tab's
// lifetime if the deploy is actually broken, not a permanent
// "never reload again" flag.

const RELOAD_GUARD_KEY = 'sow2grow:stale-chunk-reload-attempted';

const STALE_CHUNK_PATTERNS: RegExp[] = [
  /importing a module script failed/i,
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /failed to load module script/i,
  /unable to preload css/i,
];

export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return STALE_CHUNK_PATTERNS.some((pattern) => pattern.test(message));
}

// Fallback for the (rare) case sessionStorage itself throws -- private
// browsing lockdown in some older Safari versions, or a storage quota/
// policy block. Still caps it at one reload per page-load lifetime rather
// than looping.
let hasReloadedThisPageLoad = false;

/**
 * Reloads the page once for a stale chunk. Returns true if it actually
 * triggered a reload (the caller should treat this as "stop, the page is
 * navigating away" -- don't also log or render an error state).
 */
export function reloadOnceForStaleChunk(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
  } catch {
    if (hasReloadedThisPageLoad) return false;
    hasReloadedThisPageLoad = true;
  }
  window.location.reload();
  return true;
}
