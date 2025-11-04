import { useEffect, useRef } from 'react';

// Globally unlocks audio autoplay on mobile by performing a short, user-gesture-bound
// AudioContext resume and a tiny beep. Invisible and safe to run once per session.
const AudioUnlocker: React.FC = () => {
  const unlockedRef = useRef(false);

  useEffect(() => {
    try {
      const already = sessionStorage.getItem('audioUnlocked');
      if (already === '1') {
        unlockedRef.current = true;
        return;
      }
    } catch {}

    const onFirstGesture = async () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;

      try {
        const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx: AudioContext = new Ctx();
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
            try { await ctx.resume(); } catch {}
          }
        };
        document.addEventListener('visibilitychange', onVisible);
      } catch (e) {
        console.warn('[AudioUnlocker] Failed to unlock audio context', e);
      }

      // Nudge any existing muted audio elements to start then stop (unlocks autoplay on some browsers)
      try {
        const els = Array.from(document.querySelectorAll('audio')) as HTMLAudioElement[];
        for (const el of els) {
          try { await el.play(); } catch {}
          try { el.pause(); } catch {}
        }
      } catch {}

      try { sessionStorage.setItem('audioUnlocked', '1'); } catch {}
      // Remove listeners after first gesture
      window.removeEventListener('pointerdown', onFirstGesture, true);
      window.removeEventListener('touchstart', onFirstGesture, true);
      window.removeEventListener('click', onFirstGesture, true);
      window.removeEventListener('keydown', onFirstGesture, true);
    };

    window.addEventListener('pointerdown', onFirstGesture, true);
    window.addEventListener('touchstart', onFirstGesture, true);
    window.addEventListener('click', onFirstGesture, true);
    window.addEventListener('keydown', onFirstGesture, true);

    return () => {
      window.removeEventListener('pointerdown', onFirstGesture, true);
      window.removeEventListener('touchstart', onFirstGesture, true);
      window.removeEventListener('click', onFirstGesture, true);
      window.removeEventListener('keydown', onFirstGesture, true);
    };
  }, []);

  return null;
};

export default AudioUnlocker;
