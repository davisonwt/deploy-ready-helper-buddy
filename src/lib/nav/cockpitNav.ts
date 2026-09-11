// Single source of truth for the Cockpit sidebar's nav items -- shared by
// DashboardPage.jsx's own sidebar and the Farm-Stalls interior's nav panel/
// drawer (batch 2e) so the two never drift on labels or route strings.
// `path` is a real in-app route, except 'action:<name>' which a renderer
// intercepts instead of navigating (today just 'action:let-it-rain', which
// opens LetItRainPanel -- see the `s2g-open-let-it-rain` window event both
// DashboardPage.jsx and Layout.jsx listen for).

export interface CockpitNavItem {
  label: string;
  sub: string;
  emoji: string;
  path: string;
  color: string;
}

export const COCKPIT_NAV: CockpitNavItem[] = [
  { label: 'SeedFlow', sub: 'Community updates', emoji: '🏠', path: '/dashboard', color: '#38bdf8' },
  { label: 'My Garden', sub: 'Your seeds & orchards', emoji: '🌱', path: '/my-orchards', color: '#facc15' },
  { label: 'Books', sub: 'Business bookkeeping', emoji: '📒', path: '/books', color: '#2563eb' },
  { label: 'Tribal Gardens', sub: 'All tribal seeds & orchards', emoji: '🌳', path: '/browse-orchards', color: '#0d9488' },
  { label: 'Community Videos', sub: 'Upload & watch', emoji: '🎬', path: '/community-videos', color: '#f97316' },
  { label: 'ChatApp', sub: 'Tribe messaging', emoji: '💬', path: '/communications-hub', color: '#0891b2' },
  { label: '364yhvh', sub: 'Scripture & spiritual hub', emoji: '📅', path: '/364yhvh-days', color: '#7c3aed' },
  { label: 'Let It Rain', sub: 'Bestow blessings', emoji: '🌧', path: 'action:let-it-rain', color: '#ec4899' },
  { label: 'Learn & Share Marketing Videos', sub: 'Share to grow your tribe', emoji: '🎥', path: '/learn-share', color: '#f97316' },
  { label: 'Whisperers', sub: 'List yourself or find one', emoji: '🌬️', path: '/whisperers', color: '#a855f7' },
  { label: 'Wandering Hearts', sub: 'Tribal connections', emoji: '💚', path: '/tribal-hearts', color: '#dc2626' },
  { label: 'My Tribe', sub: 'Your invitation code & tribe', emoji: '🌿', path: '/my-tribe', color: '#22c55e' },
  { label: "Gosat's", sub: 'Elder management', emoji: '🏛', path: '/admin/dashboard', color: '#7c3aed' },
];

/** Rendered above COCKPIT_NAV in the sidebar -- an external link, not an in-app route, so it isn't part of the array above. */
export const SCRIPTURE_STUDY_LINK = {
  label: 'Scripture Study',
  sub: '364yhvh.org',
  emoji: '📖',
  href: 'https://364yhvh.org',
};
