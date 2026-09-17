/**
 * The one place a shareable seed URL is built.
 *
 * My Listings' Copy link button and ShareSeedDialog's Link tab must hand out
 * the same string, referral code included. Two builders would drift, and the
 * one that drifted would be the one nobody tested.
 *
 * The origin is pinned to production rather than read from the current tab,
 * because a link copied from a preview deployment is useless to the person
 * it gets pasted to. Localhost is the exception, so a developer copying a
 * link during development gets one they can actually open.
 */
export const SHARE_ORIGIN = 'https://sow2growapp.com';

export function buildSeedShareUrl(openPath: string, referralCode?: string | null): string {
  const origin = typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? window.location.origin
    : SHARE_ORIGIN;
  const url = new URL(openPath, origin);
  if (referralCode) url.searchParams.set('ref', referralCode);
  return url.toString();
}

export type CopyOutcome = 'clipboard' | 'selected' | 'failed';

/**
 * Copy text, and say honestly which way it went.
 *
 * navigator.clipboard is undefined outside a secure context and throws when
 * the browser does not count the gesture as a user activation, which is
 * common on mobile. The execCommand path still works in those cases. When
 * neither does, the caller must not claim success: it gets 'failed' and
 * shows the member the link instead.
 */
export async function copyTextWithFallback(text: string): Promise<CopyOutcome> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return 'clipboard';
    }
  } catch {
    // Fall through to the selection path below.
  }

  try {
    const field = document.createElement('textarea');
    field.value = text;
    // Off-screen rather than display:none -- a hidden field cannot be
    // selected, and an unstyled one scrolls the page on focus.
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.top = '0';
    field.style.left = '-9999px';
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(field);
    if (ok) return 'selected';
  } catch {
    // Nothing left to try.
  }

  return 'failed';
}
