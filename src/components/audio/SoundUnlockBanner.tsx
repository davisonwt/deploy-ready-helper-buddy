import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// A small, dismissible pill prompting users to enable sound once per
// session. This helps iOS users receive ringtones without tapping at call
// time. Bottom-right and compact by design -- the previous version was a
// fixed, near-full-width bar centered at the bottom of the viewport, which
// sat on top of login forms and the chat input bar.

interface WindowWithAudioUnlock extends Window {
  webkitAudioContext?: typeof AudioContext;
  __unlockedAudioCtx?: AudioContext;
  __unlockedOsc?: OscillatorNode;
  __unlockedGain?: GainNode;
}

const DISMISSED_KEY = 'soundBannerDismissed';
const UNLOCKED_KEY = 'audioUnlocked';

const SoundUnlockBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const shouldShow = useMemo(() => {
    try {
      return sessionStorage.getItem(UNLOCKED_KEY) !== '1' && sessionStorage.getItem(DISMISSED_KEY) !== '1';
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    setVisible(shouldShow);
  }, [shouldShow]);

  const dismiss = useCallback(() => {
    try { sessionStorage.setItem(DISMISSED_KEY, '1'); } catch { /* storage might be disabled */ }
    setVisible(false);
  }, []);

  const enableSound = useCallback(async () => {
    setUnlocking(true);
    try {
      const w = window as WindowWithAudioUnlock;
      const AudioContextConstructor: typeof AudioContext | undefined = window.AudioContext || w.webkitAudioContext;
      if (!AudioContextConstructor) return;

      let ctx: AudioContext | null = w.__unlockedAudioCtx || null;
      if (!ctx) {
        ctx = new AudioContextConstructor();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001; // effectively silent
        osc.connect(gain).connect(ctx.destination);
        try { await ctx.resume(); } catch (e) { /* resume may fail silently on some browsers */ }
        try { osc.start(); } catch (e) { /* oscillator may already be started or blocked */ }
        w.__unlockedAudioCtx = ctx;
        w.__unlockedOsc = osc;
        w.__unlockedGain = gain;
        const onVisible = async () => {
          if (document.visibilityState === 'visible') {
            try { await ctx!.resume(); } catch (e) { /* ignore resume errors */ }
          }
        };
        document.addEventListener('visibilitychange', onVisible);
      } else {
        try { await ctx.resume(); } catch (e) { /* ignore resume errors */ }
      }

      try { sessionStorage.setItem(UNLOCKED_KEY, '1'); } catch { /* storage might be disabled */ }
      setVisible(false);
    } finally {
      setUnlocking(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Enable sound"
      className={cn(
        'fixed bottom-4 right-4 z-[110] max-w-[calc(100vw-2rem)]',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border shadow-lg backdrop-blur',
          'supports-[backdrop-filter]:bg-background/85 bg-background text-foreground',
          'pl-3 pr-1.5 py-1.5',
        )}
      >
        <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Button
          size="sm"
          variant="ghost"
          onClick={enableSound}
          disabled={unlocking}
          className="h-7 px-2 text-xs font-medium"
        >
          {unlocking ? 'Enabling…' : 'Enable sound'}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={dismiss}
          aria-label="Dismiss"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default SoundUnlockBanner;
