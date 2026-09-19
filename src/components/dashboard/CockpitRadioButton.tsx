import { useEffect, useState } from 'react';
import LivingButton from '@/components/LivingButton';
import { getRadioState, subscribeRadio, startRadio, stopRadio, type RadioState } from '@/lib/media/radioPlayback';

/**
 * The Cockpit's radio control -- the fourth bottom-bar button, alongside
 * Plant Seed/Go Live/Global Chat (DashboardPage.tsx). Moved out of the
 * topBanner slot (RadioBanner.tsx, since deleted) 2026-09-19: that bar sat
 * across the top of the Cockpit, covering the sow2grow logo, Edit stall
 * and the wallet. `variant="play"` is LivingButton's own play/live-bars
 * animation, driven by `isPlaying` -- the same visual language as the
 * other three buttons, not a new one. Reflects the shared radioPlayback
 * store, so it shows correctly even if the radio was started earlier and
 * the member has since navigated back here. The persistent floating stop
 * pill on other pages (GlobalRadioPlayer.tsx) is untouched.
 */
export default function CockpitRadioButton() {
  const [state, setState] = useState<RadioState>(getRadioState());

  useEffect(() => subscribeRadio(() => setState(getRadioState())), []);

  return (
    <LivingButton
      variant="play"
      isPlaying={state.isPlaying}
      onClick={state.isPlaying ? stopRadio : startRadio}
      height={50}
      borderRadius={14}
      fontSize={12}
      letterSpacing="1px"
    >
      📻 {state.reconnecting ? 'Reconnecting…' : state.isPlaying ? 'Stop' : 'Radio'}
    </LivingButton>
  );
}
