// Single source of truth for the Cockpit sidebar's nav items -- shared by
// DashboardPage.jsx's own sidebar, the Farm-Stalls interior's nav panel/
// drawer (batch 2e), and its mobile-portrait bookshelf variant
// (StallBookshelfNav) so none of the three ever drift on labels or route
// strings. `path` is always a real in-app route -- the old 'action:<name>'
// escape hatch (only ever used for Let It Rain) is gone along with it,
// Flow v2 step 9.

export interface CockpitNavItem {
  label: string;
  sub: string;
  emoji: string;
  path: string;
  color: string;
  /** Flow v2 step 8: only ever shown to a viewer with the admin, gosat, or radio_admin role (COCKPIT_NAV_MORE's "Gosat's Boardroom" entry) -- every renderer must filter this out itself, cockpitNav.ts has no access to the viewer's own role. */
  gated?: boolean;
}

/**
 * Flow v2 step 8's left-panel list -- SeedFlow (self-link to /cockpit,
 * now redundant with the dedicated "My Stall / Cockpit" link every nav
 * surface already renders above this list) and My Garden (now the Owner
 * Menu's own "My orchards" item, step 5) are dropped here, not carried
 * forward -- each already has its real v2 home built. Let It Rain is
 * retired outright (step 9, Davison decision) -- the Heart tip picker on
 * a SeedCard IS Let It Rain now, no separate feature/nav entry at all.
 */
export const COCKPIT_NAV: CockpitNavItem[] = [
  // Urgent, 2026-09-15: real users could not find each other's live
  // sessions without a shared link -- listed first so it's the most
  // visible nav item, not buried under Tribal Gardens.
  { label: 'Live Now', sub: 'Join a live session happening now', emoji: '🔴', path: '/live-now', color: '#e11d48' },
  { label: 'Tribal Gardens', sub: 'All tribal seeds & orchards', emoji: '🌳', path: '/stalls-feed', color: '#0d9488' },
  // Sleeping Seeds, 2026-09-16: the proximity directory for the three
  // service kinds -- Wheels, Pillows, Hands. Open to every logged-in
  // member, not gated.
  { label: 'Sleeping Seeds', sub: 'Vehicles, stays & hands near you', emoji: '🛞', path: '/sleeping', color: '#f59e0b' },
  // Directly under Sleeping Seeds on purpose: you find other people's
  // listings there, and manage your own here. Someone who has just
  // registered a vehicle looks in the same part of the nav for it.
  { label: 'My Listings', sub: 'See, edit and pause your own', emoji: '📋', path: '/my-listings', color: '#f59e0b' },
  // Wandering Hearts now has its own stall (S2G-run, phase 1) -- points
  // there instead of /tribal-hearts for now; /tribal-hearts keeps working
  // on its own, phase 2 makes it the "Live circle" plaque's real target
  // (same pattern as Grove Station's nav entry -> its own stall).
  { label: 'Wandering Hearts', sub: 'Tribal connections', emoji: '💚', path: '/stall/wanderinghearts', color: '#dc2626' },
  { label: 'My Tribe', sub: 'Your invitation code & tribe', emoji: '🌿', path: '/my-tribe', color: '#22c55e' },
  { label: 'ChatApp', sub: 'Tribe messaging', emoji: '💬', path: '/conversations', color: '#0891b2' },
  // Grove Station now has its own stall (S2G's own radio station,
  // phase 1) -- points there instead of the /grove-station app page for
  // now; phase 2's plaques (On Air/Schedule/Shows/Advertise) are meant to
  // be the real path into /grove-station's own tabs, same as any other
  // stall's hotspots lead into that content, not this top-level nav item.
  { label: 'Grove Station', sub: 'Community radio', emoji: '📻', path: '/stall/grovestation', color: '#a78bfa' },
  { label: 'Community Videos', sub: 'Upload & watch', emoji: '🎬', path: '/community-videos', color: '#f97316' },
  { label: 'Learn & Share Marketing Videos', sub: 'Share to grow your tribe', emoji: '🎥', path: '/learn-share', color: '#f97316' },
  { label: '364yhvh', sub: 'Scripture & spiritual hub', emoji: '📅', path: '/364yhvh-days', color: '#7c3aed' },
];

/**
 * Flow v2 step 8's "More ▾" -- KEEP-but-secondary routes, reachable from
 * every nav surface but not cluttering the primary list. "Gosat's
 * Boardroom" is `gated: true`; every renderer filters it out unless the
 * viewer is admin/gosat/radio_admin rather than hiding it via a route
 * guard alone, matching "role-gated" in the nav itself.
 *
 * 2026-09-15: replaces the old direct "Gosat's" -> /admin/dashboard link
 * and the separate AdminButton dropdown (StallSideNav's header) that used
 * to fan out to the same 4 admin routes. Both are gone now -- this one
 * entry leads into the "Gosat's Boardroom" stall (S2G-run place, own
 * front/interior like Grove Station/Companions Village), whose interior
 * hotspots are the real path to those 4 routes now (Admin Dashboard &
 * Wallet Settings, AOD Station Radio Management, Treasury, Seeds
 * Management), placed by hand via the normal "Mark your shelves" editor.
 */
export const COCKPIT_NAV_MORE: CockpitNavItem[] = [
  { label: 'Books', sub: 'Business bookkeeping', emoji: '📒', path: '/books', color: '#2563eb' },
  { label: 'Whisperers', sub: 'List yourself or find one', emoji: '🌬️', path: '/whisperers', color: '#a855f7' },
  { label: 'Companions', sub: 'Helpers for hire', emoji: '🏘', path: '/stall/companions', color: '#14b8a6' },
  { label: 'Classroom', sub: 'Teach or learn a skill', emoji: '🎓', path: '/conversations', color: '#3b82f6' },
  { label: 'SkillDrop', sub: 'Quick skill shares', emoji: '💡', path: '/conversations', color: '#eab308' },
  { label: 'Premium Rooms', sub: 'Paid live rooms', emoji: '💎', path: '/premium-rooms', color: '#06b6d4' },
  { label: 'Prescriptions', sub: 'Your submitted prescriptions', emoji: '📋', path: '/my-garden/prescriptions', color: '#84cc16' },
  { label: 'Bulk directory', sub: 'Wholesale seed directory', emoji: '📦', path: '/bulk/directory', color: '#f59e0b' },
  { label: 'Settings', sub: 'Payout settings', emoji: '⚙️', path: '/settings/payouts', color: '#64748b' },
  { label: 'Disclaimer', sub: 'Platform terms and liability', emoji: '📜', path: '/disclaimer', color: '#94a3b8' },
  { label: "Gosat's Boardroom", sub: 'Elder management', emoji: '🏛', path: '/stall/gosatsboardroom', color: '#7c3aed', gated: true },
];

/**
 * Rendered above COCKPIT_NAV in the sidebar, same special styling as
 * before -- now an in-app route (Gathering Room, minimum version) instead
 * of the old external 364yhvh.org link, so it isn't part of the COCKPIT_NAV
 * array above (StallSideNav.tsx renders it as a Link, not an <a>).
 */
export const SCRIPTURE_STUDY_LINK = {
  label: 'Scripture Study',
  sub: 'all welcome',
  emoji: '📖',
  path: '/stall/scripturestudy',
};
