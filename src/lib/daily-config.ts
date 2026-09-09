import { useEffect, useState } from 'react';
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
