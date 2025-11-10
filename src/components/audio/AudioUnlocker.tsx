import { useEffect, useRef } from 'react';

// Globally unlocks audio autoplay on mobile by performing a short, user-gesture-bound
// AudioContext resume and a tiny beep. Invisible and safe to run once per session.

interface WindowWithAudioUnlock extends Window {
  webkitAudioContext?: typeof AudioContext;
  __unlockedAudioCtx?: AudioContext;
  __unlockedOsc?: OscillatorNode;
  __unlockedGain?: GainNode;
}

const AudioUnlocker: React.FC = () => {
  const unlockedRef = useRef(false);

  useEffect(() => {
    try {
      const already = sessionStorage.getItem('audioUnlocked');
      if (already === '1') {
        unlockedRef.current = true;
        return;
      }
    } catch { /* sessionStorage may be unavailable */ }

    const onFirstGesture = async () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;

      try {
        const w = window as WindowWithAudioUnlock;
        const AudioContextConstructor: typeof AudioContext | undefined = window.AudioContext || w.webkitAudioContext;
        if (!AudioContextConstructor) return;
        const ctx: AudioContext = new AudioContextConstructor();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001; // effectively silent
        osc.connect(gain).connect(ctx.destination);
        try { await ctx.resume(); } catch { /* resume may fail silently on some browsers */ }
        try { osc.start(); } catch { /* oscillator may already be started or blocked */ }
        w.__unlockedAudioCtx = ctx;
        w.__unlockedOsc = osc;
        w.__unlockedGain = gain;
        const onVisible = async () => {
          if (document.visibilityState === 'visible') {
            try { await ctx.resume(); } catch { /* ignore resume errors */ }
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
          try { await el.play(); } catch { /* play may be blocked */ }
          try { el.pause(); } catch { /* pause may fail */ }
        }
      } catch { /* querying audio elements may fail in rare cases */ }

      try { sessionStorage.setItem('audioUnlocked', '1'); } catch { /* storage might be disabled */ }
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
