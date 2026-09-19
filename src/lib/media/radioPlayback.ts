// Grove Station radio -- module-level singleton so playback survives
// in-app navigation the same way src/lib/liveSession/activeLiveSession.ts
// already proves out for Gathering Room calls: state lives outside React,
// so no routed page owns (or can unmount) it. Unlike that store, this one
// also owns the actual HTMLAudioElement itself, the way
// src/lib/media/previewPlaybackStore.ts owns its Audio() -- the stream
// connection has to be the SAME element across navigation, not torn down
// and recreated, or it audibly glitches/reconnects.
//
// 2026-09-19: replaced the old third-party Icecast URL (dead --
// s9.voscast.com never resolved) with a real station -- every sower's
// uploaded music, looped continuously, playout computed server-side
// (supabase/functions/_shared/radioSchedule.ts) so every listener hears
// the same track at the same moment. Audio itself is only ever reached
// through radio-stream, which takes no track selection from the client --
// see that function's own comment for the full protection model.
//
// Ducking: ducks (pauses, does not volume-duck -- simpler, no "restore
// volume after" state) the moment either of the two OTHER existing global
// audio signals report something active: a Gathering Room call/live
// session (activeLiveSession.ts) or a track preview
// (previewPlaybackStore.ts). Neither of those call sites needed any
// change -- this just subscribes to what they already publish. Does NOT
// auto-resume afterward, by design (Davison, 2026-09-19): resuming audio
// a member didn't ask for is the wrong default, and browser autoplay
// policy would likely block it without a fresh gesture anyway.

import { ensureFreshSession } from '@/lib/payments/invokeFunction';
import { subscribeActiveLiveSession, getActiveLiveSession } from '@/lib/liveSession/activeLiveSession';
import { subscribeToPreviewPlayback, getCurrentlyPlayingId } from '@/lib/media/previewPlaybackStore';

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const STREAM_ENDPOINT = `${SUPABASE_URL}/functions/v1/radio-stream`;
const NOW_PLAYING_ENDPOINT = `${SUPABASE_URL}/functions/v1/radio-now-playing`;

// How often to re-check what's live while playing. Short enough that a
// track change is noticed promptly (worst case: this long past the
// previous track's actual end before the player catches up and reloads
// .src onto the new one), long enough not to hammer the function.
const POLL_MS = 15_000;

export interface RadioTrackInfo {
  id: string;
  title: string;
  sowerUserId: string;
  sowerName: string;
  sowerUsername: string | null;
  cover: string | null;
  durationSeconds: number;
  price: number | null;
}

export interface RadioState {
  isPlaying: boolean;
  loading: boolean;
  track: RadioTrackInfo | null;
  offsetSeconds: number;
  poolSize: number;
}

type Listener = () => void;

let audio: HTMLAudioElement | null = null;
let state: RadioState = { isPlaying: false, loading: false, track: null, offsetSeconds: 0, poolSize: 0 };
const listeners = new Set<Listener>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let duckingWired = false;

function notify() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<RadioState>) {
  state = { ...state, ...patch };
  notify();
}

function wireDuckingOnce() {
  if (duckingWired) return;
  duckingWired = true;
  subscribeActiveLiveSession(() => {
    if (getActiveLiveSession() && state.isPlaying) stopRadio();
  });
  subscribeToPreviewPlayback(() => {
    if (getCurrentlyPlayingId() && state.isPlaying) stopRadio();
  });
}

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'none';
    audio.addEventListener('pause', () => setState({ isPlaying: false }));
    audio.addEventListener('play', () => setState({ isPlaying: true }));
    audio.addEventListener('error', () => setState({ isPlaying: false, loading: false }));
  }
  return audio;
}

async function fetchNowPlaying(): Promise<{ track: RadioTrackInfo | null; offsetSeconds: number; poolSize: number } | null> {
  const session = await ensureFreshSession();
  const token = session?.access_token;
  if (!token) return null;
  try {
    const res = await fetch(NOW_PLAYING_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.playing) return { track: null, offsetSeconds: 0, poolSize: data.poolSize ?? 0 };
    return { track: data.track, offsetSeconds: data.offsetSeconds ?? 0, poolSize: data.poolSize ?? 0 };
  } catch {
    return null;
  }
}

/** Reloads .src onto whatever's live right now and seeks to its live
 *  offset. Called on startRadio() and whenever polling notices the
 *  playing track has changed. Never called with a caller-chosen track --
 *  there is no such parameter to pass. */
async function tuneToLive() {
  const session = await ensureFreshSession();
  const token = session?.access_token;
  if (!token) {
    setState({ isPlaying: false, loading: false });
    return;
  }
  const el = ensureAudio();
  const wasPlaying = !el.paused;
  el.src = `${STREAM_ENDPOINT}?token=${encodeURIComponent(token)}`;
  const onLoaded = () => {
    el.currentTime = state.offsetSeconds;
    el.removeEventListener('loadedmetadata', onLoaded);
  };
  el.addEventListener('loadedmetadata', onLoaded);
  if (wasPlaying || state.isPlaying) {
    try {
      await el.play();
    } catch {
      setState({ isPlaying: false });
    }
  }
}

async function pollOnce() {
  const result = await fetchNowPlaying();
  if (!result) return;
  const trackChanged = result.track?.id !== state.track?.id;
  setState({ track: result.track, offsetSeconds: result.offsetSeconds, poolSize: result.poolSize, loading: false });
  if (trackChanged && state.isPlaying) {
    await tuneToLive();
  }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(pollOnce, POLL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function startRadio() {
  wireDuckingOnce();
  setState({ loading: true });
  (async () => {
    await pollOnce();
    await tuneToLive();
    startPolling();
  })();
}

export function stopRadio() {
  audio?.pause();
  stopPolling();
}

export function getRadioState(): RadioState {
  return state;
}

export function subscribeRadio(listener: Listener): () => void {
  wireDuckingOnce();
  listeners.add(listener);
  // A late subscriber (e.g. a component mounting on a page reached after
  // playback already started elsewhere) should see current metadata
  // without waiting for the next poll tick.
  if (state.isPlaying && !state.track) void pollOnce();
  return () => listeners.delete(listener);
}
