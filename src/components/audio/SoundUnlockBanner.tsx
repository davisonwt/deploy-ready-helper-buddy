import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// A persistent, minimal banner prompting users to enable sound once per session
// This helps iOS users receive ringtones without tapping at call time.
const SoundUnlockBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const isUnlocked = useMemo(() => {
    try { return sessionStorage.getItem('audioUnlocked') === '1'; } catch { return false; }
  }, []);

  useEffect(() => {
    setVisible(!isUnlocked);
  }, [isUnlocked]);

  const enableSound = useCallback(async () => {
    setUnlocking(true);
    try {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      let ctx: AudioContext | null = (window as any).__unlockedAudioCtx || null;
      if (!ctx) {
        ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001; // effectively silent
        osc.connect(gain).connect(ctx.destination);
        try { await ctx.resume(); } catch {}
        try { osc.start(); } catch {}
        ;(window as any).__unlockedAudioCtx = ctx;
        ;(window as any).__unlockedOsc = osc;
        ;(window as any).__unlockedGain = gain;
        const onVisible = async () => {
          if (document.visibilityState === 'visible') {
            try { await ctx!.resume(); } catch {}
          }
        };
        document.addEventListener('visibilitychange', onVisible);
      } else {
        try { await ctx.resume(); } catch {}
      }

      try { sessionStorage.setItem('audioUnlocked', '1'); } catch {}
      setVisible(false);
    } finally {
      setUnlocking(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Enable sound banner"
      className={cn(
        'fixed bottom-3 left-1/2 -translate-x-1/2 z-[110] max-w-[92vw] sm:max-w-md w-full',
        'px-3'
      )}
    >
      <div
        className={cn(
          'w-full rounded-xl border shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80',
          'bg-background text-foreground'
        )}
      >
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-medium">Enable ringtone</div>
            <div className="text-muted-foreground text-xs">
              Tap once to allow your device to play incoming call sounds automatically.
            </div>
          </div>
          <Button size="sm" onClick={enableSound} disabled={unlocking}>
            {unlocking ? 'Enabling…' : 'Enable sound'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SoundUnlockBanner;
