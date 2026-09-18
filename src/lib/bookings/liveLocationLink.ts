/**
 * Live-location links pasted by a driver.
 *
 * Mirrors public.live_location_host(text) in
 * supabase/migrations/20260919170000_booking_live_location.sql. The database
 * is the authority -- this exists so the driver finds out before he submits,
 * not after, and so the message he reads is a sentence rather than a
 * constraint name.
 *
 * If you change the allowlist here, change it there in the same commit.
 */

/** Hosts a "share my location" action can actually produce. */
const ALLOWED_HOSTS = [
  'maps.app.goo.gl', // Google Maps "Share location" short link
  'maps.apple.com', // Apple Maps
  'wa.me', // WhatsApp
  'api.whatsapp.com',
] as const;

/**
 * Google is allowed only where the path is a map. google.com/url?q= is an
 * open redirect, so the bare host would let any URL through wearing Google's
 * name -- which is exactly what the allowlist is for.
 */
const GOOGLE_MAP_HOSTS = ['www.google.com', 'google.com', 'maps.google.com'] as const;

export const LIVE_LOCATION_REJECTED =
  'That link is not a live-location link. Use "Share live location" in Google Maps, Apple Maps or WhatsApp and paste the link it gives you — it must start with https:// and come from one of those.';

export type LiveLocationCheck =
  | { ok: true; url: string; host: string }
  | { ok: false; message: string };

/**
 * The host of a permitted link, or null. Deliberately strict: rejects
 * anything but https, any userinfo (https://maps.app.goo.gl@evil.example/),
 * and any whitespace or control character.
 */
export function liveLocationHost(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const url = raw.trim();
  if (url.length === 0 || url.length > 2048) return null;
  if (/\s/.test(url)) return null;
  // Written as a codepoint scan rather than a regex: a control-character
  // class is exactly what no-control-regex exists to catch.
  for (let i = 0; i < url.length; i += 1) {
    const code = url.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return null;
  }
  if (!/^https:\/\//i.test(url)) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;
  if (parsed.username !== '' || parsed.password !== '') return null;

  const host = parsed.hostname.toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(host)) return null;

  if ((GOOGLE_MAP_HOSTS as readonly string[]).includes(host)) {
    return parsed.pathname.startsWith('/maps') ? host : null;
  }

  return (ALLOWED_HOSTS as readonly string[]).includes(host) ? host : null;
}

/** What the paste-and-go field calls. */
export function checkLiveLocationLink(raw: string | null | undefined): LiveLocationCheck {
  const url = (raw ?? '').trim();
  const host = liveLocationHost(url);
  if (!host) return { ok: false, message: LIVE_LOCATION_REJECTED };
  return { ok: true, url, host };
}

/**
 * Statuses in which a shared link is visible to either party. Matches the
 * RLS SELECT policy; after these the row is unreadable, not merely hidden.
 */
export const LIVE_LOCATION_STATUSES = ['on_my_way', 'arrived', 'in_transit'] as const;

export function liveLocationVisibleForStatus(status: string | null | undefined): boolean {
  return (LIVE_LOCATION_STATUSES as readonly string[]).includes(status ?? '');
}
