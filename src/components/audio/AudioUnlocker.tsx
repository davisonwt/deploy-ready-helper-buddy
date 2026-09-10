import { useEffect, useRef } from 'react';
import { primeCallAudio } from '@/lib/callAudio';

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
    // window.__unlockedAudioCtx is the true source of truth -- it does
    // NOT survive a page reload (it's a plain object on `window`, reset
    // every load), but the 'audioUnlocked' sessionStorage flag DOES
    // survive reloads within the same tab. That mismatch was a real bug:
    // after any reload following a successful unlock earlier in the
    // session, this effect saw the stale flag, believed audio was
    // already unlocked, and returned immediately -- never creating a
    // fresh AudioContext and never attaching gesture listeners to do so
    // later, leaving window.__unlockedAudioCtx undefined (and the
    // incoming-call ringtone silent) for the rest of that page load.
    // Only trust an AudioContext that's actually there and running.
    const w = window as WindowWithAudioUnlock;
    if (w.__unlockedAudioCtx && w.__unlockedAudioCtx.state === 'running') {
      unlockedRef.current = true;
      return;
    }

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

      // The ringtone/ring-back <audio> elements (callAudio.ts) aren't in
      // the DOM at all (created detached, only on first use) so the
      // querySelectorAll('audio') sweep above never reaches them -- prime
      // them explicitly, in the same real gesture, so a later play() call
      // triggered by a realtime event (not a gesture) is already allowed.
      try { await primeCallAudio(); } catch { /* primeCallAudio never throws, but stay defensive */ }

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
