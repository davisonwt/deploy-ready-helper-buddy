// Grove Station radio -- module-level singleton so playback survives
// in-app navigation the same way src/lib/liveSession/activeLiveSession.ts
// already proves out for Gathering Room calls: state lives outside React,
// so no routed page owns (or can unmount) it. Unlike that store, this one
// also owns the actual HTMLAudioElement itself, the way
// src/lib/media/previewPlaybackStore.ts owns its Audio() -- the stream
// connection has to be the SAME element across navigation, not torn down
// and recreated, or it audibly glitches/reconnects.
//
// 2026-09-19: replaced the old third-party Icecast URL (dead) with a real
// station -- every sower's uploaded music, looped continuously, playout
// computed server-side (supabase/functions/_shared/radioSchedule.ts).
//
// 2026-09-19, third report from real listening (playback dying after 2-5
// songs): the first version of this file transitioned tracks ONLY via a
// 15s setInterval poll, with no listener on the audio element's own
// `ended`/`error` events at all. Browsers throttle (often to ~once/minute,
// sometimes fully suspend) setInterval timers in a backgrounded tab, and
// iOS suspends JS almost entirely on screen lock even while background
// audio keeps playing -- so the CURRENT track played out fine, `ended`
// fired into a void with nothing listening, and nothing ever reloaded
// .src onto the next track. One missed transition during any background
// stretch permanently stopped a session that looked perfectly fine in a
// foregrounded, short-lived test harness.
//
// Now layered so no single failure mode is load-bearing:
//   - `ended`   -- the primary transition trigger. Event-driven, not
//                  timer-driven; media element events are serviced even
//                  when generic JS timers are throttled.
//   - `error`   -- any decode/network error on the current stream
//                  schedules a retry immediately.
//   - stall watchdog -- a short interval checks audio.currentTime is
//                  actually advancing; a silent stall (network cut with
//                  no clean error) that doesn't progress for
//                  STALL_GRACE_MS forces a retune.
//   - visibilitychange -- the instant the tab is foregrounded again,
//                  resync immediately and self-heal if audio quietly died
//                  while backgrounded.
//   - periodic poll -- a slower backstop that also self-heals a silently
//                  paused element.
// Every path that would otherwise go silent instead calls scheduleRetry(),
// which retries with exponential backoff FOREVER (as long as the user's
// own intent, state.isPlaying, is still true) -- never a dead end. The
// pill surfaces state.reconnecting during a retry; nothing else changes
// for the listener.
//
// Ducking: ducks (pauses) the moment either of the two OTHER existing
// global audio signals report something active: a Gathering Room
// call/live session (activeLiveSession.ts) or a track preview
// (previewPlaybackStore.ts). Does NOT auto-resume afterward, by design
// (Davison, 2026-09-19) -- resuming audio a member didn't ask for is the
// wrong default. stopRadio() (called both by an explicit user stop and by
// ducking) clears all retry/watchdog state cleanly either way, so a later
// startRadio() -- whether the user resuming after a duck, or a fresh
// session -- never inherits stale retry counters or a stuck
// "reconnecting" flag.

import { ensureFreshSession } from '@/lib/payments/invokeFunction';
import { subscribeActiveLiveSession, getActiveLiveSession } from '@/lib/liveSession/activeLiveSession';
import { subscribeToPreviewPlayback, getCurrentlyPlayingId } from '@/lib/media/previewPlaybackStore';

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const STREAM_ENDPOINT = `${SUPABASE_URL}/functions/v1/radio-stream`;
const NOW_PLAYING_ENDPOINT = `${SUPABASE_URL}/functions/v1/radio-now-playing`;

const POLL_MS = 10_000;
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 20_000;
const WATCHDOG_INTERVAL_MS = 5_000;
const STALL_GRACE_MS = 10_000;
// Found live: a track whose stored `duration` overstates its real file
// length seeks past the real end on every tune, firing `ended` again
// almost immediately -- a tight loop reloading every ~3s for as long as
// the (wrong) stored duration says the track's slot lasts, since the
// schedule won't move to the next track until then. A real song is never
// this short; treat an ended-this-fast as an anomaly needing backoff,
// not a normal transition to act on immediately.
const MIN_SANE_TRACK_MS = 5_000;

// vite.config.ts marks console.log/info/debug as "pure" and strips them
// from production bundles entirely (kept: warn/error, for Sentry-style
// runtime monitoring) -- found live: every non-error [radio] line here
// was silently compiled away on www.sow2growapp.com, so a "no playing
// event logged" test failure proved nothing about actual playback, only
// that the log call never ran. console.warn is the least-alarming level
// that actually survives, so normal transitions use it; only real
// failures use error.
function log(...args: unknown[]) {
  console.warn('[radio]', new Date().toISOString(), ...args);
}
function logError(...args: unknown[]) {
  console.error('[radio]', new Date().toISOString(), ...args);
}

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

// Grove Station DJ Slots (2026-09-20): a scheduled slot's non-song segment
// (opening/talk/advert/jingle/handover) has no product behind it, so no
// `track` -- this is the distinct "DJ + show title + segment image" shape
// instead. `track` and `segment` are never both set at once.
export interface RadioSegmentInfo {
  id: string;
  kind: 'opening' | 'talk' | 'advert' | 'jingle' | 'handover';
  durationSeconds: number;
  imageUrl: string | null;
  notes: string | null;
}

export interface RadioSlotInfo {
  id: string;
  djUserId?: string;
  djName: string;
  djUsername: string | null;
  title: string | null;
  mode: 'live' | 'prerecorded';
  adPrice: number | null;
}

export interface RadioState {
  isPlaying: boolean;
  loading: boolean;
  /** True while a retry is in flight after an error/stall/failed tune -- surfaced on the pill as "Reconnecting...", nothing else. */
  reconnecting: boolean;
  track: RadioTrackInfo | null;
  /** Set instead of `track` while a scheduled slot's non-song segment is live. */
  segment: RadioSegmentInfo | null;
  /** Set alongside `track` OR `segment` while a scheduled slot is live; null during plain autopilot. */
  slot: RadioSlotInfo | null;
  offsetSeconds: number;
  poolSize: number;
}

type Listener = () => void;

let audio: HTMLAudioElement | null = null;
let state: RadioState = { isPlaying: false, loading: false, reconnecting: false, track: null, segment: null, slot: null, offsetSeconds: 0, poolSize: 0 };
const listeners = new Set<Listener>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
let lastWatchdogTime = 0;
let lastWatchdogProgressAt = 0;
let lastTuneCompletedAt = 0;
let tuneInFlight = false;
let duckingWired = false;
let visibilityWired = false;

// Diagnostic hook only -- the Audio() element is never in the DOM, so
// there is otherwise no way for a live verification (or a future
// incident) to read ground-truth playback state from outside this module.
if (typeof window !== 'undefined') {
  (window as unknown as { __radioDebug?: unknown }).__radioDebug = {
    getState: () => state,
    getAudio: () => audio,
  };
}

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
    if (getActiveLiveSession() && state.isPlaying) {
      log('ducking: active live session started -- pausing radio');
      stopRadio();
    }
  });
  subscribeToPreviewPlayback(() => {
    if (getCurrentlyPlayingId() && state.isPlaying) {
      log('ducking: track preview started -- pausing radio');
      stopRadio();
    }
  });
}

function wireVisibilityOnce() {
  if (visibilityWired || typeof document === 'undefined') return;
  visibilityWired = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !state.isPlaying) return;
    log('visibilitychange: tab foregrounded while playing -- resyncing');
    if (audio && audio.paused) {
      logError('visibilitychange: audio was paused (likely died while backgrounded) -- forcing retune');
      void tuneToLive(true, 'visibilitychange self-heal');
    } else {
      void pollOnce();
    }
  });
}

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleRetry(reason: string) {
  if (!state.isPlaying) {
    log(`scheduleRetry skipped (user intent is stopped) -- reason was: ${reason}`);
    return;
  }
  clearRetry();
  retryAttempt += 1;
  const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (retryAttempt - 1));
  setState({ reconnecting: true });
  logError(`retry #${retryAttempt} scheduled in ${delay}ms -- reason: ${reason}`);
  retryTimer = setTimeout(() => {
    if (!state.isPlaying) {
      log('retry fired but user intent is now stopped -- doing nothing');
      return;
    }
    log(`retry #${retryAttempt} firing now`);
    void tuneToLive(true, `retry #${retryAttempt} (${reason})`);
  }, delay);
}

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'none';
    // Neither of these touches state.isPlaying -- see the 2026-09-20 fix
    // note above startRadio()/stopRadio() for why. Diagnostic logging only.
    audio.addEventListener('pause', () => {
      log('event: pause');
    });
    audio.addEventListener('play', () => {
      log('event: play (requested)');
    });
    audio.addEventListener('playing', () => {
      log('event: playing (audio actually resumed/started)');
      retryAttempt = 0;
      clearRetry();
      // Found live (2026-09-19, ~42min real run): the watchdog's "last
      // known good position" was a single high-water mark for the whole
      // session, never reset on a track change. Track 2 starts near
      // currentTime=2s while the mark was still track 1's ending ~230s --
      // a later track's time can never climb back above an earlier
      // track's peak, so every watchdog tick after the FIRST transition
      // read as "stalled" forever, forcing a reload every ~10-15s for the
      // rest of the session. 'playing' fires exactly when audio actually
      // starts rendering after any reload/seek, for any reason (ended,
      // error-retry, watchdog-retry, poll backstop, startRadio) -- the one
      // reliable place to re-baseline it.
      lastWatchdogTime = audio?.currentTime ?? 0;
      lastWatchdogProgressAt = Date.now();
      lastTuneCompletedAt = Date.now();
      setState({ reconnecting: false });
    });
    audio.addEventListener('ended', () => {
      const sinceTune = Date.now() - lastTuneCompletedAt;
      if (sinceTune < MIN_SANE_TRACK_MS) {
        logError(`event: ended only ${sinceTune}ms after starting -- not a real play-through (stored duration likely overstates the real file), backing off instead of retuning immediately`);
        scheduleRetry('ended anomalously soon after starting');
        return;
      }
      log('event: ended -- track finished naturally, tuning to next');
      void tuneToLive(true, 'ended');
    });
    audio.addEventListener('error', () => {
      const err = audio?.error;
      logError('event: error', err ? { code: err.code, message: err.message } : 'unknown');
      if (state.isPlaying) scheduleRetry('audio element error event');
    });
    audio.addEventListener('stalled', () => {
      logError('event: stalled (buffer starved) -- watchdog will force a retune if this does not self-resolve');
    });
  }
  return audio;
}

function startWatchdog() {
  if (watchdogTimer) return;
  lastWatchdogTime = audio?.currentTime ?? 0;
  lastWatchdogProgressAt = Date.now();
  watchdogTimer = setInterval(() => {
    if (!audio || !state.isPlaying || tuneInFlight) return;
    const ct = audio.currentTime;
    if (ct > lastWatchdogTime + 0.1) {
      lastWatchdogTime = ct;
      lastWatchdogProgressAt = Date.now();
      return;
    }
    const stalledFor = Date.now() - lastWatchdogProgressAt;
    if (stalledFor > STALL_GRACE_MS && !audio.paused) {
      logError(`watchdog: no playback progress for ${stalledFor}ms while nominally playing -- forcing retune`);
      lastWatchdogProgressAt = Date.now();
      scheduleRetry('stall watchdog: no currentTime progress');
    }
  }, WATCHDOG_INTERVAL_MS);
}

function stopWatchdog() {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

interface NowPlayingResult {
  track: RadioTrackInfo | null;
  segment: RadioSegmentInfo | null;
  slot: RadioSlotInfo | null;
  offsetSeconds: number;
  poolSize: number;
}

async function fetchNowPlaying(): Promise<NowPlayingResult | null> {
  const session = await ensureFreshSession();
  const token = session?.access_token;
  if (!token) {
    logError('fetchNowPlaying: no valid session/token');
    return null;
  }
  try {
    const res = await fetch(NOW_PLAYING_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      logError(`fetchNowPlaying: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!data.playing) return { track: null, segment: null, slot: null, offsetSeconds: 0, poolSize: data.poolSize ?? 0 };
    return {
      track: data.track ?? null,
      segment: data.segment ?? null,
      slot: data.slot ?? null,
      offsetSeconds: data.offsetSeconds ?? 0,
      poolSize: data.poolSize ?? 0,
    };
  } catch (e) {
    logError('fetchNowPlaying: fetch threw', e);
    return null;
  }
}

function currentKey(result: Pick<NowPlayingResult, 'track' | 'segment'>): string | null {
  return result.track?.id ?? result.segment?.id ?? null;
}

/** Reloads .src onto whatever's live right now and seeks to its live
 *  offset. Never called with a caller-chosen track -- there is no such
 *  parameter to pass. On any failure at any step, schedules a retry
 *  instead of giving up -- this function is the single place silence
 *  either recovers or doesn't, so it must never just stop. */
async function tuneToLive(shouldPlay: boolean, reason: string) {
  if (tuneInFlight) {
    log(`tuneToLive skipped -- already in flight (reason was: ${reason})`);
    return;
  }
  tuneInFlight = true;
  log(`tuneToLive starting -- reason: ${reason}`);
  try {
    const result = await fetchNowPlaying();
    if (!result || (!result.track && !result.segment)) {
      logError('tuneToLive: nothing available from radio-now-playing');
      if (shouldPlay) scheduleRetry('no track/segment available');
      return;
    }
    const trackChanged = currentKey(result) !== currentKey(state);
    setState({ track: result.track, segment: result.segment, slot: result.slot, offsetSeconds: result.offsetSeconds, poolSize: result.poolSize, loading: false });
    log(`tuneToLive: now-playing resolved -- ${result.track ? `track="${result.track.title}"` : `segment kind="${result.segment?.kind}"`} offset=${result.offsetSeconds}s trackChanged=${trackChanged}`);

    const session = await ensureFreshSession();
    const token = session?.access_token;
    if (!token) {
      logError('tuneToLive: no valid session/token to build stream URL');
      if (shouldPlay) scheduleRetry('no session token');
      return;
    }

    const el = ensureAudio();
    el.src = `${STREAM_ENDPOINT}?token=${encodeURIComponent(token)}`;
    const targetOffset = result.offsetSeconds;
    const onLoaded = () => {
      el.currentTime = targetOffset;
      el.removeEventListener('loadedmetadata', onLoaded);
    };
    el.addEventListener('loadedmetadata', onLoaded);

    if (shouldPlay) {
      await el.play();
      log('tuneToLive: play() resolved successfully');
    }
  } catch (e) {
    logError('tuneToLive: threw', e);
    if (shouldPlay) scheduleRetry(`tuneToLive exception: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    tuneInFlight = false;
  }
}

async function pollOnce() {
  if (tuneInFlight) return;
  const result = await fetchNowPlaying();
  if (!result) return;
  const trackChanged = currentKey(result) !== currentKey(state);
  setState({ track: result.track, segment: result.segment, slot: result.slot, offsetSeconds: result.offsetSeconds, poolSize: result.poolSize, loading: false });
  if (!state.isPlaying) return;
  if (trackChanged) {
    log('pollOnce: detected a track change the ended-event path missed -- tuning (backstop)');
    await tuneToLive(true, 'poll backstop: track changed');
  } else if (audio && audio.paused) {
    logError('pollOnce: isPlaying=true but audio.paused=true -- self-healing');
    await tuneToLive(true, 'poll backstop: silently paused');
  }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => { void pollOnce(); }, POLL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// Bug, live 2026-09-20 (Davison: "the RADIO button no longer works"):
// state.isPlaying used to double as both "the user wants the radio on"
// (what scheduleRetry's own guard means to check, per this file's own
// header comment: "retries ... as long as the user's own intent,
// state.isPlaying, is still true") AND "the native <audio> element is
// currently producing sound" (set by the `play`/`pause` event listeners
// above). Those are not the same thing. Reproduced live: a track whose
// stored duration overstates the real file seeks past its real end,
// firing a native `pause` immediately before `ended` -- ordinary
// HTMLMediaElement behavior, nothing to do with the user -- which used to
// flip state.isPlaying to false via the `pause` listener. By the time the
// `ended` handler called scheduleRetry() a few milliseconds later,
// scheduleRetry's own guard read isPlaying as already false and skipped
// the retry ("user intent is stopped"), permanently abandoning recovery
// even though the user never touched anything. Fix: state.isPlaying now
// changes ONLY here, on an explicit startRadio()/stopRadio() call --
// never from a native media event -- so a transient pause/ended blip
// mid-stream can no longer be mistaken for the user asking to stop.

export function startRadio() {
  wireDuckingOnce();
  wireVisibilityOnce();
  log('startRadio called');
  retryAttempt = 0;
  clearRetry();
  setState({ isPlaying: true, loading: true, reconnecting: false });
  (async () => {
    await tuneToLive(true, 'startRadio');
    startPolling();
    startWatchdog();
  })();
}

export function stopRadio() {
  log('stopRadio called');
  audio?.pause();
  stopPolling();
  stopWatchdog();
  clearRetry();
  retryAttempt = 0;
  setState({ isPlaying: false, reconnecting: false });
}

export function getRadioState(): RadioState {
  return state;
}

export function subscribeRadio(listener: Listener): () => void {
  wireDuckingOnce();
  wireVisibilityOnce();
  listeners.add(listener);
  if (state.isPlaying && !state.track && !state.segment) void pollOnce();
  return () => listeners.delete(listener);
}
