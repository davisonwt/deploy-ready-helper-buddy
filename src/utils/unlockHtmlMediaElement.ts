export async function unlockHtmlMediaElement(): Promise<void> {
  try {
    const el = document.createElement('audio');
    el.setAttribute('playsinline', 'true');
    el.muted = true;
    el.volume = 0;
    el.preload = 'auto';

    // Tiny silent WAV data URI (very short, cross-browser friendly)
    el.src =
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

    const playAttempt = el.play();
    if (playAttempt && typeof playAttempt.then === 'function') {
      await playAttempt.catch(() => undefined);
    }

    try { el.pause(); } catch { /* ignore */ }
    try { el.removeAttribute('src'); } catch { /* ignore */ }
    try { el.load(); } catch { /* ignore */ }
  } catch {
    // no-op: helper should never break app flow
  }
}
