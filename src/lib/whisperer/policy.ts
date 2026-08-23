/**
 * WHISPERER GOLDEN RULE — Sow2Grow
 * ================================
 *
 * A Whisperer is a tribe member who markets another sower's seed.
 *
 * 1. A sower may flag a seed as "whisperer enabled" and set a whisper %
 *    (default {@link WHISPER_SHARE_PERCENT}%). THIS ALONE PAYS NOBODY.
 *
 * 2. A whisper share is only ever paid when an ACTIVE link exists in
 *    `product_whisperer_assignments` between that seed and a registered
 *    whisperer.
 *
 * 3. THE PRESCRIBED PATH (enforced in the database by
 *    `enforce_whisperer_assignment_flow`):
 *
 *      a. Whisperer registers  ->  /become-a-whisperer
 *      b. Whisperer requests a seed  ->  row created with status 'pending'
 *      c. SOWER GIVES PERMISSION  ->  sower sets status 'active'
 *         (or declines / revokes later)
 *      d. Only from 'active' onwards does the whisperer earn the whisper share
 *
 *    A whisperer can never self-approve. A pending, declined, withdrawn or
 *    revoked link earns nothing.
 *
 * 4. FALLBACK RULE: when no ACTIVE whisperer is linked to a seed, the whisper
 *    share is NOT charged to anyone and NOT held anywhere — it simply stays
 *    with the sower (creator payout). Currently there are seeds with a whisper
 *    % set and no whisperer linked; those all pay 100% of the whisper share
 *    back to the sower.
 */

/** Percentage of a bestowal that goes to an ACTIVE whisperer. */
export const WHISPER_SHARE_PERCENT = 15;

/** Same value as a fraction, for money math. */
export const WHISPER_SHARE_RATE = WHISPER_SHARE_PERCENT / 100;

/** The only status where a whisperer is actually paid. */
export const WHISPER_STATUS_ACTIVE = 'active' as const;

export type WhispererAssignmentStatus =
  | 'pending'    // whisperer asked, sower has not answered yet — pays nothing
  | 'active'     // sower gave permission — whisper share is paid
  | 'declined'   // sower said no — pays nothing
  | 'withdrawn'  // whisperer pulled the request — pays nothing
  | 'revoked';   // sower ended the link — pays nothing

/** True only when this link entitles the whisperer to the whisper share. */
export const isWhisperPayable = (status?: string | null) =>
  status === WHISPER_STATUS_ACTIVE;

/**
 * Split the whisper share for one line item.
 * No ACTIVE whisperer => the whole share falls back to the sower.
 */
export function whisperSplit(amount: number, hasActiveWhisperer: boolean) {
  const share = Number(amount || 0) * WHISPER_SHARE_RATE;
  return hasActiveWhisperer
    ? { toWhisperer: share, toSower: 0 }
    : { toWhisperer: 0, toSower: share };
}

export const WHISPER_FALLBACK_NOTE =
  `No whisperer is linked to this seed — the ${WHISPER_SHARE_PERCENT}% whisper share falls back to the sower.`;
