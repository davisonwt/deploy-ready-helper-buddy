import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { COCKPIT_NAV, COCKPIT_NAV_MORE, type CockpitNavItem } from '@/lib/nav/cockpitNav';
import InviteButton from '@/components/invite/InviteButton';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
import { useNavCounts, type NavCounts } from '@/hooks/useNavCounts';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';

/** Same mapping as StallSideNav.tsx -- see that file's own comment for why
 *  Live Now, Wandering Hearts and ChatApp aren't in this map (each is its
 *  own special case below). */
const NAV_COUNT_KEY: Record<string, keyof NavCounts> = {
  '/stalls-feed': 'tribal_gardens',
  '/sleeping': 'sleeping_seeds',
  '/my-listings': 'my_listings',
  '/my-tribe': 'my_tribe',
};

const WANDERING_HEARTS_PATH = '/stall/wanderinghearts';
// Classroom and SkillDrop (COCKPIT_NAV_MORE) share this same /conversations
// path for their own reasons -- keyed on the label, not the path, so only
// the actual ChatApp row gets the unread pill.
const CHAT_APP_LABEL = 'ChatApp';

interface Props {
  /** Called on every tap, before navigating (or before the action fires). */
  onNavigate: () => void;
  className?: string;
}

/** 5-6 alternating leather/wood tones for the spines -- same data-driven approach as StallSideNav (one entry per COCKPIT_NAV item), just standing on a shelf instead of listed vertically. */
const SPINE_TONES = [
  'from-[#4a2f1a] to-[#2f1c0f]',
  'from-[#5c3a21] to-[#3a2414]',
  'from-[#3f2c1c] to-[#241811]',
  'from-[#6b4226] to-[#432a17]',
  'from-[#33261a] to-[#1c130d]',
  'from-[#553a22] to-[#372414]',
];

/**
 * Mobile-portrait stall interior nav (<1024px, portrait): a horizontal
 * snap-scroll row of book-spine buttons standing on a wooden shelf strip,
 * replacing the slide-in StallSideNav drawer for this layout. Same
 * COCKPIT_NAV data source as StallSideNav, so the two can't drift on
 * items or routes.
 *
 * Flow v2 step 8: COCKPIT_NAV_MORE's secondary items stand as additional
 * spines on the same shelf, revealed by a "More" spine at the end
 * (tapping it toggles them in place, the bookshelf's own take on a
 * "More ▾" disclosure) rather than a dropdown, which doesn't fit the
 * shelf metaphor.
 */
export default function StallBookshelfNav({ onNavigate, className = '' }: Props) {
  const navigate = useNavigate();
  const { isAdminOrGosat, roles } = useRoles();
  // Gosat's Boardroom is also open to radio_admin, which isAdminOrGosat
  // alone doesn't cover -- same 3-role check StallSideNav uses.
  const canSeeGated = isAdminOrGosat || roles.includes('radio_admin');
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleMore = COCKPIT_NAV_MORE.filter((item) => !item.gated || canSeeGated);
  const spines: CockpitNavItem[] = moreOpen ? [...COCKPIT_NAV, ...visibleMore] : COCKPIT_NAV;
  const navCounts = useNavCounts();
  const { user } = useAuth();
  // Same singleton hook as the Cockpit bottom-bar pill and the
  // conversations list (useUnreadMessageCounts, commit 4eb22a9c) -- one
  // source, so this can never disagree with either.
  const { totalUnread } = useUnreadMessageCounts(user?.id);
  const { liveSeeds } = useTribalLiveOrchard();

  const badgeFor = (item: CockpitNavItem): number | null => {
    if (item.path === '/live-now') return liveSeeds.length;
    const key = NAV_COUNT_KEY[item.path];
    if (!key) return null;
    return navCounts ? navCounts[key] : null;
  };

  const handleTap = (path: string) => {
    navigate(path);
    onNavigate();
  };

  return (
    <div className={`bg-[#0d0805] ${className}`}>
      <div className="flex items-end gap-2 overflow-x-auto px-4 pt-4 pb-0 snap-x snap-proximity [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* First on the shelf so a phone sees it without scrolling. An
            action, not a route, so it is not part of COCKPIT_NAV. */}
        <InviteButton
          hideIcon
          className="relative snap-start shrink-0 w-12 h-40 rounded-t-md border border-emerald-400/40 bg-gradient-to-b from-emerald-800 to-emerald-950 shadow-[0_2px_6px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between py-3 active:scale-95 transition-transform"
        >
          <span className="text-base" aria-hidden>🤝</span>
          <span
            className="font-serif text-[11px] font-semibold text-emerald-100 tracking-wide whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            Invite people
          </span>
        </InviteButton>
        {spines.map((item, i) => {
          const isWanderingHearts = item.path === WANDERING_HEARTS_PATH;
          const isChatApp = item.label === CHAT_APP_LABEL;
          const badge = (isWanderingHearts || isChatApp) ? null : badgeFor(item);
          return (
          <button
            key={item.path}
            type="button"
            onClick={() => handleTap(item.path)}
            aria-label={item.label}
            className={`relative snap-start shrink-0 w-12 h-40 rounded-t-md border border-black/40 bg-gradient-to-b ${SPINE_TONES[i % SPINE_TONES.length]} shadow-[0_2px_6px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between py-3 active:scale-95 transition-transform`}
          >
            {badge !== null && (
              <span
                className="absolute -top-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none border border-black/40"
                style={{ backgroundColor: `${item.color}dd`, color: '#fff' }}
              >
                {badge}
              </span>
            )}
            {isChatApp && totalUnread > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none border border-black/40"
                style={{ backgroundColor: '#ef4444dd', color: '#fff' }}
              >
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
            {/* Kept side-by-side here, unlike StallSideNav's stacked pair --
                this overlay sits on a -top-1.5 negative offset above a w-12
                (48px) spine, borrowing from the shelf's own pt-4 padding.
                Stacking two rows needs more vertical room than that padding
                gives before colliding with whatever sits above the shelf;
                side-by-side already fits cleanly at this width. */}
            {isWanderingHearts && navCounts && (
              <span className="absolute -top-1.5 left-0 right-0 flex items-center justify-center gap-0.5">
                <span className="rounded-full px-1 py-0.5 text-[8px] font-bold leading-none border border-black/40" style={{ backgroundColor: '#93c5fddd', color: '#1e1b4b' }}>
                  ♂{navCounts.wandering_hearts_male}
                </span>
                <span className="rounded-full px-1 py-0.5 text-[8px] font-bold leading-none border border-black/40" style={{ backgroundColor: '#f9a8d4dd', color: '#500724' }}>
                  ♀{navCounts.wandering_hearts_female}
                </span>
              </span>
            )}
            <span className="text-base" aria-hidden>{item.emoji}</span>
            <span
              className="font-serif text-[11px] font-semibold text-amber-200/90 tracking-wide whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              {item.label}
            </span>
          </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-label={moreOpen ? 'Show fewer' : 'More'}
          className="snap-start shrink-0 w-12 h-40 rounded-t-md border border-amber-500/30 bg-gradient-to-b from-amber-900/60 to-amber-950/60 shadow-[0_2px_6px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between py-3 active:scale-95 transition-transform"
        >
          <ChevronDown className={`h-4 w-4 text-amber-300 transition-transform ${moreOpen ? 'rotate-180' : ''}`} aria-hidden />
          <span
            className="font-serif text-[11px] font-semibold text-amber-300 tracking-wide whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            More
          </span>
        </button>
      </div>
      {/* Wooden shelf strip the spines stand on */}
      <div className="h-3 mx-4 rounded-sm bg-gradient-to-b from-[#4a2f1a] to-[#2a1810] shadow-[0_4px_10px_rgba(0,0,0,0.55)]" />
    </div>
  );
}
