import { useEffect, useState } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';

/**
 * Daily.co call setup (P1-6, replacing Jitsi). Every existing Jitsi
 * integration ran with no JWT/room security at all -- see
 * AUDIT-2026-09-05.md P1-6. `create-daily-meeting-token` is the one place
 * Daily's API key is used; the client only ever receives a short-lived,
 * per-user meeting token plus the room URL it's valid for.
 */
export type DailyRoomKind = 'call_session' | 'chat_room' | 'custom';

export interface DailyMeetingToken {
  room_url: string;
  token: string;
  room_name: string;
}

export async function fetchDailyMeetingToken(input: {
  roomKind: DailyRoomKind;
  roomId: string;
  displayName?: string;
}): Promise<DailyMeetingToken> {
  return invokePaymentFunction<DailyMeetingToken>('create-daily-meeting-token', {
    roomKind: input.roomKind,
    roomId: input.roomId,
    displayName: input.displayName,
  });
}

export interface DeviceAvailability {
  hasCamera: boolean;
  hasMic: boolean;
}

/**
 * Checks for a usable camera/mic BEFORE calling Daily's `.join()`. A
 * device-less machine (or one where permission is denied) left Daily's
 * own internal getUserMedia call to hang or throw mid-join with no way
 * back for the caller -- every join path that uses the createFrame()+
 * join() SDK shape (JitsiCall.tsx, JitsiRoom.tsx) should call this first
 * and pass the result as startVideoOff/startAudioOff instead.
 *
 * Real production bug this fixes: the previous version enumerated
 * devices, then made ONE COMBINED getUserMedia({video, audio}) probe and
 * treated ANY failure of that combined request -- whatever the error --
 * as "neither device exists." On iOS Safari a caller's mic worked fine
 * on its own, but the combined video+audio request failed for an
 * unrelated reason; the combined-failure branch silently reported
 * hasMic:false too, so the caller joined with startAudioOff:true --
 * visible, but never audible, to the callee.
 *
 * Fixed by probing each device SEPARATELY (never a combined constraints
 * object), and only ever concluding "unavailable" on the two errors that
 * actually mean that: NotFoundError (no such device) and NotAllowedError
 * (permission denied). enumerateDevices() is no longer part of the
 * decision at all -- on iOS Safari it reports devices with an empty
 * deviceId/label before permission is granted, which is fine (this
 * never read either field), but it's simpler and more robust to let a
 * direct getUserMedia call be the single source of truth than to gate
 * on a pre-check whose only signal (device .kind) getUserMedia's own
 * result already implies. Any other error (OverconstrainedError,
 * NotReadableError, a transient failure) is logged and treated as
 * "probably fine" -- Daily's own join gets to try for real -- rather
 * than silently muting a working device over it.
 */
async function probeDevice(constraints: MediaStreamConstraints): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch (err: unknown) {
    const name = (err as { name?: string } | undefined)?.name;
    if (name === 'NotFoundError' || name === 'NotAllowedError') return false;
    console.warn(`checkDeviceAvailability: unexpected getUserMedia(${JSON.stringify(constraints)}) error, assuming the device is usable`, err);
    return true;
  }
}

export async function checkDeviceAvailability(wantVideo = true): Promise<DeviceAvailability> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return { hasCamera: false, hasMic: false };
  }
  const hasMic = await probeDevice({ audio: true });
  const hasCamera = wantVideo ? await probeDevice({ video: true }) : false;
  return { hasCamera, hasMic };
}

export const DAILY_JOIN_TIMEOUT_MS = 10_000;

export interface DailyJoinWatchdog {
  clear: () => void;
}

/**
 * Starts a join watchdog: fires `onTimeout` once after `ms` unless
 * `clear()` is called first -- call `clear()` from the 'joined-meeting'
 * handler the instant it fires. Deliberately NOT a Promise.race against
 * call.join() (an earlier version did this): with a room's prejoin UI on
 * ("Are you ready to join?"), join()'s own promise doesn't resolve until
 * a human taps its button, which can be minutes after our 10s budget --
 * racing the promise made a real, slow-but-legitimate join look
 * indistinguishable from a genuine hang. An independent, explicitly
 * cleared timer can tell them apart.
 */
export function startDailyJoinWatchdog(onTimeout: () => void, ms: number = DAILY_JOIN_TIMEOUT_MS): DailyJoinWatchdog {
  const timer = setTimeout(onTimeout, ms);
  return { clear: () => clearTimeout(timer) };
}

/**
 * Idempotent, crash-proof teardown for a Daily call object -- safe to
 * call more than once (a `null` call is a no-op) and safe to call after
 * Daily has already torn its own iframe down internally. That last case
 * is a real crash seen in production: destroy() ends up calling
 * postMessage on a contentWindow that's already gone, and that throws
 * SYNCHRONOUSLY, not as a rejected promise -- `.catch()` chained onto the
 * call alone does not protect against it, hence the try/catch here too.
 */
export function teardownDailyCall(call: DailyCall | null): void {
  if (!call) return;
  try { call.leave()?.catch?.(() => {}); } catch { /* frame already torn down */ }
  try { call.destroy()?.catch?.(() => {}); } catch { /* frame already torn down */ }
}

/**
 * For the handful of call embeds that use a bare `<iframe src=...>` instead
 * of the daily-js SDK (no custom mute/leave controls of our own to wire up
 * -- Daily's own built-in prebuilt UI is the whole UI). Returns a ready
 * `?t=<token>` URL once the token's minted, or null while loading/on error.
 */
export function useDailyIframeSrc(roomKind: DailyRoomKind | null, roomId: string | null, displayName?: string) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomKind || !roomId) { setSrc(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDailyMeetingToken({ roomKind, roomId, displayName })
      .then(({ room_url, token }) => {
        if (cancelled) return;
        setSrc(`${room_url}?t=${encodeURIComponent(token)}`);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('useDailyIframeSrc: token fetch failed', e);
        setError(e?.message || 'Could not start the call');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomKind, roomId]);

  return { src, loading, error };
}
