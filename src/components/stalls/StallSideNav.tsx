import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import { COCKPIT_NAV, COCKPIT_NAV_MORE, SCRIPTURE_STUDY_LINK, type CockpitNavItem } from '@/lib/nav/cockpitNav';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
import { useNavCounts, type NavCounts } from '@/hooks/useNavCounts';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import { BOTTOM_CHROME_PADDING_STYLE } from '@/lib/layout/bottomChrome';

/**
 * Which nav item gets which count, and where it comes from. Live Now is
 * its own case below (the live liveSeeds.length, not this map) -- reusing
 * the exact same realtime store the Live Now page itself reads is the
 * only way that badge can never disagree with the page. Wandering Hearts
 * is ALSO its own case below (two counts, not one) -- see
 * WANDERING_HEARTS_PATH.
 */
const NAV_COUNT_KEY: Record<string, keyof NavCounts> = {
  '/stalls-feed': 'tribal_gardens',
  '/sleeping': 'sleeping_seeds',
  '/my-listings': 'my_listings',
  '/my-tribe': 'my_tribe',
};

// Real (non-seed) member counts by gender, per the same
// get_nav_counts() RPC -- icon + number, never color alone, per spec.
const WANDERING_HEARTS_PATH = '/stall/wanderinghearts';

interface Props {
  /** Called on every tap, before navigating (or before the action fires) -- lets the caller close the stall interior first. */
  onNavigate: () => void;
  className?: string;
}

/**
 * The Cockpit sidebar's nav items, restyled as a compact gold-on-dark-wood
 * list for "the stall is the frame" (Farm-Stalls batch 2e) -- desktop's
 * fixed left column and mobile's slide-in drawer both render this same
 * component, just wrapped differently by StallInteriorView. Data comes
 * from src/lib/nav/cockpitNav.ts, the same config DashboardPage.jsx's own
 * sidebar and StallBookshelfNav's bookshelf variant use, so none of the
 * three can drift on labels or routes.
 */
export default function StallSideNav({ onNavigate, className = '' }: Props) {
  const { isAdminOrGosat, roles } = useRoles();
  // Gosat's Boardroom is also open to radio_admin, which isAdminOrGosat
  // doesn't cover (that flag is admin-or-gosat only) -- same 3-role check
  // the old AdminButton dropdown used before it was replaced by this nav
  // entry.
  const canSeeGated = isAdminOrGosat || roles.includes('radio_admin');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleMore = COCKPIT_NAV_MORE.filter((item) => !item.gated || canSeeGated);
  const navCounts = useNavCounts();
  // Live Now's own store, not get_nav_counts() -- see NAV_COUNT_KEY's own
  // comment for why this one is different.
  const { liveSeeds } = useTribalLiveOrchard();

  // Bug report, 2026-09-15: no logout option anywhere in the app UI -- true
  // for any member whose stall isn't published yet (EmptyPlotView has no
  // header of its own to put one in, and StallInteriorView's own hideClose
  // Log-out swap in its header only ever renders once a stall EXISTS).
  // This nav is the one component both states already share (EmptyPlotView
  // and StallInteriorView both render it, desktop column and mobile
  // drawer alike), so it's the one place a logout action reaches everyone
  // regardless of stall state.
  const handleLogout = async () => {
    onNavigate();
    try { await logout(); } catch { /* ignore -- navigate away regardless */ }
    navigate('/login');
  };

  /** Live Now: the live liveSeeds.length itself, byte-for-byte the same
   *  value LiveNowPage.tsx renders, since both read this same shared
   *  store -- never a separately-computed number that could disagree.
   *  Every other item: get_nav_counts(), or no badge at all (Wandering
   *  Hearts). null (still loading) renders no badge rather than a
   *  misleading 0. */
  const badgeFor = (item: CockpitNavItem): number | null => {
    if (item.path === '/live-now') return liveSeeds.length;
    const key = NAV_COUNT_KEY[item.path];
    if (!key) return null;
    return navCounts ? navCounts[key] : null;
  };

  const renderRow = (item: CockpitNavItem, bordered: boolean) => {
    const rowClassName = `flex items-center gap-2.5 px-3 py-2 hover:bg-amber-500/10 transition-colors ${
      bordered ? 'border-t border-amber-500/10' : ''
    }`;
    const isWanderingHearts = item.path === WANDERING_HEARTS_PATH;
    const badge = isWanderingHearts ? null : badgeFor(item);
    return (
      <Link key={item.label} to={item.path} className={rowClassName} onClick={onNavigate}>
        <span className="text-base leading-none w-5 text-center shrink-0" style={{ color: item.color }}>{item.emoji}</span>
        <span className="truncate font-serif text-[13px] text-amber-100/90 flex-1 min-w-0">{item.label}</span>
        {/* Neutral count pill, not an unread-style dot -- Live Now's own
            item.color is already red, so it naturally gets that red
            styling here too, with no special-casing needed. */}
        {badge !== null && (
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
            style={{ backgroundColor: `${item.color}22`, color: item.color }}
          >
            {badge}
          </span>
        )}
        {isWanderingHearts && navCounts && (
          <span className="shrink-0 flex items-center gap-1">
            <span className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none" style={{ backgroundColor: '#93c5fd22', color: '#93c5fd' }}>
              ♂ {navCounts.wandering_hearts_male}
            </span>
            <span className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none" style={{ backgroundColor: '#f9a8d422', color: '#f9a8d4' }}>
              ♀ {navCounts.wandering_hearts_female}
            </span>
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className={`bg-[#140c06] ${className}`}>
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <img src="/s2g-logo.webp" alt="" className="h-7 w-7 object-contain shrink-0" />
        <span className="flex-1 truncate font-serif text-sm font-semibold text-amber-100">sow2grow</span>
        {/* Bug report, 2026-09-15: no logout option anywhere in the app UI.
            Lives in the header row, not at the bottom of this column --
            StallInteriorView/DashboardPage's own bottomBar renders as a
            page-level `fixed inset-x-0 bottom-0 z-[500]` bar (its own
            Plant-Seed/Go-Live/Chat row) that spans the FULL viewport
            width, including over this column's bottom edge -- confirmed
            live: a bottom-anchored button here was visible but its clicks
            were silently swallowed by that bar sitting on top of it. The
            header has no such overlap. */}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
          className="shrink-0 flex items-center justify-center rounded-full p-1.5 text-rose-300 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Farm-Stalls feed/interior (StallsFeedPage, StallVisitPage) had no
          way back to the Cockpit at all -- this is that way back, first
          thing in the nav so it's never missed. Same row shape as the
          COCKPIT_NAV items below, styled more prominently gold since it's
          the one "leave the stall" action here. */}
      <Link
        to="/cockpit"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-3 py-2.5 border-b border-amber-500/15 hover:bg-amber-500/10 transition-colors"
      >
        <span className="text-base leading-none w-5 text-center shrink-0 text-amber-400">🏠</span>
        <span className="truncate font-serif text-[13px] font-semibold text-amber-300">My Stall / Cockpit</span>
      </Link>

      <Link
        to={SCRIPTURE_STUDY_LINK.path}
        onClick={onNavigate}
        className="flex items-center gap-2 mx-3 mt-3 mb-1 px-2.5 py-2 rounded-md border border-amber-500/25 bg-amber-500/10 text-amber-300 text-xs font-serif hover:bg-amber-500/15 transition-colors"
        title={SCRIPTURE_STUDY_LINK.sub}
      >
        <span>{SCRIPTURE_STUDY_LINK.emoji}</span>
        <span className="truncate">{SCRIPTURE_STUDY_LINK.label}</span>
      </Link>

      {/* Was a hardcoded pb-24 (2026-09-15): the last item(s) here scrolled
          to a position still covered by the fixed bottom bar, which this
          component has no direct knowledge of. A fixed guess is only ever
          correct for one bar height and leaves either a trapped row or a
          dead empty gap for every other state (bar absent, radio pill
          changing the bar's real height) -- converted onto the same
          measured mechanism the Cockpit right panel now uses
          (src/lib/layout/bottomChrome.ts), which shrinks to exactly 0 on
          a page/context that renders this nav with no bar at all. */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-1" style={BOTTOM_CHROME_PADDING_STYLE}>
        {COCKPIT_NAV.map((item, i) => renderRow(item, i > 0))}

        {/* Flow v2 step 8: everything KEEP-but-secondary lives behind this
            toggle instead of cluttering the primary list above. */}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 px-3 py-2 border-t border-amber-500/10 hover:bg-amber-500/10 transition-colors"
        >
          {moreOpen ? <ChevronUp className="h-4 w-4 text-amber-300 shrink-0" /> : <ChevronDown className="h-4 w-4 text-amber-300 shrink-0" />}
          <span className="truncate font-serif text-[13px] font-semibold text-amber-300">More</span>
        </button>
        {moreOpen && visibleMore.map((item) => renderRow(item, true))}
      </nav>
    </div>
  );
}
