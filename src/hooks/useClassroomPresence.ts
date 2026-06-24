import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Attendee-side presence engine. Owns:
 *   - heartbeat (tab focus + recent user activity) -> updates presence_status
 *   - accumulated active/away seconds
 *   - random check-in scheduling (standard/strict modes)
 *
 * Camera enforcement is wired separately because it needs the Jitsi api ref.
 */

export type AttendanceMode = 'relaxed' | 'standard' | 'strict';
export type PresenceStatus = 'present' | 'away' | 'absent';

interface Args {
  sessionId: string;
  userId: string | null;
  isHost: boolean;
  attendanceMode: AttendanceMode;
  joined: boolean;
}

const HEARTBEAT_MS = 30_000;
const AWAY_AFTER_MS = 90_000;    // no activity for 90s -> Away
const ABSENT_AFTER_MS = 180_000; // no activity for 3 min -> Absent
const CHECKIN_GRACE_MS = 30_000;
const CHECKIN_MIN_MS = 5 * 60_000;
const CHECKIN_MAX_MS = 15 * 60_000;
const MAX_MISSED_CHECKINS = 2;

export function useClassroomPresence({ sessionId, userId, isHost, attendanceMode, joined }: Args) {
  const lastActivityRef = useRef<number>(Date.now());
  const lastTickRef = useRef<number>(Date.now());
  const totalsRef = useRef({ active: 0, away: 0 });
  const statusRef = useRef<PresenceStatus>('present');
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInDeadline, setCheckInDeadline] = useState<number | null>(null);
  const missedRef = useRef(0);
  const checkInTimerRef = useRef<number | null>(null);
  const checkInExpireRef = useRef<number | null>(null);

  /* -------- activity tracking -------- */
  useEffect(() => {
    if (!joined || isHost) return;
    const bump = () => { lastActivityRef.current = Date.now(); };
    const events: (keyof DocumentEventMap)[] = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    document.addEventListener('visibilitychange', bump);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener('visibilitychange', bump);
    };
  }, [joined, isHost]);

  /* -------- heartbeat -------- */
  useEffect(() => {
    if (!joined || !userId || isHost) return;

    const tick = async () => {
      const now = Date.now();
      const elapsed = Math.min(HEARTBEAT_MS, now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      const idleMs = now - lastActivityRef.current;
      const hidden = typeof document !== 'undefined' && document.hidden;

      let next: PresenceStatus = 'present';
      if (hidden || idleMs >= ABSENT_AFTER_MS) next = 'absent';
      else if (idleMs >= AWAY_AFTER_MS) next = 'away';

      if (next === 'present') totalsRef.current.active += elapsed;
      else totalsRef.current.away += elapsed;

      const changed = next !== statusRef.current;
      statusRef.current = next;

      await supabase
        .from('live_session_participants')
        .update({
          presence_status: next,
          last_ping_at: new Date(now).toISOString(),
          total_active_seconds: Math.round(totalsRef.current.active),
          total_away_seconds: Math.round(totalsRef.current.away),
        } as any)
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      return changed;
    };

    // run an immediate tick so the host sees us right away
    void tick();
    const id = window.setInterval(tick, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [joined, userId, isHost, sessionId]);

  /* -------- random check-ins (standard + strict only) -------- */
  const scheduleNextCheckIn = useCallback(() => {
    if (checkInTimerRef.current) window.clearTimeout(checkInTimerRef.current);
    if (attendanceMode === 'relaxed') return;
    const delay = CHECKIN_MIN_MS + Math.random() * (CHECKIN_MAX_MS - CHECKIN_MIN_MS);
    checkInTimerRef.current = window.setTimeout(() => fireCheckIn(), delay);
  }, [attendanceMode]);

  const fireCheckIn = useCallback(async () => {
    if (!userId) return;
    const deadline = Date.now() + CHECKIN_GRACE_MS;
    setCheckInDeadline(deadline);
    setCheckInOpen(true);
    await supabase
      .from('live_session_participants')
      .update({ check_in_required_at: new Date().toISOString() } as any)
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (checkInExpireRef.current) window.clearTimeout(checkInExpireRef.current);
    checkInExpireRef.current = window.setTimeout(async () => {
      setCheckInOpen(false);
      missedRef.current += 1;
      const updates: any = { missed_check_ins: missedRef.current };
      if (missedRef.current >= MAX_MISSED_CHECKINS) updates.presence_status = 'absent';
      await supabase
        .from('live_session_participants')
        .update(updates)
        .eq('session_id', sessionId)
        .eq('user_id', userId);
      scheduleNextCheckIn();
    }, CHECKIN_GRACE_MS);
  }, [userId, sessionId, scheduleNextCheckIn]);

  const respondCheckIn = useCallback(async () => {
    if (!userId) return;
    setCheckInOpen(false);
    if (checkInExpireRef.current) {
      window.clearTimeout(checkInExpireRef.current);
      checkInExpireRef.current = null;
    }
    missedRef.current = 0;
    lastActivityRef.current = Date.now();
    await supabase
      .from('live_session_participants')
      .update({
        check_in_responded_at: new Date().toISOString(),
        presence_status: 'present',
        missed_check_ins: 0,
      } as any)
      .eq('session_id', sessionId)
      .eq('user_id', userId);
    scheduleNextCheckIn();
  }, [userId, sessionId, scheduleNextCheckIn]);

  useEffect(() => {
    if (!joined || isHost) return;
    scheduleNextCheckIn();
    return () => {
      if (checkInTimerRef.current) window.clearTimeout(checkInTimerRef.current);
      if (checkInExpireRef.current) window.clearTimeout(checkInExpireRef.current);
    };
  }, [joined, isHost, scheduleNextCheckIn]);

  return {
    checkInOpen,
    checkInDeadline,
    respondCheckIn,
  };
}
