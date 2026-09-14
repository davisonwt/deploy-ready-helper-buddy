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
}

/** `enabled: false` tears the call down (and stays torn down) -- used for
 * both "not in the call yet" (guest not yet approved) and an explicit
 * "Leave" click. */
export function useDailyCallObject(
  roomKind: DailyRoomKind | null,
  roomId: string | null,
  displayName: string,
  enabled: boolean,
): UseDailyCallObjectResult {
  const callRef = useRef<DailyCall | null>(null);
  const [participants, setParticipants] = useState<Record<string, CallParticipant>>({});
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(false);

  useEffect(() => {
    if (!enabled || !roomKind || !roomId) return;
    let cancelled = false;
    setConnecting(true);
    setError(null);

    (async () => {
      try {
        const { room_url, token } = await fetchDailyMeetingToken({ roomKind, roomId, displayName });
        if (cancelled) return;

        const call = DailyIframe.createCallObject({ subscribeToTracksAutomatically: true });
        callRef.current = call;

        // Raw tracks.audio/video.state per remote participant, keyed by
        // session_id -- diffed on every sync so a track getting stuck (e.g.
        // audio parked at 'loading'/'sendable' while video reaches
        // 'playable') shows up as a log line instead of silent, unheard
        // audio with nothing to go on afterward.
        const lastLoggedStateRef: Record<string, string> = {};
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

        await call.join({
          url: room_url,
          token,
          userName: displayName,
          startVideoOff: true,
          startAudioOff: false,
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
      setJoined(false);
      setConnecting(false);
      setParticipants({});
      setAudioOn(true);
      setVideoOn(false);
    };
  }, [enabled, roomKind, roomId, displayName]);

  const toggleAudio = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    setAudioOn((prev) => {
      const next = !prev;
      call.setLocalAudio(next);
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

  return { participants, joined, connecting, error, audioOn, videoOn, toggleAudio, toggleVideo };
}
