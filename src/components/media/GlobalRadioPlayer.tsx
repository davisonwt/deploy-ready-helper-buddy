import { useEffect, useState } from 'react';
import { Radio, Square } from 'lucide-react';
import { getRadioState, subscribeRadio, stopRadio, type RadioState } from '@/lib/media/radioPlayback';
import NowPlayingSheet from '@/components/radio/NowPlayingSheet';
import { useBottomChromeElement } from '@/lib/layout/bottomChrome';

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
  // Registers this pill's own real height into --bottom-chrome-h
  // (src/lib/layout/bottomChrome.ts) on every page it floats over --
  // including ones with no bottom bar of their own -- and unregisters
  // the instant radio stops, so a scroll container that padded for it
  // shrinks back down with no dead gap left behind. Lives on the outer
  // wrapper (not either inner button) so the measured intrusion matches
  // the pill's real visual footprint including its own padding/border.
  const pillRef = useBottomChromeElement<HTMLDivElement>('global-radio-pill', state.isPlaying);

  useEffect(() => subscribeRadio(() => setState(getRadioState())), []);

  if (!state.isPlaying) return null;

  return (
    <>
      {/* Bug, live 2026-09-20: the Stop control used to be a
          `role="button"` span NESTED INSIDE this pill's own outer
          `<button>` -- invalid HTML (a button can't contain interactive
          content) and unreliable to hit-test as a result. Reproduced
          live: tapping the pill to open NowPlayingSheet also fired the
          nested Stop handler and killed playback on the same tap.
          Fixed by making the two controls siblings under a plain,
          non-interactive div -- each its own real, unambiguous
          `<button>`. */}
      <div
        ref={pillRef}
        // z-[9000] used to sit UNDER StallInteriorView's own root
        // (z-[9999] -- the Cockpit is a StallInteriorView), making the
        // pill visually present but unreachable on the exact page its own
        // Radio button lives on. 10010 clears that, while staying below
        // NowPlayingSheet's own overlay (z-[10020]/[10021]) so opening the
        // sheet correctly covers the pill instead of floating over it.
        className="fixed bottom-4 right-4 z-[10010] flex items-center gap-2 rounded-full border border-amber-500/30 bg-[#140c06]/95 px-3 py-2 text-amber-100 shadow-lg backdrop-blur"
      >
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={state.reconnecting ? 'Grove Station reconnecting' : "What's playing on Grove Station"}
          className="flex items-center gap-2"
        >
          <Radio className={`h-4 w-4 text-amber-300 ${state.reconnecting ? 'animate-spin' : 'animate-pulse'}`} />
          {state.reconnecting && <span className="text-xs text-amber-200">Reconnecting…</span>}
        </button>
        <button
          type="button"
          onClick={() => stopRadio()}
          aria-label="Stop Grove Station Radio"
          title="Stop Grove Station Radio"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 hover:bg-amber-500/30"
        >
          <Square className="h-3 w-3" />
        </button>
      </div>
      {sheetOpen && <NowPlayingSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}
