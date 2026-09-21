// Stale-chunk detection + reload guard.
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
// Both share the guard here so whichever catches it first reloads, and the
// other is a no-op rather than a second reload.
//
// The guard is a COOLDOWN, not a one-shot latch. It used to write a flag
// before reloading and never clear it, which meant one recovery per tab
// for the life of that tab: the second stale chunk in the same tab landed
// on the "Something went wrong" screen with no reload at all. With several
// deploys in a day that is the common case, not the rare one, and it is
// what a member hit in production on 2026-09-17.

const RELOAD_AT_KEY = 'sow2grow:stale-chunk-reload-at';

/**
 * How long after a reload we refuse to reload again.
 *
 * A genuine loop (the initial route chunk 404s on every load) cycles in
 * about a second, so this stops it dead. A real second failure hours or
 * minutes later is nowhere near it and recovers normally.
 */
const RELOAD_COOLDOWN_MS = 30_000;

/**
 * How long a module-preload failure keeps explaining later errors.
 *
 * React.lazy() reports a missing module as "Cannot read properties of
 * undefined (reading 'default')" -- it awaits the import, gets nothing, and
 * reads `.default` off it. That message matches no stale-chunk pattern and
 * never will, because it is a generic TypeError that unrelated bugs also
 * produce. Matching the string would reload the app on those too. Pairing
 * it with a preload failure that actually just happened does not.
 */
const PRELOAD_ECHO_MS = 10_000;

const STALE_CHUNK_PATTERNS: RegExp[] = [
  /importing a module script failed/i,
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /failed to load module script/i,
  /unable to preload css/i,
  /dynamically imported module/i,
];

/** Set when a chunk demonstrably failed to load, not when one is suspected. */
let lastPreloadFailureAt = 0;

/** Called from the 'vite:preloadError' listener, and from a failed <script>. */
export function noteModulePreloadFailure(): void {
  lastPreloadFailureAt = Date.now();
}

export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (STALE_CHUNK_PATTERNS.some((pattern) => pattern.test(message))) return true;
  // Whatever surfaced in the component tree milliseconds after a chunk
  // failed to load is that failure wearing a different message.
  return lastPreloadFailureAt > 0 && Date.now() - lastPreloadFailureAt < PRELOAD_ECHO_MS;
}

// Mirror of the stored timestamp, for the case sessionStorage itself throws
// -- private-browsing lockdown in some older Safari versions, or a storage
// policy block. The cooldown still applies, it just does not survive the
// reload, so such a browser gets one reload per page load rather than none.
let memoryReloadAt = 0;

function readReloadAt(): number {
  try {
    const raw = sessionStorage.getItem(RELOAD_AT_KEY);
    if (raw) return Number(raw) || 0;
  } catch {
    // fall through to the in-memory mirror
  }
  return memoryReloadAt;
}

function writeReloadAt(ts: number): void {
  memoryReloadAt = ts;
  try {
    sessionStorage.setItem(RELOAD_AT_KEY, String(ts));
  } catch {
    // in-memory mirror already set
  }
}

/**
 * Forget the last reload, so a later stale chunk recovers immediately
 * instead of waiting out the cooldown.
 *
 * Called once the app has been alive and rendering for longer than any
 * reload loop could survive. A loop never reaches it: the failing import
 * happens during the first render, so the tab reloads long before this
 * fires. That is what makes it safe to clear.
 */
export function markAppLoadedSuccessfully(): void {
  memoryReloadAt = 0;
  try {
    sessionStorage.removeItem(RELOAD_AT_KEY);
  } catch {
    // in-memory mirror already cleared
  }
}

/**
 * Reloads the page for a stale chunk unless one just happened. Returns true
 * if it actually triggered a reload (the caller should treat that as "stop,
 * the page is navigating away" and not also log or render an error state).
 */
export function reloadOnceForStaleChunk(): boolean {
  return requestGuardedReload('stale-chunk');
}

/**
 * The ONE automatic reload in the app. Every path that wants to recover a
 * tab by reloading it goes through here, so they share a single budget
 * instead of each spending their own.
 *
 * Nothing about a member's morning is improved by a second opinion on
 * whether to reload. Before this, three paths reloaded independently --
 * this guard, lazyPages.ts's own per-chunk `chunk-retry:<key>` flag, and
 * main.tsx's service-worker `controllerchange` handler, which reloaded
 * unconditionally. A phone resuming a tab left open across a day of
 * deploys could take all three in a row, which is what "spontaneous
 * reloads" looked like from the member's side on 2026-09-21.
 *
 * A manual reload (BuildUpdateBanner's "Refresh to update", the error
 * card's "Reload Page") is deliberately NOT routed through here -- a
 * member who asks for a refresh gets one, every time.
 */
export function requestGuardedReload(reason: string): boolean {
  const now = Date.now();
  const last = readReloadAt();
  if (last > 0 && now - last < RELOAD_COOLDOWN_MS) return false;
  writeReloadAt(now);
  // Left in place on purpose: when a member reports a reload, this is the
  // only record of which path spent it.
  console.warn(`[s2g] reloading once to recover: ${reason}`);
  window.location.reload();
  return true;
}

/** Exported for the live test, which asserts the real numbers. */
export const STALE_CHUNK_TIMING = {
  RELOAD_COOLDOWN_MS,
  PRELOAD_ECHO_MS,
} as const;
