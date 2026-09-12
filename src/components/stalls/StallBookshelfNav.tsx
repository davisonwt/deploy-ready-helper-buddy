import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { COCKPIT_NAV, COCKPIT_NAV_MORE, type CockpitNavItem } from '@/lib/nav/cockpitNav';
import { useRoles } from '@/hooks/useRoles';

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
  const { isAdminOrGosat } = useRoles();
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleMore = COCKPIT_NAV_MORE.filter((item) => !item.gated || isAdminOrGosat);
  const spines: CockpitNavItem[] = moreOpen ? [...COCKPIT_NAV, ...visibleMore] : COCKPIT_NAV;

  const handleTap = (path: string) => {
    navigate(path);
    onNavigate();
  };

  return (
    <div className={`bg-[#0d0805] ${className}`}>
      <div className="flex items-end gap-2 overflow-x-auto px-4 pt-4 pb-0 snap-x snap-proximity [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {spines.map((item, i) => (
          <button
            key={item.path}
            type="button"
            onClick={() => handleTap(item.path)}
            aria-label={item.label}
            className={`snap-start shrink-0 w-12 h-40 rounded-t-md border border-black/40 bg-gradient-to-b ${SPINE_TONES[i % SPINE_TONES.length]} shadow-[0_2px_6px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between py-3 active:scale-95 transition-transform`}
          >
            <span className="text-base" aria-hidden>{item.emoji}</span>
            <span
              className="font-serif text-[11px] font-semibold text-amber-200/90 tracking-wide whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              {item.label}
            </span>
          </button>
        ))}
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
