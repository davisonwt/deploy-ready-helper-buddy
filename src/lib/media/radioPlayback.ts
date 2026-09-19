// Grove Station radio -- module-level singleton so playback survives
// in-app navigation the same way src/lib/liveSession/activeLiveSession.ts
// already proves out for Gathering Room calls: state lives outside React,
// so no routed page owns (or can unmount) it. Unlike that store, this one
// also owns the actual HTMLAudioElement itself, the way
// src/lib/media/previewPlaybackStore.ts owns its Audio() -- the stream
// connection has to be the SAME element across navigation, not torn down
// and recreated, or it audibly glitches/reconnects.
//
// Stream URL and now-playing wiring (get_current_radio_show RPC +
// radio-live-updates broadcast) are lifted as-is from
// src/components/radio/LiveStreamPlayer.tsx -- that component is real and
// working, just page-local (unmounts on navigation) and its route
// (/radio) redirects away. This relocates the same mechanism to a home
// that survives navigation; it does not reimplement it.
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

import { supabase } from '@/integrations/supabase/client';
import { subscribeActiveLiveSession, getActiveLiveSession } from '@/lib/liveSession/activeLiveSession';
import { subscribeToPreviewPlayback, getCurrentlyPlayingId } from '@/lib/media/previewPlaybackStore';

const STREAM_URL = 'https://s9.voscast.com:9525/stream';

export interface RadioState {
  isPlaying: boolean;
  nowPlaying: string;
  listenerCount: number;
}

type Listener = () => void;

let audio: HTMLAudioElement | null = null;
let state: RadioState = { isPlaying: false, nowPlaying: 'Grove Station Radio', listenerCount: 0 };
const listeners = new Set<Listener>();
let initialized = false;

function notify() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<RadioState>) {
  state = { ...state, ...patch };
  notify();
}

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(STREAM_URL);
    audio.preload = 'none';
    audio.addEventListener('pause', () => setState({ isPlaying: false }));
    audio.addEventListener('play', () => setState({ isPlaying: true }));
    audio.addEventListener('error', () => setState({ isPlaying: false }));
  }
  return audio;
}

/** Same get_current_radio_show RPC + realtime broadcast channel
 * LiveStreamPlayer.tsx uses -- set up once at module load (not per
 * component mount), since this store itself is the thing that's always
 * alive now. */
function initNowPlayingOnce() {
  if (initialized) return;
  initialized = true;

  supabase.rpc('get_current_radio_show').then(
    ({ data }) => {
      if (data && typeof data === 'object') {
        const d = data as any;
        setState({
          nowPlaying: `${d.show_name || 'Live Show'} with ${d.dj_name || 'DJ'}`,
          listenerCount: d.listener_count || 0,
        });
      }
    },
    () => {},
  );

  supabase
    .channel('radio-live-updates')
    .on('broadcast', { event: 'now-playing' }, ({ payload }) => {
      const patch: Partial<RadioState> = {};
      if (payload.track) patch.nowPlaying = payload.track;
      if (payload.listener_count !== undefined) patch.listenerCount = payload.listener_count;
      setState(patch);
    })
    .subscribe();

  // Duck (pause, never auto-resume) on either existing global audio signal.
  subscribeActiveLiveSession(() => {
    if (getActiveLiveSession() && state.isPlaying) stopRadio();
  });
  subscribeToPreviewPlayback(() => {
    if (getCurrentlyPlayingId() && state.isPlaying) stopRadio();
  });
}

export function startRadio() {
  initNowPlayingOnce();
  const el = ensureAudio();
  el.play().catch(() => setState({ isPlaying: false }));
}

export function stopRadio() {
  audio?.pause();
}

export function getRadioState(): RadioState {
  return state;
}

export function subscribeRadio(listener: Listener): () => void {
  initNowPlayingOnce();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
