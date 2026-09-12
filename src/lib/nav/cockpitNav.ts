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
  /** Flow v2 step 8: only ever shown to a viewer with the admin or gosat role (COCKPIT_NAV_MORE's "Gosat's" entry) -- every renderer must filter this out itself, cockpitNav.ts has no access to the viewer's own role. */
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
  { label: 'Tribal Gardens', sub: 'All tribal seeds & orchards', emoji: '🌳', path: '/stalls-feed', color: '#0d9488' },
  { label: 'Wandering Hearts', sub: 'Tribal connections', emoji: '💚', path: '/tribal-hearts', color: '#dc2626' },
  { label: 'My Tribe', sub: 'Your invitation code & tribe', emoji: '🌿', path: '/my-tribe', color: '#22c55e' },
  { label: 'ChatApp', sub: 'Tribe messaging', emoji: '💬', path: '/chatapp', color: '#0891b2' },
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
 * every nav surface but not cluttering the primary list. "Gosat's" is
 * `gated: true`; every renderer filters it out unless the viewer is
 * admin/gosat (`useRoles().isAdminOrGosat`) rather than hiding it via a
 * route guard alone, matching "role-gated" in the nav itself.
 */
export const COCKPIT_NAV_MORE: CockpitNavItem[] = [
  { label: 'Books', sub: 'Business bookkeeping', emoji: '📒', path: '/books', color: '#2563eb' },
  { label: 'Whisperers', sub: 'List yourself or find one', emoji: '🌬️', path: '/whisperers', color: '#a855f7' },
  { label: 'Companions', sub: 'Orchard companions', emoji: '🤝', path: '/companions', color: '#14b8a6' },
  { label: 'Classroom', sub: 'Teach or learn a skill', emoji: '🎓', path: '/classroom', color: '#3b82f6' },
  { label: 'SkillDrop', sub: 'Quick skill shares', emoji: '💡', path: '/skilldrop', color: '#eab308' },
  { label: 'Premium Rooms', sub: 'Paid live rooms', emoji: '💎', path: '/premium-rooms', color: '#06b6d4' },
  { label: 'Prescriptions', sub: 'Your submitted prescriptions', emoji: '📋', path: '/my-garden/prescriptions', color: '#84cc16' },
  { label: 'Bulk directory', sub: 'Wholesale seed directory', emoji: '📦', path: '/bulk/directory', color: '#f59e0b' },
  { label: 'Settings', sub: 'Payout settings', emoji: '⚙️', path: '/settings/payouts', color: '#64748b' },
  { label: "Gosat's", sub: 'Elder management', emoji: '🏛', path: '/admin/dashboard', color: '#7c3aed', gated: true },
];

/** Rendered above COCKPIT_NAV in the sidebar -- an external link, not an in-app route, so it isn't part of the array above. */
export const SCRIPTURE_STUDY_LINK = {
  label: 'Scripture Study',
  sub: '364yhvh.org',
  emoji: '📖',
  href: 'https://364yhvh.org',
};
