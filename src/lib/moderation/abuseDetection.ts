/**
 * Client-side mirror of public.detect_abuse() (see
 * supabase/migrations/20260902130000_abuse_detection.sql). Used for
 * instant before-send feedback only -- the server-side function (called
 * via the abuse_detect_* triggers on chat_messages/products/profiles/
 * orchards) is the actual enforcement and cannot be bypassed by skipping
 * or editing this check. Keep the two in sync; if you change one, change
 * both and re-run scripts/abuse-detection-tests.sql.
 *
 * Not bulletproof against determined evasion -- no regex-only filter is.
 * The word lists here are a starting set, not a claimed-complete
 * slur/threat dictionary -- see the migration header for the same note.
 */

export type AbuseCategory =
  | 'wallet_address_substitution'
  | 'credential_solicitation'
  | 'phishing'
  | 'sexual_harassment'
  | 'harassment_abuse'
  | 'scam_fraud'
  | 'app_probing';

export type AbuseSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AbuseMatch {
  rule: string;
  category: AbuseCategory;
  severity: AbuseSeverity;
  hardBlock: boolean;
}

export function detectAbuse(rawContent: string): AbuseMatch | null {
  const raw = (rawContent ?? '').trim();
  const c = raw.toLowerCase();
  if (!c) return null;

  // 4. WALLET-ADDRESS SUBSTITUTION -- hard block. See the migration for
  // why this deliberately has no "only if near the word pay" context
  // requirement, and why it also blocks someone quoting a scammer's
  // address to warn others (an accepted tradeoff, documented in
  // scripts/abuse-detection-tests.sql).
  //
  // Checked against raw, not the lowercased c: base58 (Bitcoin) is
  // case-sensitive by construction -- lowercasing turns a valid
  // uppercase 'L' into a lowercase 'l', which base58 excludes, silently
  // breaking a real address mid-string. The bc1/0x checks use /i since
  // bech32/hex don't have that same trap.
  if (
    /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/.test(raw) ||
    /\b1[a-km-zA-HJ-NP-Z1-9]{25,34}\b/.test(raw) ||
    /\b3[a-km-zA-HJ-NP-Z1-9]{25,34}\b/.test(raw) ||
    /\bbc1[a-z0-9]{25,90}\b/i.test(raw) ||
    /\b0x[a-f0-9]{40}\b/i.test(raw)
  ) {
    return { rule: 'wallet_address', category: 'wallet_address_substitution', severity: 'critical', hardBlock: true };
  }

  // 6. Credential / key solicitation -- hard block.
  if (
    /(what.?s|send|share|give|tell me) (your |me your |)(password|passcode|seed phrase|recovery phrase|private key|secret key|otp|one.time (code|password)|2fa code|verification code|security code)/.test(c) ||
    /(send|share|give) me (the |your |)(otp|2fa|verification|security) code/.test(c)
  ) {
    return { rule: 'credential_request', category: 'credential_solicitation', severity: 'critical', hardBlock: true };
  }

  // 5. Phishing -- flag, elevated severity.
  if (
    (/(https?:\/\/|www\.)\S+/.test(c) || /\b[a-z0-9-]+\.(com|net|org|co|io|me|link|xyz|app)\b/.test(c)) &&
    /(verify your account|confirm your login|confirm your identity|your account (has been|will be) (suspended|locked|limited)|unusual activity|click here to (verify|confirm|restore)|update your (payment|billing) (info|details))/.test(c)
  ) {
    return { rule: 'phishing_link', category: 'phishing', severity: 'critical', hardBlock: false };
  }

  // 2. Sexual harassment -- flag.
  if (
    /(send (me |)(nudes|nude pics|nude photos|a nude)|send me (a |)(pic|picture|photo|video) of (you|yourself) (naked|nude))/.test(c) ||
    /(want to (have sex|sleep with you)|are you (single and |)(down|dtf)|show me your (body|tits|dick|ass))/.test(c)
  ) {
    return { rule: 'unwanted_sexual_advance', category: 'sexual_harassment', severity: 'high', hardBlock: false };
  }

  // 1. Harassment and abuse -- flag.
  if (
    /(kill yourself|\bkys\b|i will (find|hurt|kill) you|i know where you live|you deserve to (die|suffer)|i.?m going to hurt you)/.test(c) ||
    /\byou.?re (a |an |)(worthless|pathetic|trash|scum|disgusting)\b/.test(c)
  ) {
    return { rule: 'threat_or_hostility', category: 'harassment_abuse', severity: 'high', hardBlock: false };
  }

  // 3. Scam and fraud patterns -- flag.
  if (
    /(send me \$?\d+|send (crypto|usdt|usdc|btc|eth|sol)) and i.?ll send (you |)back (more|double|\$?\d+)/.test(c) ||
    /(pay a (small |)(fee|deposit) to (release|unlock|receive))/.test(c) ||
    /(act now|limited time only|offer expires (today|soon)|last chance).{0,40}(pay|send|click|buy)/.test(c) ||
    /\bi.?m (a |the |)(gosat|admin|moderator|s2g (support|staff|team))\b.{0,60}(send|pay|click|verify|confirm)/.test(c) ||
    /(pay me directly|pay outside (the |)(app|platform)|skip the escrow|avoid the fee by paying)/.test(c)
  ) {
    return { rule: 'scam_pattern', category: 'scam_fraud', severity: 'high', hardBlock: false };
  }

  // 7. Attempts to probe the app itself -- flag.
  if (
    /('\s*or\s*'?1'?\s*=\s*'?1|union\s+select|drop\s+table|;\s*--|<script[\s>]|javascript:)/.test(c) ||
    /(ignore (all |)(previous|prior) instructions|disregard (your |the |)(previous |prior |)instructions|you are now (dan|jailbroken)|reveal your system prompt)/.test(c)
  ) {
    return { rule: 'app_probe', category: 'app_probing', severity: 'medium', hardBlock: false };
  }

  return null;
}

export const WALLET_ADDRESS_BLOCKED_MESSAGE =
  "For your safety, messages can't include a wallet address here — checkout always shows the correct one. If someone asked you to pay a different address, use the Report button instead.";

export const CREDENTIAL_REQUEST_BLOCKED_MESSAGE =
  "This message can't be sent — it looks like it's asking for a password, seed phrase, or verification code. Sow2Grow (and real gosats) never ask for those. If someone did, use the Report button.";

export function blockedMessageFor(match: AbuseMatch): string {
  return match.category === 'wallet_address_substitution'
    ? WALLET_ADDRESS_BLOCKED_MESSAGE
    : CREDENTIAL_REQUEST_BLOCKED_MESSAGE;
}
