/**
 * One source for unread message counts, read by the conversations list's
 * own per-row indicator, the bottom-bar Chat button's total pill,
 * DashboardTribeStats' Messages tile, UnreadInbox, and the left-nav
 * ChatApp row (StallSideNav / StallBookshelfNav) --
 * get_conversation_unread_counts() (2026-09-20 migration, deleted messages
 * excluded as of the 20260920260000 follow-up) is the single query all
 * of them read, so none can disagree the way independently-written unread
 * loops already could.
 *
 * Module-level singleton, exactly ONE place creates the channel, attaches
 * every listener, and subscribes -- atomically, before any consumer can
 * observe a half-built channel. Consumers never touch the Supabase channel
 * themselves, only this store.
 *
 * Why this exists as a singleton at all (P0, 2026-09-20): /cockpit alone
 * can mount two or more consumers of this hook at once (the page's own
 * pill plus the left-nav row added the same day). supabase.channel(name)
 * returns the SAME underlying object for a repeated topic name -- a
 * second .on(...) call on it after the first has already .subscribe()'d
 * throws "cannot add postgres_changes callbacks ... after subscribe()"
 * and takes the whole page down. A first fix here (bb40c088/f448796e)
 * created the channel exactly once but never tore it down and passed a
 * fresh inline closure to useSyncExternalStore as `subscribe` on every
 * render -- harmless by luck (ensureChannel's own `if (channel) return`
 * guard covered the churn), but not the structural guarantee this needs.
 * This version:
 *   - memoizes the subscribe callback per userId (useCallback), so React
 *     only actually resubscribes on a genuine mount/unmount/user-change,
 *     never on an unrelated re-render;
 *   - ref-counts listeners: the channel and poll timer are created on the
 *     first subscribe and torn down (removeChannel) on the last unsubscribe;
 *   - on a real user switch (not the normal undefined -> real-id mount
 *     sequence), tears the old channel down before creating a fresh one,
 *     so no session's listeners ever call back into a different user's
 *     closures.
 *
 * Refreshes on first subscribe, on any chat_messages insert or update (a
 * soft delete is an update -- debounced), and every 60s as a backstop --
 * there is no chat presence mechanism in this codebase to know a room is
 * "still open" more precisely than that.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Listener = () => void;

const POLL_MS = 60_000;
const DEBOUNCE_MS = 500;
const TOPIC = 'unread-counts-singleton';

let unreadByRoom: Record<string, number> = {};
let currentUserId: string | undefined;
let loading = false;
let refCount = 0;
const listeners = new Set<Listener>();
let channel: ReturnType<typeof supabase.channel> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((l) => l());
}

async function fetchUnread() {
  if (!currentUserId || loading) return;
  loading = true;
  try {
    const { data, error } = await supabase.rpc('get_conversation_unread_counts');
    if (error) {
      console.error('[unread] get_conversation_unread_counts failed', error);
      return;
    }
    const map: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ room_id: string; unread_count: number }>) {
      map[row.room_id] = row.unread_count;
    }
    unreadByRoom = map;
    notify();
  } finally {
    loading = false;
  }
}

function scheduleReload() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { void fetchUnread(); }, DEBOUNCE_MS);
}

/** The ONE place that creates a channel, attaches every listener, and
 *  subscribes -- always in that order, always atomically. Never called
 *  when `channel` is already set. */
function createAndSubscribe() {
  channel = supabase
    .channel(TOPIC)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, scheduleReload)
    // A delete is a soft-delete UPDATE (deleted_at set), not a DELETE --
    // without listening here, a deleted unread message would only drop
    // off the badge on the next 60s poll instead of live.
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, scheduleReload)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_participants' }, scheduleReload)
    .subscribe();

  pollTimer = setInterval(() => { void fetchUnread(); }, POLL_MS);
}

function teardown() {
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (channel) { supabase.removeChannel(channel); channel = null; }
}

function getUnreadByRoom(): Record<string, number> {
  return unreadByRoom;
}

function subscribeUnread(userId: string | undefined, listener: Listener): () => void {
  listeners.add(listener);
  refCount += 1;

  if (userId) {
    // A real account switch (not the normal undefined -> real-id sequence
    // every page load goes through) tears down and starts fresh -- the
    // previous user's channel/state must never leak into the new one's.
    const isRealSwitch = currentUserId !== undefined && currentUserId !== userId;
    if (isRealSwitch) teardown();
    const isNewUser = currentUserId !== userId;
    currentUserId = userId;

    if (!channel) createAndSubscribe();
    if (isNewUser) void fetchUnread();
  }

  return () => {
    listeners.delete(listener);
    refCount -= 1;
    if (refCount <= 0) {
      refCount = 0;
      teardown();
      currentUserId = undefined;
      unreadByRoom = {};
    }
  };
}

export function useUnreadMessageCounts(userId: string | undefined) {
  const subscribe = useCallback(
    (listener: Listener) => subscribeUnread(userId, listener),
    [userId],
  );
  const byRoom = useSyncExternalStore(subscribe, getUnreadByRoom, getUnreadByRoom);
  const totalUnread = Object.values(byRoom).reduce((sum, n) => sum + n, 0);
  return { unreadByRoom: byRoom, totalUnread, refetch: fetchUnread };
}
