/**
 * One source for unread message counts, read by the conversations list's
 * own per-row indicator, the bottom-bar Chat button's total pill,
 * DashboardTribeStats' Messages tile, and UnreadInbox --
 * get_conversation_unread_counts() (2026-09-20 migration, deleted messages
 * excluded as of the 20260920260000 follow-up) is the single query all
 * four read, so none can disagree the way three independently-written
 * unread loops already could.
 *
 * Refreshes on mount, on any chat_messages insert or update (a soft
 * delete is an update -- debounced), and every 60s as a backstop -- there
 * is no chat presence mechanism in this codebase to know a room is "still
 * open" more precisely than that.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const POLL_MS = 60_000;
const DEBOUNCE_MS = 500;

export function useUnreadMessageCounts(userId: string | undefined) {
  const [unreadByRoom, setUnreadByRoom] = useState<Record<string, number>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setUnreadByRoom({});
      return;
    }
    const { data, error } = await supabase.rpc('get_conversation_unread_counts');
    if (error) {
      console.error('[unread] get_conversation_unread_counts failed', error);
      return;
    }
    const map: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ room_id: string; unread_count: number }>) {
      map[row.room_id] = row.unread_count;
    }
    setUnreadByRoom(map);
  }, [userId]);

  useEffect(() => {
    void load();
    if (!userId) return;

    const scheduleReload = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { void load(); }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`unread-counts-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, scheduleReload)
      // A delete is a soft-delete UPDATE (deleted_at set), not a DELETE —
      // without listening here, a deleted unread message would only drop
      // off the badge on the next 60s poll instead of live.
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, scheduleReload)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_participants' }, scheduleReload)
      .subscribe();

    const poll = setInterval(() => { void load(); }, POLL_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const totalUnread = Object.values(unreadByRoom).reduce((sum, n) => sum + n, 0);

  return { unreadByRoom, totalUnread, refetch: load };
}
