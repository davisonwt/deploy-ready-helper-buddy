/**
 * One list of conversations.
 *
 * A conversation is people. Whether the underlying chat_rooms row says
 * room_type 'direct' or 'group' is a database detail a member should never
 * feel, so this hook reads both and returns one shape.
 *
 * READ ONLY, and deliberately so: it queries the same chat_rooms /
 * chat_messages / chat_participants the old surfaces use, writes nothing,
 * and migrates nothing. The 205 historical direct messages and the
 * community room are the same rows either way -- this is a second window
 * onto them, not a replacement.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationPerson {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export interface Conversation {
  id: string;
  /** What to show as the conversation's name. Never "Direct chat". */
  title: string;
  people: ConversationPerson[];
  lastMessage: string | null;
  lastMessageAt: string | null;
  /** Kept for ordering and debugging only -- never shown to a member. */
  roomType: string;
}

/**
 * Names chat_rooms carries for rooms nobody named. "Direct Chat" is the
 * database's word for a two-person room, and showing it is exactly the
 * split this surface exists to remove -- a member should see the person
 * they are talking to, not the row's type.
 */
const PLACEHOLDER_NAMES = new Set(['direct chat', 'chat', 'new chat', 'direct', 'group chat', 'untitled']);

function realRoomName(raw: string | null | undefined): string {
  const name = (raw ?? '').trim();
  return PLACEHOLDER_NAMES.has(name.toLowerCase()) ? '' : name;
}

function personName(p: Record<string, unknown> | undefined): string {
  if (!p) return 'Someone';
  const display = (p.display_name as string | null) ?? null;
  if (display && display.trim()) return display.trim();
  const first = ((p.first_name as string | null) ?? '').trim();
  const last = ((p.last_name as string | null) ?? '').trim();
  const full = `${first} ${last}`.trim();
  return full || 'Someone';
}

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Rooms I am in -- direct and group alike, no filter on room_type.
      const { data: mine, error: mineErr } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      if (mineErr) throw mineErr;

      const roomIds = [...new Set((mine ?? []).map((r) => (r as { room_id: string }).room_id))];
      if (roomIds.length === 0) {
        setConversations([]);
        return;
      }

      // 2. The rooms themselves.
      const { data: rooms, error: roomsErr } = await supabase
        .from('chat_rooms')
        .select('id, name, room_type, is_active, updated_at, created_at')
        .in('id', roomIds)
        .eq('is_active', true);
      if (roomsErr) throw roomsErr;

      // 3. Everyone in them, so a conversation can be named by its people.
      const { data: parts, error: partsErr } = await supabase
        .from('chat_participants')
        .select('room_id, user_id')
        .in('room_id', roomIds)
        .eq('is_active', true);
      if (partsErr) throw partsErr;

      const otherIds = [
        ...new Set(
          (parts ?? [])
            .map((p) => (p as { user_id: string }).user_id)
            .filter((id) => id !== userId),
        ),
      ];

      let profileById = new Map<string, Record<string, unknown>>();
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .in('user_id', otherIds);
        profileById = new Map(
          (profiles ?? []).map((p) => [(p as { user_id: string }).user_id, p as Record<string, unknown>]),
        );
      }

      // 4. The latest message per room, for the preview line and ordering.
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('room_id, content, created_at')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(400);

      const latestByRoom = new Map<string, { content: string | null; created_at: string }>();
      for (const m of (messages ?? []) as Array<{ room_id: string; content: string | null; created_at: string }>) {
        if (!latestByRoom.has(m.room_id)) latestByRoom.set(m.room_id, m);
      }

      const peopleByRoom = new Map<string, ConversationPerson[]>();
      for (const p of (parts ?? []) as Array<{ room_id: string; user_id: string }>) {
        if (p.user_id === userId) continue;
        const profile = profileById.get(p.user_id);
        const list = peopleByRoom.get(p.room_id) ?? [];
        list.push({
          userId: p.user_id,
          name: personName(profile),
          avatarUrl: (profile?.avatar_url as string | null) ?? null,
        });
        peopleByRoom.set(p.room_id, list);
      }

      const built: Conversation[] = ((rooms ?? []) as Array<Record<string, unknown>>).map((room) => {
        const id = room.id as string;
        const people = peopleByRoom.get(id) ?? [];
        const roomName = realRoomName(room.name as string | null);
        const last = latestByRoom.get(id) ?? null;

        // A conversation is people. One other person means their name,
        // whatever the row happens to be called -- never "Direct chat",
        // which is the database talking rather than the member's own life.
        // A room someone deliberately named keeps that name.
        const peopleNames = people.map((p) => p.name).join(', ');
        const title = people.length === 1
          ? people[0].name
          : (roomName || peopleNames || 'Just you so far');

        return {
          id,
          title,
          people,
          lastMessage: last?.content ?? null,
          lastMessageAt: last?.created_at ?? (room.updated_at as string | null) ?? null,
          roomType: (room.room_type as string | null) ?? 'group',
        };
      });

      built.sort((a, b) => {
        const at = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
        const bt = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
        return bt - at;
      });

      setConversations(built);
    } catch (err) {
      console.error('[conversations] load failed', err);
      setError(err instanceof Error ? err.message : 'Could not load your conversations.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { conversations, loading, error, reload: load };
}
