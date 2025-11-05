// Global ringtone control utilities
// Provides a single, idempotent way to stop any active ringtone loops across the app.

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
