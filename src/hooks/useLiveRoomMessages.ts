import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LiveRoomMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  message_type: 'text' | 'voice' | 'video';
  content: string | null;
  media_url: string | null;
  media_duration_seconds: number | null;
  mime_type: string | null;
  created_at: string;
};

export function useLiveRoomMessages(roomId: string | null) {
  const [messages, setMessages] = useState<LiveRoomMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('live_room_messages' as any)
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      if (!cancelled && !error && data) setMessages(data as any);
      if (!cancelled) setLoading(false);
    })();

    const channel = supabase
      .channel(`live-room-msgs-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_room_messages', filter: `room_id=eq.${roomId}` },
        payload => {
          setMessages(prev => {
            const next = payload.new as LiveRoomMessage;
            if (prev.some(m => m.id === next.id)) return prev;
            return [...prev, next];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendText = useCallback(async (senderId: string, content: string) => {
    if (!roomId || !content.trim()) return;
    const { error } = await supabase.from('live_room_messages' as any).insert({
      room_id: roomId,
      sender_id: senderId,
      message_type: 'text',
      content: content.trim(),
    });
    if (error) throw error;
  }, [roomId]);

  const sendMedia = useCallback(
    async (
      senderId: string,
      kind: 'voice' | 'video',
      mediaUrl: string,
      mimeType: string,
      duration: number,
    ) => {
      if (!roomId) return;
      const { error } = await supabase.from('live_room_messages' as any).insert({
        room_id: roomId,
        sender_id: senderId,
        message_type: kind,
        media_url: mediaUrl,
        mime_type: mimeType,
        media_duration_seconds: Math.round(duration),
      });
      if (error) throw error;
    },
    [roomId],
  );

  return { messages, loading, sendText, sendMedia };
}
