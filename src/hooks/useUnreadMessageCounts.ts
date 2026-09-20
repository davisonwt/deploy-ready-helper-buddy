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
 * Module-level singleton (same pattern as useNavCounts.ts), NOT a
 * per-mount Supabase channel: /cockpit alone can mount two or more
 * consumers of this hook at once (the page's own pill plus the left-nav
 * row), and each call to supabase.channel() with the same topic name
 * returns the SAME underlying channel object -- a second .on(...) call
 * on it after the first has already .subscribe()'d throws
 * "cannot add postgres_changes callbacks ... after subscribe()" and takes
 * the whole page down with it (confirmed live, 2026-09-20, adding the
 * left-nav badge). One channel for the app's lifetime, shared by however
 * many components read it, fixes that at the root instead of per call site.
 *
 * Refreshes on first subscribe, on any chat_messages insert or update (a
 * soft delete is an update -- debounced), and every 60s as a backstop --
 * there is no chat presence mechanism in this codebase to know a room is
 * "still open" more precisely than that.
 */
import { useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Listener = () => void;

const POLL_MS = 60_000;
const DEBOUNCE_MS = 500;

let unreadByRoom: Record<string, number> = {};
let currentUserId: string | undefined;
let loading = false;
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

function ensureChannel() {
  if (channel) return;
  channel = supabase
    .channel('unread-counts-singleton')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, scheduleReload)
    // A delete is a soft-delete UPDATE (deleted_at set), not a DELETE --
    // without listening here, a deleted unread message would only drop
    // off the badge on the next 60s poll instead of live.
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, scheduleReload)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_participants' }, scheduleReload)
    .subscribe();
}

function ensurePoll() {
  if (pollTimer) return;
  pollTimer = setInterval(() => { void fetchUnread(); }, POLL_MS);
}

function getUnreadByRoom(): Record<string, number> {
  return unreadByRoom;
}

function subscribeUnread(userId: string | undefined, listener: Listener): () => void {
  listeners.add(listener);
  if (!userId) return () => { listeners.delete(listener); };

  // A real account switch (not just the normal undefined -> real-id
  // mount sequence every page load goes through) starts over -- the
  // previous user's numbers must never leak into the new one's badge.
  if (currentUserId !== undefined && currentUserId !== userId) {
    unreadByRoom = {};
  }
  const isNewUser = currentUserId !== userId;
  currentUserId = userId;

  ensureChannel();
  ensurePoll();
  if (isNewUser) void fetchUnread();

  return () => { listeners.delete(listener); };
}

export function useUnreadMessageCounts(userId: string | undefined) {
  const byRoom = useSyncExternalStore(
    (listener) => subscribeUnread(userId, listener),
    getUnreadByRoom,
    getUnreadByRoom,
  );
  const totalUnread = Object.values(byRoom).reduce((sum, n) => sum + n, 0);
  return { unreadByRoom: byRoom, totalUnread, refetch: fetchUnread };
}
