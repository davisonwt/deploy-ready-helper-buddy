import { useEffect, useRef } from 'react';
import { unlockHtmlMediaElement } from '@/utils/unlockHtmlMediaElement';

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

        const ctx: AudioContext = w.__unlockedAudioCtx || new AudioContextConstructor();
        w.__unlockedAudioCtx = ctx;

        try { await ctx.resume(); } catch { /* resume may fail silently on some browsers */ }

        // Lightweight, one-shot unlock ping (do not keep oscillators running)
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.0001; // effectively silent
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.02);
          osc.onended = () => {
            try { osc.disconnect(); } catch { /* ignore */ }
            try { gain.disconnect(); } catch { /* ignore */ }
          };
        } catch { /* ignore unlock ping errors */ }

        // Also unlock HTMLMediaElement autoplay in a safe way (without touching active players)
        await unlockHtmlMediaElement();

        const onVisible = async () => {
          if (document.visibilityState === 'visible') {
            try { await ctx.resume(); } catch { /* ignore resume errors */ }
          }
        };
        document.addEventListener('visibilitychange', onVisible);
      } catch (e) {
        console.warn('[AudioUnlocker] Failed to unlock audio context', e);
      }

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
