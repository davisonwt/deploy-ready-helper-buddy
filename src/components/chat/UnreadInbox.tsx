import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, Users, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InboxRow {
  roomId: string;
  name: string;
  roomType: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string | null;
}

const EPOCH = '1970-01-01';

function previewText(msg: { content?: string | null; message_type?: string | null; sender_id?: string | null } | null): string {
  if (!msg) return 'No messages yet';
  if (msg.message_type === 'bestowal_receipt') return msg.content || 'Receipt';
  const prefix = msg.sender_id === null ? 'Sow2Grow: ' : '';
  const text = (msg.content || '').trim();
  const truncated = text.length > 90 ? `${text.slice(0, 90)}…` : text;
  return `${prefix}${truncated}` || 'New message';
}

function displayNameOf(p: { display_name?: string | null; first_name?: string | null; last_name?: string | null } | undefined): string {
  if (!p) return 'Unknown';
  return p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
}

interface UnreadInboxProps {
  onOpenRoom: (roomId: string) => void;
  onBack: () => void;
}

export function UnreadInbox({ onOpenRoom, onBack }: UnreadInboxProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: parts } = await supabase
        .from('chat_participants')
        .select('room_id, last_read_at')
        .eq('user_id', user.id)
        .eq('is_active', true);
      const participantRows = parts || [];
      if (participantRows.length === 0) {
        setRows([]);
        return;
      }
      const roomIds = participantRows.map((p) => p.room_id);
      const lastReadByRoom = new Map(participantRows.map((p) => [p.room_id, p.last_read_at || EPOCH]));

      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id, name, room_type, updated_at')
        .in('id', roomIds);

      // Direct rooms store a useless literal "Direct Chat" name (see
      // get_or_create_direct_room) — resolve "Name & Name" from the real
      // participants instead.
      const directRoomIds = (rooms || []).filter((r) => r.room_type === 'direct').map((r) => r.id);
      const otherNameByRoom = new Map<string, string>();
      if (directRoomIds.length > 0) {
        const { data: directParts } = await supabase
          .from('chat_participants')
          .select('room_id, user_id')
          .in('room_id', directRoomIds)
          .eq('is_active', true);
        const otherIds = [...new Set((directParts || []).filter((p) => p.user_id !== user.id).map((p) => p.user_id))];
        const profileIds = [...new Set([...otherIds, user.id])];
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('user_id, display_name, first_name, last_name')
          .in('user_id', profileIds);
        const profileByUser = new Map((profiles || []).map((p) => [p.user_id, p]));
        const selfName = displayNameOf(profileByUser.get(user.id));
        for (const dp of directParts || []) {
          if (dp.user_id === user.id) continue;
          const other = displayNameOf(profileByUser.get(dp.user_id));
          otherNameByRoom.set(dp.room_id, `${selfName} & ${other}`);
        }
      }

      const enriched = await Promise.all((rooms || []).map(async (room) => {
        const lastReadAt = lastReadByRoom.get(room.id) || EPOCH;

        const { data: lastMsgRows } = await supabase
          .from('chat_messages')
          .select('content, message_type, sender_id, created_at')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const lastMsg = lastMsgRows?.[0] || null;

        // sender_id.neq.<id> alone is plain SQL <>, which is NULL (excluded)
        // for a NULL sender_id — silently dropping every system message
        // (thank-yous, receipts). This OR reads as "sender_id IS DISTINCT
        // FROM me" instead — the same rule DashboardTribeStats' Unread tile
        // uses, so this inbox's counts always match what the tile shows.
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .or(`sender_id.is.null,sender_id.neq.${user.id}`)
          .gt('created_at', lastReadAt);

        return {
          roomId: room.id,
          name: room.room_type === 'direct' ? (otherNameByRoom.get(room.id) || room.name) : room.name,
          roomType: room.room_type,
          unreadCount: count || 0,
          lastMessage: previewText(lastMsg),
          lastMessageAt: lastMsg?.created_at ?? room.updated_at,
        } as InboxRow;
      }));

      // Only list rooms with actual message activity — an empty room has
      // nothing to preview and isn't part of "the messages it counts".
      const withActivity = enriched.filter((r) => r.lastMessageAt);

      withActivity.sort((a, b) => {
        const aUnread = a.unreadCount > 0 ? 1 : 0;
        const bUnread = b.unreadCount > 0 ? 1 : 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
      });

      setRows(withActivity);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    if (!user?.id) return;
    const channel = supabase
      .channel(`unread-inbox-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    const interval = setInterval(load, 15000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [user?.id, load]);

  const openRoom = async (roomId: string) => {
    if (user?.id) {
      try {
        await supabase
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('room_id', roomId)
          .eq('user_id', user.id);
      } catch {
        // Best-effort — worst case the badge stays stale until the next read.
      }
    }
    onOpenRoom(roomId);
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-2 px-0 text-[#8AA99A] hover:text-[#F3F7F0] hover:bg-transparent"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Button>

      <div>
        <h1
          className="text-4xl tracking-tight text-[#F3F7F0]"
          style={{ fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 600 }}
        >
          Inbox
        </h1>
        <p className="text-sm text-[#8AA99A] mt-1">
          Every conversation with unread messages — thank-yous, receipts, and replies.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="bg-[#123330]/60 border-[#4FA876]/20">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-[#4FA876]" />
            <p className="text-[#F3F7F0] font-semibold mb-1">All caught up</p>
            <p className="text-sm text-[#8AA99A]">No conversations yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Card
              key={row.roomId}
              className="bg-[#123330]/60 border-[#4FA876]/20 hover:border-[#4FA876]/50 transition-colors cursor-pointer"
              onClick={() => openRoom(row.roomId)}
            >
              <CardContent className="py-3 flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-emerald-900/40 text-emerald-300">
                    {row.roomType === 'direct' ? <MessageSquare className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#F3F7F0] truncate">{row.name}</span>
                    {row.unreadCount > 0 && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white shrink-0">{row.unreadCount}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-[#8AA99A] truncate">{row.lastMessage}</p>
                </div>
                {row.lastMessageAt && (
                  <span className="text-xs text-[#8AA99A] shrink-0">
                    {formatDistanceToNow(new Date(row.lastMessageAt), { addSuffix: true })}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
