import { useEffect, useState } from 'react';
import { Radio, Play, Square } from 'lucide-react';
import { getRadioState, subscribeRadio, startRadio, stopRadio, type RadioState } from '@/lib/media/radioPlayback';

/**
 * The Cockpit's own radio control -- a deliberate home in the dashboard's
 * existing topBanner chrome (same fixed top bar SettlementConsentBanner
 * already uses), not a floating button everywhere. Reflects the shared
 * radioPlayback store, so it shows correctly even if the radio was
 * started earlier and the member has since navigated back here.
 */
export default function RadioBanner() {
  const [state, setState] = useState<RadioState>(getRadioState());

  useEffect(() => subscribeRadio(() => setState(getRadioState())), []);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-[#140c06]/90 px-3 py-2 text-amber-100">
      <Radio className={`h-4 w-4 shrink-0 text-amber-300 ${state.isPlaying ? 'animate-pulse' : ''}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold uppercase tracking-wide text-amber-200">Grove Station Radio</div>
        {state.isPlaying && (
          <div className="truncate text-[11px] text-amber-100/70">{state.nowPlaying}</div>
        )}
      </div>
      <button
        type="button"
        onClick={state.isPlaying ? stopRadio : startRadio}
        aria-label={state.isPlaying ? 'Stop the radio' : 'Play the radio'}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          state.isPlaying ? 'bg-amber-500/20 hover:bg-amber-500/30' : 'bg-amber-500 text-amber-950 hover:bg-amber-400'
        }`}
      >
        {state.isPlaying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
