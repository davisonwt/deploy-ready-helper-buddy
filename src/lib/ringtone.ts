// Global ringtone control utilities
// Provides a single, idempotent way to stop any active ringtone loops across the app.

/**
 * Shared synth core for the two self-contained tone loops below (own
 * AudioContext each, not window.__ringtone -- deliberately independent
 * of IncomingCallOverlay's global incoming ring so none of these can
 * interfere with each other). `onMs`/`offMs` drive an on/off gain toggle
 * at `peakGain`; returns a stop() handle, safe to call more than once.
 */
function createToneLoop(frequencyHz: number, peakGain: number, onMs: number, offMs: number): { stop: () => void } {
  try {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return { stop: () => {} };
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.type = 'sine';
    osc.frequency.value = frequencyHz;
    osc.connect(gain).connect(ctx.destination);
    osc.start();

    let on = false;
    let timer: number | null = null;
    const toggle = () => {
      on = !on;
      gain.gain.value = on ? peakGain : 0;
      timer = window.setTimeout(toggle, on ? onMs : offMs);
    };
    toggle();
    ctx.resume().catch(() => {});

    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (timer != null) { try { clearTimeout(timer); } catch {} }
      try { gain.gain.value = 0; } catch {}
      try { osc.stop(); } catch {}
      try { osc.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
      try { ctx.close().catch(() => {}); } catch {}
    };
    return { stop };
  } catch {
    return { stop: () => {} };
  }
}

/**
 * For call-invite signals outside the call_sessions/IncomingCallOverlay
 * system, e.g. OneOnOneRoom's live-room call invite, which previously
 * had no audible cue at all. Same cadence as IncomingCallOverlay's own
 * ring (800Hz, 600ms on/off).
 */
export function startSimpleRingtone(): { stop: () => void } {
  return createToneLoop(800, 0.22, 600, 600);
}

/**
 * Caller-side ring-back -- plays while an outgoing call_sessions call is
 * ringing, so the caller gets audible feedback the call is actually
 * going out instead of a silent "Calling..." screen. Deliberately softer
 * and a different cadence from the incoming ring so the two are never
 * confusable if somehow both were audible at once: lower pitch, quieter,
 * classic long-pulse telephone ring-back rhythm (~1s on, ~3s off) rather
 * than a steady fast toggle.
 */
export function startRingbackTone(): { stop: () => void } {
  return createToneLoop(440, 0.12, 1000, 3000);
}

export const stopAllRingtones = (): void => {
  try {
    const w = window as any;
    const r = w.__ringtone as
      | { ctx?: AudioContext & { __closing?: boolean }; osc?: OscillatorNode; gain?: GainNode; interval?: number | null }
      | undefined;
    if (!r) return;

    try { if (r.interval != null) clearInterval(r.interval as any); } catch {}
    try { r.gain?.gain?.cancelScheduledValues?.(0); } catch {}
    try { if (r.gain?.gain) r.gain.gain.value = 0; } catch {}
    try { r.osc?.stop?.(); } catch {}
    try { (r.osc as any)?.disconnect?.(); } catch {}
    try { (r.gain as any)?.disconnect?.(); } catch {}
    try {
      const ctx: any = r.ctx;
      const globalCtx: any = (window as any).__unlockedAudioCtx;
      if (ctx && ctx !== globalCtx && ctx.state !== 'closed' && !ctx.__closing) {
        try {
          ctx.__closing = true;
          const p = ctx.close?.();
          if (p && typeof p.catch === 'function') {
            (p as Promise<void>).catch(() => {});
          }
        } catch {}
      }
    } catch {}

    w.__ringtone = undefined;
  } catch {
    // no-op
  }
};
