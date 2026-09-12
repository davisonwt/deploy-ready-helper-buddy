import { Link } from 'react-router-dom';
import { COCKPIT_NAV, SCRIPTURE_STUDY_LINK } from '@/lib/nav/cockpitNav';

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
 * sidebar uses, so the two can't drift on labels or routes.
 */
export default function StallSideNav({ onNavigate, className = '' }: Props) {
  const handleAction = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const action = path.split(':')[1];
    if (action === 'let-it-rain') {
      window.dispatchEvent(new Event('s2g-open-let-it-rain'));
    }
    onNavigate();
  };

  return (
    <div className={`bg-[#140c06] ${className}`}>
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

      <a
        href={SCRIPTURE_STUDY_LINK.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 mx-3 mt-3 mb-1 px-2.5 py-2 rounded-md border border-amber-500/25 bg-amber-500/10 text-amber-300 text-xs font-serif hover:bg-amber-500/15 transition-colors"
        title={`Open ${SCRIPTURE_STUDY_LINK.sub} in a new tab`}
      >
        <span>{SCRIPTURE_STUDY_LINK.emoji}</span>
        <span className="truncate">{SCRIPTURE_STUDY_LINK.label}</span>
      </a>

      <nav className="flex-1 min-h-0 overflow-y-auto py-1">
        {COCKPIT_NAV.map((item, i) => {
          const isAction = item.path.startsWith('action:');
          const content = (
            <>
              <span className="text-base leading-none w-5 text-center shrink-0" style={{ color: item.color }}>{item.emoji}</span>
              <span className="truncate font-serif text-[13px] text-amber-100/90">{item.label}</span>
            </>
          );
          const rowClassName = `flex items-center gap-2.5 px-3 py-2 hover:bg-amber-500/10 transition-colors ${
            i > 0 ? 'border-t border-amber-500/10' : ''
          }`;
          return isAction ? (
            <a key={item.label} href="#" className={rowClassName} onClick={handleAction(item.path)}>
              {content}
            </a>
          ) : (
            <Link key={item.label} to={item.path} className={rowClassName} onClick={onNavigate}>
              {content}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
