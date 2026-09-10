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
 * Two-step check: enumerateDevices() alone can't be trusted -- it lists a
 * device's kind even when permission to actually use it is denied. A
 * short-lived getUserMedia probe (immediately stopped, Daily's own join
 * acquires the real stream) confirms access actually works. Any of the
 * errors a real join would hit (NotAllowedError, NotFoundError,
 * NotReadableError, OverconstrainedError) or anything unexpected fails
 * safe toward "no devices" -- viewer mode is always recoverable, a hung
 * join is not.
 */
export async function checkDeviceAvailability(): Promise<DeviceAvailability> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return { hasCamera: false, hasMic: false };
  }

  let hasCamera = false;
  let hasMic = false;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    hasCamera = devices.some((d) => d.kind === 'videoinput');
    hasMic = devices.some((d) => d.kind === 'audioinput');
  } catch {
    return { hasCamera: false, hasMic: false };
  }
  if (!hasCamera && !hasMic) return { hasCamera: false, hasMic: false };

  try {
    const probe = await navigator.mediaDevices.getUserMedia({ video: hasCamera, audio: hasMic });
    probe.getTracks().forEach((t) => t.stop());
    return { hasCamera, hasMic };
  } catch (err: unknown) {
    const name = (err as { name?: string } | undefined)?.name;
    if (name === 'NotAllowedError' || name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError') {
      return { hasCamera: false, hasMic: false };
    }
    return { hasCamera: false, hasMic: false };
  }
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
