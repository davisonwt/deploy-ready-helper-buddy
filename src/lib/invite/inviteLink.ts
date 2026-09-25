/**
 * A member's invite link -- the ONE link every "Invite people" control
 * shares, and the one the private welcome message hands a new member.
 *
 *   https://sow2growapp.com/stall/<username>?ref=<their affiliates code>
 *
 * It works whether or not the member has a stall: with a published stall
 * it opens their stall front (StallVisitPage, as it always has); without
 * one, the same URL shows the invite join page (InviteJoinView). So a
 * link shared before someone builds their stall starts opening the stall
 * once it exists, with nothing re-shared. The ?ref= is captured app-wide
 * by useReferralCapture and carried through signup.
 *
 * Keep in step with send_member_welcome (supabase/migrations), which
 * builds the same URL server-side.
 */
export const INVITE_ORIGIN = 'https://sow2growapp.com';

export function buildInviteUrl(username: string | null | undefined, code: string): string {
  const ref = encodeURIComponent(code);
  const name = username?.trim();
  return name
    ? `${INVITE_ORIGIN}/stall/${encodeURIComponent(name)}?ref=${ref}`
    : `${INVITE_ORIGIN}/register?ref=${ref}`;
}

export const INVITE_SHARE_TITLE = 'Join me on Sow2Grow';
export const INVITE_SHARE_TEXT = "🌱 Join my tribe on Sow2Grow, a global tribal marketplace. Sign up through my link and you'll be part of my tribe.";
