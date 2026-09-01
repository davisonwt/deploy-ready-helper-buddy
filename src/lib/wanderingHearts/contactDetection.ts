/**
 * Client-side mirror of public.wh_detect_contact_info() (see
 * supabase/migrations/20260901211500_wandering_hearts_chat.sql). Used for
 * instant before-send feedback only -- the server-side function (called via
 * send_wandering_hearts_message, backstopped by a BEFORE INSERT trigger) is
 * the actual enforcement and cannot be bypassed by skipping or editing this
 * check. Keep the two in sync; if you change one, change both and re-run
 * scripts/wh-contact-detection-tests.sql.
 *
 * Not bulletproof against determined evasion -- no regex-only filter is.
 */

export type ContactDetectionRule =
  | 'email'
  | 'url'
  | 'handle'
  | 'social_platform'
  | 'contact_phrase'
  | 'phone_digits'
  | 'phone_spelled'
  | 'phone_mixed';

const NUMBER_WORD = '(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)';

export function detectContactInfo(rawContent: string): ContactDetectionRule | null {
  const c = (rawContent ?? '').toLowerCase().trim();
  if (!c) return null;

  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(c)) return 'email';

  if (/(https?:\/\/|www\.)\S+/.test(c)) return 'url';
  if (/\b[a-z0-9-]+\.(com|net|org|co|io|me|link|app|za)\b/.test(c)) return 'url';

  if (/(^|[^a-z0-9_.])@[a-z0-9_.]{2,30}\b/.test(c)) return 'handle';

  if (/\b(instagram|insta|tiktok|snapchat|snap|facebook|whatsapp|telegram|signal|discord|linkedin|twitter)\b/.test(c)) {
    return 'social_platform';
  }

  if (/(my number is|call me (on|at)|text me (on|at)|email me (at)|reach me (on|at)|add me on|contact me (on|at)|here'?s my number|whatsapp me|dm me)/.test(c)) {
    return 'contact_phrase';
  }

  const digitRuns = c.match(/\+?\(?\d[\d\s.\-()]{5,}\d/g);
  if (digitRuns?.some((run) => run.replace(/[^0-9]/g, '').length >= 7)) {
    return 'phone_digits';
  }

  const spelledRe = new RegExp(`(\\b${NUMBER_WORD}\\b[\\s-]*){5,}`);
  if (spelledRe.test(c)) return 'phone_spelled';

  const mixedRe = new RegExp(`\\d${NUMBER_WORD}|${NUMBER_WORD}\\d`);
  if (mixedRe.test(c)) return 'phone_mixed';

  return null;
}

export const CONTACT_BLOCKED_MESSAGE =
  "Wandering Hearts keeps contact details private. Keep chatting here — you can share more once you've both unlocked calls.";
