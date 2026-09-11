import { useNavigate } from 'react-router-dom';
import { COCKPIT_NAV } from '@/lib/nav/cockpitNav';

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
 * COCKPIT_NAV data source (and the same `action:let-it-rain` handling) as
 * StallSideNav, so the two can't drift on items or routes.
 */
export default function StallBookshelfNav({ onNavigate, className = '' }: Props) {
  const navigate = useNavigate();

  const handleTap = (path: string) => {
    const action = path.startsWith('action:') ? path.split(':')[1] : null;
    if (action === 'let-it-rain') {
      window.dispatchEvent(new Event('s2g-open-let-it-rain'));
    } else {
      navigate(path);
    }
    onNavigate();
  };

  return (
    <div className={`bg-[#0d0805] ${className}`}>
      <div className="flex items-end gap-2 overflow-x-auto px-4 pt-4 pb-0 snap-x snap-proximity [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {COCKPIT_NAV.map((item, i) => (
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
      </div>
      {/* Wooden shelf strip the spines stand on */}
      <div className="h-3 mx-4 rounded-sm bg-gradient-to-b from-[#4a2f1a] to-[#2a1810] shadow-[0_4px_10px_rgba(0,0,0,0.55)]" />
    </div>
  );
}
