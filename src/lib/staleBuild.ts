// A tab that loaded an older build keeps running that build's JavaScript,
// including whatever API key it was compiled with. After the project's
// legacy API keys were disabled (2026-09-06) such a tab gets
// "Legacy API keys are disabled" back from Supabase on every call, which
// is a stale-page problem, not a credentials problem. These helpers turn
// that (and the neighbouring "Invalid API key") into one plain message
// and nudge the service worker to pick up the current build.

export const STALE_BUILD_MESSAGE =
  'This page is running an older version of Sow2Grow. Please refresh the page and try again.';

const STALE_BUILD_PATTERNS = [
  /legacy api keys? (is|are) disabled/i,
  /invalid api key/i,
  /no api key found/i,
];

/** True when an error message means the running bundle's API key is no longer accepted. */
export function isStaleBuildError(message: unknown): boolean {
  if (typeof message !== 'string' || !message) return false;
  return STALE_BUILD_PATTERNS.some((re) => re.test(message));
}

/** Maps a raw error message to the friendly one when it is the stale-build case; otherwise returns it unchanged. */
export function friendlyAuthError(message: unknown, fallback = 'Login failed'): string {
  if (isStaleBuildError(message)) return STALE_BUILD_MESSAGE;
  return typeof message === 'string' && message ? message : fallback;
}

/** Ask the registered service worker to check for a newer build now. Safe to call anywhere; never throws. */
export function requestServiceWorkerUpdate(): void {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => undefined);
  } catch {
    // ignore: an update check is best effort
  }
}
