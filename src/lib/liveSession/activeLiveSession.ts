/**
 * activeLiveSession — the one shared "am I currently in a Gathering Room
 * live" slot for this tab, module-level singleton (same store/listeners
 * shape useTribalLiveOrchard.ts already uses for presence), backed by
 * localStorage so it survives a full reload -- the actual scenario behind
 * "silent auto-rejoin" (2026-09-15): backgrounding a tab or answering a
 * phone call can get the tab's whole JS context reclaimed by the OS on
 * mobile, which is indistinguishable from a fresh page load once the user
 * returns. In-memory React state alone (whichever page happened to start
 * the live) can't survive that; this can.
 *
 * GlobalLiveSessionOverlay.tsx is the ONE place that actually renders
 * <LiveStageOverlay> from this store, mounted once near the app root
 * (above <Routes>) so it's untouched by in-app navigation too -- a route
 * change no longer unmounts the call, since the overlay was never owned
 * by any specific routed page to begin with. Entry points (DashboardPage's
 * ad-hoc Go Live, LiveNowPage's Join, StallInteriorView's Scripture Study)
 * call setActiveLiveSession() instead of rendering their own overlay.
 *
 * Deliberately NOT wired into SeedCard.tsx's own seed-attached Go Live
 * (whisperer-commission) flow in this pass -- that call site owns a lot of
 * its own tightly-coupled local state and is used across many surfaces;
 * converting it carries real regression risk this pass didn't take. Flagged
 * as a known gap, same as the earlier "Open seed" navigate-away decision.
 */
export interface ActiveLiveSessionInfo {
  seedId: string;
  title: string;
  subtitle?: string;
  jitsiRoom: string;
  isHost: boolean;
  hostSessionId?: string | null;
  isRadio?: boolean;
  sowerUserId?: string | null;
  images?: string[];
  mediaUrl?: string | null;
  mediaKind?: 'audio' | 'video' | 'book' | 'orchard' | 'seed';
  whispererSharePct?: number;
  openPath?: string;
}

const STORAGE_KEY = 's2g:activeLiveSession';

type Listener = () => void;
let current: ActiveLiveSessionInfo | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

function persistToStorage(info: ActiveLiveSessionInfo | null) {
  try {
    if (info) localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* private mode / storage full -- in-memory store still works for this tab's own lifetime */ }
}

/** Called by an entry point once it has actually started/joined a live --
 * this is what makes it resumable after a reload/backgrounding. */
export function setActiveLiveSession(info: ActiveLiveSessionInfo) {
  current = info;
  persistToStorage(info);
  notify();
}

/** Called on an EXPLICIT "Leave"/"Close room" tap only -- anything else
 * (backgrounding, an unmount from navigating elsewhere, a dropped
 * connection) must never call this, or the whole point of remembering is
 * defeated. */
export function clearActiveLiveSession() {
  current = null;
  persistToStorage(null);
  notify();
}

export function getActiveLiveSession(): ActiveLiveSessionInfo | null {
  return current;
}

/** One-time read of whatever was remembered from a PREVIOUS tab lifetime
 * (page load) -- GlobalLiveSessionOverlay uses this to decide whether
 * there's anything to validate/resume; not reactive itself the in-memory
 * `current` above already's own store is. */
export function readRememberedLiveSession(): ActiveLiveSessionInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveLiveSessionInfo;
  } catch {
    return null;
  }
}

export function subscribeActiveLiveSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
