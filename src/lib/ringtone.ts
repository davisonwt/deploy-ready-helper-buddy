// Global ringtone control utilities
// Provides a single, idempotent way to stop any active ringtone loops across the app.

/**
 * Self-contained ring loop (its own AudioContext, not window.__ringtone --
 * deliberately independent of IncomingCallOverlay's global ring so the two
 * can never interfere with each other). For call-invite signals outside
 * the call_sessions/IncomingCallOverlay system, e.g. OneOnOneRoom's
 * live-room call invite, which previously had no audible cue at all.
 * Returns a stop() handle; safe to call more than once.
 */
export function startSimpleRingtone(): { stop: () => void } {
  try {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return { stop: () => {} };
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.type = 'sine';
    osc.frequency.value = 800;
    osc.connect(gain).connect(ctx.destination);
    osc.start();

    let on = false;
    const toggle = () => {
      on = !on;
      gain.gain.value = on ? 0.22 : 0;
    };
    toggle();
    const interval = window.setInterval(toggle, 600);
    ctx.resume().catch(() => {});

    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      try { clearInterval(interval); } catch {}
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
