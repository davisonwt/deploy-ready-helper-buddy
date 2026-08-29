// Module-level singleton so "only one preview plays at a time" holds across
// completely unrelated component trees (a ProductCard in one grid, a row in
// MusicLibraryTable, the Tribal Gardens feed, the detail page) without
// needing a Context provider wrapped around all of them. Plain pub/sub, no
// React involved here — usePreviewPlayer is the React-facing wrapper.

type Listener = (playingId: string | null) => void;

let currentAudio: HTMLAudioElement | null = null;
let currentId: string | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l(currentId));
}

function teardown() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
  }
  currentAudio = null;
  currentId = null;
}

export interface StartPlaybackHandlers {
  onProgress?: (fraction: number, currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: () => void;
}

/** Stops whatever else is playing (if anything) and starts this one. */
export function startPreviewPlayback(id: string, url: string, handlers: StartPlaybackHandlers = {}): HTMLAudioElement {
  teardown();
  const audio = new Audio(url);
  currentAudio = audio;
  currentId = id;

  audio.addEventListener('timeupdate', () => {
    if (currentId !== id) return;
    const duration = audio.duration || 0;
    handlers.onProgress?.(duration ? audio.currentTime / duration : 0, audio.currentTime, duration);
  });
  audio.addEventListener('ended', () => {
    if (currentId === id) teardown();
    notify();
    handlers.onEnded?.();
  });
  audio.addEventListener('error', () => {
    if (currentId === id) teardown();
    notify();
    handlers.onError?.();
  });

  audio.play().catch(() => {
    if (currentId === id) teardown();
    notify();
    handlers.onError?.();
  });

  notify();
  return audio;
}

/** Stops playback. If `id` is given, only stops when it's the one currently playing. */
export function stopPreviewPlayback(id?: string) {
  if (id && currentId !== id) return;
  teardown();
  notify();
}

export function getCurrentlyPlayingId(): string | null {
  return currentId;
}

/** Returns an unsubscribe function. Fires whenever the currently-playing id changes. */
export function subscribeToPreviewPlayback(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
