import { useEffect, useState } from 'react';
import { Radio, Square } from 'lucide-react';
import { getRadioState, subscribeRadio, stopRadio, type RadioState } from '@/lib/media/radioPlayback';

/**
 * Mounted once, above <Routes> (AppRoutes.tsx), next to
 * GlobalLiveSessionOverlay -- so it's never unmounted by in-app
 * navigation. Renders nothing while the radio is off. While it's on,
 * renders a small fixed pill with just a stop control, on every page --
 * so a member is never stuck with sound they can't find the source of,
 * even several navigations away from the Cockpit control that started it.
 * No volume/now-playing clutter here on purpose; that lives on the
 * Cockpit's own RadioBanner.
 */
export default function GlobalRadioPlayer() {
  const [state, setState] = useState<RadioState>(getRadioState());

  useEffect(() => subscribeRadio(() => setState(getRadioState())), []);

  if (!state.isPlaying) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9000] flex items-center gap-2 rounded-full border border-amber-500/30 bg-[#140c06]/95 px-3 py-2 text-amber-100 shadow-lg backdrop-blur">
      <Radio className="h-4 w-4 text-amber-300 animate-pulse" />
      <button
        type="button"
        onClick={stopRadio}
        aria-label="Stop Grove Station Radio"
        title="Stop Grove Station Radio"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 hover:bg-amber-500/30"
      >
        <Square className="h-3 w-3" />
      </button>
    </div>
  );
}
