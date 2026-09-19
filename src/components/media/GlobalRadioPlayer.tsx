import { useEffect, useState } from 'react';
import { Radio, Square } from 'lucide-react';
import { getRadioState, subscribeRadio, stopRadio, type RadioState } from '@/lib/media/radioPlayback';
import NowPlayingSheet from '@/components/radio/NowPlayingSheet';

/**
 * Mounted once, above <Routes> (AppRoutes.tsx), next to
 * GlobalLiveSessionOverlay -- so it's never unmounted by in-app
 * navigation. Renders nothing while the radio is off. While it's on,
 * renders a small fixed pill with a stop control, on every page --
 * so a member is never stuck with sound they can't find the source of,
 * even several navigations away from the Cockpit control that started it.
 * Tapping the pill itself (not the Stop button) opens NowPlayingSheet --
 * the discovery surface (gift/bestow/chat) for whatever is live right
 * now, reachable from anywhere, same reasoning the stop control already
 * follows. The Cockpit's own bottom-bar radio button
 * (CockpitRadioButton.tsx) is untouched by this.
 */
export default function GlobalRadioPlayer() {
  const [state, setState] = useState<RadioState>(getRadioState());
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => subscribeRadio(() => setState(getRadioState())), []);

  if (!state.isPlaying) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label="What's playing on Grove Station"
        // z-[9000] used to sit UNDER StallInteriorView's own root
        // (z-[9999] -- the Cockpit is a StallInteriorView), making the
        // pill visually present but unreachable on the exact page its own
        // Radio button lives on. 10010 clears that, while staying below
        // NowPlayingSheet's own overlay (z-[10020]/[10021]) so opening the
        // sheet correctly covers the pill instead of floating over it.
        className="fixed bottom-4 right-4 z-[10010] flex items-center gap-2 rounded-full border border-amber-500/30 bg-[#140c06]/95 px-3 py-2 text-amber-100 shadow-lg backdrop-blur"
      >
        <Radio className="h-4 w-4 text-amber-300 animate-pulse" />
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); stopRadio(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); stopRadio(); } }}
          aria-label="Stop Grove Station Radio"
          title="Stop Grove Station Radio"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 hover:bg-amber-500/30"
        >
          <Square className="h-3 w-3" />
        </span>
      </button>
      {sheetOpen && <NowPlayingSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}
