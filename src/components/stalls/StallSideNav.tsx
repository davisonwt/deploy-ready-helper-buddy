import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import { COCKPIT_NAV, COCKPIT_NAV_MORE, SCRIPTURE_STUDY_LINK, type CockpitNavItem } from '@/lib/nav/cockpitNav';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';

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

  const renderRow = (item: CockpitNavItem, bordered: boolean) => {
    const rowClassName = `flex items-center gap-2.5 px-3 py-2 hover:bg-amber-500/10 transition-colors ${
      bordered ? 'border-t border-amber-500/10' : ''
    }`;
    return (
      <Link key={item.label} to={item.path} className={rowClassName} onClick={onNavigate}>
        <span className="text-base leading-none w-5 text-center shrink-0" style={{ color: item.color }}>{item.emoji}</span>
        <span className="truncate font-serif text-[13px] text-amber-100/90">{item.label}</span>
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

      {/* pb-24: reported live, 2026-09-15 -- on a short-enough viewport,
          the last item(s) here (the "More" toggle, or a COCKPIT_NAV_MORE
          item once expanded) scroll to a position that's still physically
          covered by DashboardPage/StallInteriorView's own bottomBar (the
          Plant-Seed/Go-Live/Chat row), a page-level `fixed inset-x-0
          bottom-0 z-[500]` bar this component has no direct knowledge of --
          same bug class the header Log-out button hit earlier today, just
          here it's "the scroll boundary doesn't clear the bar" rather than
          "a fixed item sits under it." Confirmed live: that bar's own
          subtree intercepts pointer events on a button "scrolled into
          view" but still visually underneath it. Bottom padding here gives
          the last item room to clear it regardless of the bar's exact
          height, at the cost of some empty space at the end of the list on
          pages/contexts that render this nav without that bar -- a minor
          cosmetic tradeoff against a genuinely unreachable nav item. */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-1 pb-24">
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
