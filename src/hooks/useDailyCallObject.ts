/**
 * useDailyCallObject — headless Daily.co call for LiveStage (Gathering /
 * Scripture Study). One `DailyIframe.createCallObject()` per mount (no
 * iframe, Daily's own prebuilt UI never renders); mic and camera are two
 * independent track calls (`setLocalAudio`/`setLocalVideo`), so turning the
 * camera off never touches the audio track -- the actual fix for
 * "camera off kills audio," which the old bare-iframe/prebuilt-UI integration
 * couldn't guarantee since Daily's own UI owned that toggle.
 *
 * Exactly one join per enabled mount -- callers must render exactly one
 * instance of this hook per Daily room per tab (LiveStage's old iframe-based
 * approach rendered TWO iframes against the same room/token: the big
 * camera-mode tile and the always-present host PIP, each an independent
 * join, each publishing its own mic into the room -- the source of the
 * echo/feedback risk). Every consumer (big tile, PIP thumbnail, tile grid)
 * must read from this same hook's `participants`/local track state instead
 * of creating its own call object.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import DailyIframe, { type DailyCall, type DailyParticipant } from '@daily-co/daily-js';
import { fetchDailyMeetingToken, teardownDailyCall, type DailyRoomKind } from '@/lib/daily-config';

export interface CallParticipant {
  sessionId: string;
  userId: string | null;
  userName: string;
  local: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  audioOn: boolean;
  videoOn: boolean;
}

function toCallParticipant(p: DailyParticipant): CallParticipant {
  return {
    sessionId: p.session_id,
    userId: p.user_id || null,
    userName: p.user_name || 'Guest',
    local: p.local,
    videoTrack: p.tracks?.video?.state === 'playable' ? (p.tracks.video.persistentTrack ?? p.tracks.video.track ?? null) : null,
    audioTrack: p.tracks?.audio?.state === 'playable' ? (p.tracks.audio.persistentTrack ?? p.tracks.audio.track ?? null) : null,
    audioOn: !!p.tracks?.audio && p.tracks.audio.state !== 'off' && p.tracks.audio.state !== 'blocked',
    videoOn: !!p.tracks?.video && p.tracks.video.state !== 'off' && p.tracks.video.state !== 'blocked',
  };
}

export interface UseDailyCallObjectResult {
  participants: Record<string, CallParticipant>;
  joined: boolean;
  connecting: boolean;
  error: string | null;
  audioOn: boolean;
  videoOn: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  /** True once a short on-device check has confirmed the local mic track,
   * despite being "on," is producing no real audio -- see
   * monitorLocalMicSilence below. Lets the CALLER'S OWN client warn them
   * ("your microphone isn't being shared") instead of everyone else just
   * silently not hearing them with no feedback anywhere. */
  localMicSilent: boolean;
  /** Host/moderator speaker enforcement (Gathering Room / Scripture Study --
   * see LiveStage.tsx's speaker-reconciliation effect and its Participants
   * panel): forces a REMOTE participant's audio on/off via Daily's own
   * call.updateParticipant(), which only actually takes effect when the
   * local participant's own meeting token carries is_owner (see
   * create-daily-meeting-token/index.ts) -- a non-owner caller's
   * updateParticipant silently has no effect at Daily's SFU, so this is
   * safe to expose unconditionally rather than re-deriving permission in
   * here too. */
  setRemoteAudio: (sessionId: string, on: boolean) => void;
  /** Host/moderator: removes a participant from the call outright (Daily's
   * `eject`). Same is_owner-gated no-op-for-non-owners safety as
   * setRemoteAudio above. */
  ejectRemote: (sessionId: string) => void;
}

const SILENCE_CHECK_SAMPLES = 8;
const SILENCE_CHECK_INTERVAL_MS = 1000;
const SILENCE_RMS_THRESHOLD = 0.001; // same threshold tests/live/gathering-room.spec.ts uses for received audio

/**
 * Confirms whether a LOCAL mic track is actually carrying sound. Daily's own
 * track state (`tracks.audio.state`) only tells us a track was captured and
 * is being sent -- it says nothing about whether that track is silent.
 * Reported live, 2026-09-14: a participant on Microsoft Edge showed as
 * on-mic (state 'playable', unmuted UI) but no one ever heard them -- Edge
 * has known WebRTC mic-publishing quirks (capturing the wrong input device,
 * efficiency-mode throttling, tracking-prevention muting the capture at the
 * OS level) that getUserMedia/Daily's track state can't see, since the
 * track itself is technically "live," just empty.
 *
 * Runs the exact same WebAudio RMS technique the live E2E test already uses
 * to prove RECEIVED audio (tests/live/gathering-room.spec.ts,
 * measureAudioEnergy) -- pointed at the SENT track instead, on the
 * sender's own client, so a broken mic can report on itself instead of
 * relying on someone else noticing the silence.
 */
function monitorLocalMicSilence(track: MediaStreamTrack, onResult: (silent: boolean) => void): () => void {
  let cancelled = false;
  let ctx: AudioContext | null = null;
  (async () => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const src = ctx.createMediaStreamSource(new MediaStream([track]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let heardSound = false;
      for (let i = 0; i < SILENCE_CHECK_SAMPLES && !cancelled; i++) {
        analyser.getByteTimeDomainData(data);
        let sumSq = 0;
        for (let j = 0; j < data.length; j++) { const v = (data[j] - 128) / 128; sumSq += v * v; }
        const rms = Math.sqrt(sumSq / data.length);
        if (rms > SILENCE_RMS_THRESHOLD) { heardSound = true; break; }
        await new Promise((r) => setTimeout(r, SILENCE_CHECK_INTERVAL_MS));
      }
      if (!cancelled) onResult(!heardSound);
    } catch (err) {
      console.warn('[useDailyCallObject] local mic silence check failed', err);
    } finally {
      ctx?.close().catch(() => {});
    }
  })();
  return () => { cancelled = true; ctx?.close().catch(() => {}); };
}

/** `enabled: false` tears the call down (and stays torn down) -- used for
 * both "not in the call yet" (guest not yet approved) and an explicit
 * "Leave" click.
 *
 * `hasOwnerGrant` (host OR a persistent gathering_moderators appointee --
 * see LiveStage.tsx's own call site) controls two things: (1) whether
 * THIS join starts with audio already on (host/moderator, always live by
 * default per the mic-rules spec) or off (a regular participant --
 * Gathering Room speaker permissions are host-enforced from the moment
 * they join, not just once the host gets around to it), and (2) is passed
 * through to the meeting-token fetch (with `gatheringSessionId`) so the
 * edge function can grant this client Daily's is_owner permission when
 * it's actually the verified host or one of their moderators -- see
 * create-daily-meeting-token's own doc comment. A caller claiming
 * `hasOwnerGrant:true` who is neither never gets that grant regardless of
 * what it claims, so this can't be used to self-elevate. */
export function useDailyCallObject(
  roomKind: DailyRoomKind | null,
  roomId: string | null,
  displayName: string,
  enabled: boolean,
  hasOwnerGrant: boolean,
  gatheringSessionId?: string | null,
): UseDailyCallObjectResult {
  const callRef = useRef<DailyCall | null>(null);
  const [participants, setParticipants] = useState<Record<string, CallParticipant>>({});
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(hasOwnerGrant);
  const [videoOn, setVideoOn] = useState(false);
  const [localMicSilent, setLocalMicSilent] = useState(false);
  const stopSilenceMonitorRef = useRef<(() => void) | null>(null);
  const checkedLocalTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !roomKind || !roomId) return;
    let cancelled = false;
    setConnecting(true);
    setError(null);

    (async () => {
      try {
        const { room_url, token } = await fetchDailyMeetingToken({ roomKind, roomId, displayName, gatheringSessionId });
        if (cancelled) return;

        const call = DailyIframe.createCallObject({ subscribeToTracksAutomatically: true });
        callRef.current = call;

        // Raw tracks.audio/video.state per remote participant, keyed by
        // session_id -- diffed on every sync so a track getting stuck (e.g.
        // audio parked at 'loading'/'sendable' while video reaches
        // 'playable') shows up as a log line instead of silent, unheard
        // audio with nothing to go on afterward.
        const lastLoggedStateRef: Record<string, string> = {};
        // Which local audio track.id has already been diagnosed/silence-
        // checked -- a fresh device switch or re-publish gets a fresh check,
        // but `participant-updated` firing repeatedly for the SAME track
        // (network stats, etc.) must not restart it every time.
        const syncParticipants = () => {
          const all = call.participants();
          const next: Record<string, CallParticipant> = {};
          for (const key of Object.keys(all)) {
            const p = all[key];
            next[key] = toCallParticipant(p);
            if (!p.local) {
              const stateKey = `${p.tracks?.audio?.state ?? 'none'}|${p.tracks?.video?.state ?? 'none'}`;
              if (lastLoggedStateRef[key] !== stateKey) {
                lastLoggedStateRef[key] = stateKey;
                console.warn(`[useDailyCallObject] remote ${p.user_name} track state -- audio: ${p.tracks?.audio?.state ?? 'none'}, video: ${p.tracks?.video?.state ?? 'none'}`);
              }
            } else {
              // Local publish diagnostics -- distinguishes "this client
              // never sent audio" (visible here, on the sender) from "the
              // listener never received it" (the remote-side log above, on
              // everyone else). Logged once per distinct track, not on
              // every participant-updated.
              const localTrack = p.tracks?.audio?.persistentTrack ?? p.tracks?.audio?.track ?? null;
              const audioRequested = p.tracks?.audio?.state !== 'off' && p.tracks?.audio?.state !== 'blocked';
              if (localTrack && localTrack.id !== checkedLocalTrackIdRef.current) {
                checkedLocalTrackIdRef.current = localTrack.id;
                stopSilenceMonitorRef.current?.();
                stopSilenceMonitorRef.current = null;
                const settings = localTrack.getSettings?.() ?? {};
                console.warn(
                  `[useDailyCallObject] local mic published -- state: ${p.tracks?.audio?.state}, ` +
                  `readyState: ${localTrack.readyState}, muted: ${localTrack.muted}, ` +
                  `deviceId: ${(settings as MediaTrackSettings).deviceId ?? 'unknown'}, label: ${localTrack.label || 'unknown'}`
                );
                if (audioRequested) {
                  stopSilenceMonitorRef.current = monitorLocalMicSilence(localTrack, (silent) => {
                    setLocalMicSilent(silent);
                    console.warn(silent
                      ? '[useDailyCallObject] local mic track is live but SILENT -- captured device is producing no audio'
                      : '[useDailyCallObject] local mic track confirmed producing real audio');
                  });
                }
              } else if (!localTrack && checkedLocalTrackIdRef.current) {
                // Track disappeared (device unplugged, permission revoked
                // mid-call, etc.) -- audioOn still says "on" from our own
                // toggle state, so this is exactly the "no live audio
                // track" case, no monitor needed to know it.
                checkedLocalTrackIdRef.current = null;
                stopSilenceMonitorRef.current?.();
                stopSilenceMonitorRef.current = null;
                if (audioRequested) setLocalMicSilent(true);
              }
            }
          }
          setParticipants(next);
        };

        call.on('joined-meeting', () => { setJoined(true); setConnecting(false); syncParticipants(); });
        call.on('participant-joined', syncParticipants);
        call.on('participant-updated', syncParticipants);
        call.on('participant-left', syncParticipants);
        // `participant-updated` is documented to cover track-state changes
        // too, but a remote AUDIO track reaching 'playable' has been seen
        // (reported live, 2026-09-14: guest's video played on the host with
        // a working mic locally, host never received any audio -- no
        // "tap to enable sound" banner either, meaning ParticipantAudio's
        // <audio> never even got a track to attach) without a
        // `participant-updated` following it, on this SDK version. These are
        // Daily's own dedicated per-track lifecycle events -- explicitly
        // resyncing our participant map from both closes that gap instead of
        // trusting `participant-updated` alone to have covered it.
        call.on('track-started', (ev: any) => {
          console.warn('[useDailyCallObject] track-started', ev?.participant?.user_name, ev?.track?.kind, ev?.participant?.local ? '(local)' : '(remote)');
          syncParticipants();
        });
        call.on('track-stopped', (ev: any) => {
          console.warn('[useDailyCallObject] track-stopped', ev?.participant?.user_name, ev?.track?.kind, ev?.participant?.local ? '(local)' : '(remote)');
          syncParticipants();
        });
        call.on('left-meeting', () => { setJoined(false); setParticipants({}); });
        call.on('camera-error', () => setError('Could not access your camera or microphone.'));
        call.on('error', (e: any) => {
          console.error('useDailyCallObject: error', e);
          setError(e?.errorMsg || 'Call error');
          setConnecting(false);
        });

        // Which Daily room THIS participant actually joined -- see
        // useTribalLiveOrchard.ts's goLive() doc comment for the room-
        // identity bug this pairs with. Two participants who should be in
        // the same live but log a DIFFERENT room_url here is the direct,
        // unambiguous signature of that split -- independent of whether
        // the gathering_sessions row / stage channel (useLiveStage's own
        // logging) matched.
        console.warn(`[useDailyCallObject] joining room: ${roomId}, url: ${room_url}, as: ${displayName}`);

        await call.join({
          url: room_url,
          token,
          userName: displayName,
          startVideoOff: true,
          // Speaker permissions are host-enforced from the moment of join,
          // not left to each participant's own mic-toggle default -- see
          // this hook's own doc comment and LiveStage.tsx's speaker-
          // reconciliation effect, which immediately force-mutes a
          // non-host's Daily track server-side anyway. Starting it off
          // client-side too means there's no in-between instant where a
          // fresh joiner is briefly publishing audio before the host's
          // updateParticipant call lands.
          startAudioOff: !hasOwnerGrant,
        });
        if (cancelled) { teardownDailyCall(call); return; }
      } catch (e: any) {
        if (!cancelled) {
          console.error('useDailyCallObject: join failed', e);
          setError(e?.message || 'Could not start the call');
          setConnecting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      const call = callRef.current;
      callRef.current = null;
      teardownDailyCall(call);
      stopSilenceMonitorRef.current?.();
      stopSilenceMonitorRef.current = null;
      checkedLocalTrackIdRef.current = null;
      setJoined(false);
      setConnecting(false);
      setParticipants({});
      setAudioOn(hasOwnerGrant);
      setVideoOn(false);
      setLocalMicSilent(false);
    };
  }, [enabled, roomKind, roomId, displayName, hasOwnerGrant, gatheringSessionId]);

  const toggleAudio = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    setAudioOn((prev) => {
      const next = !prev;
      call.setLocalAudio(next);
      // An intentional mute isn't a "broken mic" -- clear any stale warning
      // immediately instead of leaving it up until the next silence check.
      // Re-enabling forces a fresh check even if Daily hands back the SAME
      // track object it did before (common -- setLocalAudio(true) usually
      // resumes the existing track rather than capturing a new one), by
      // resetting the "already checked" ref the next syncParticipants()
      // keys off of.
      stopSilenceMonitorRef.current?.();
      stopSilenceMonitorRef.current = null;
      checkedLocalTrackIdRef.current = null;
      setLocalMicSilent(false);
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    setVideoOn((prev) => {
      const next = !prev;
      call.setLocalVideo(next);
      return next;
    });
  }, []);

  const setRemoteAudio = useCallback((sessionId: string, on: boolean) => {
    callRef.current?.updateParticipant(sessionId, { setAudio: on });
  }, []);

  const ejectRemote = useCallback((sessionId: string) => {
    callRef.current?.updateParticipant(sessionId, { eject: true });
  }, []);

  return { participants, joined, connecting, error, audioOn, videoOn, toggleAudio, toggleVideo, localMicSilent, setRemoteAudio, ejectRemote };
}
