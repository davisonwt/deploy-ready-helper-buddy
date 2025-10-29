import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Users, 
  Trash2, 
  LogOut,
  ArrowRight,
  Loader2 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface ChatRoom {
  id: string;
  name: string;
  room_type: string;
  is_premium: boolean;
  updated_at: string;
  created_by: string;
  chat_participants?: any[];
}

interface ChatListProps {
  searchQuery: string;
  roomType?: 'direct' | 'group' | 'all';
  hideFilterControls?: boolean;
}

export const ChatList = ({ searchQuery, roomType = 'all', hideFilterControls = false }: ChatListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'private' | 'community'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    fetchRooms();
    const cleanup = setupRealtimeSubscription();
    const interval = setInterval(fetchRooms, 15000);
    return () => { cleanup?.(); clearInterval(interval); };
  }, [user?.id]);

  const fetchRooms = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔍 Fetching rooms for user:', user.id);

      // Primary: join chat_rooms with chat_participants for this user
      let roomsData: any[] | null = null;
      try {
        const { data: joined, error: joinError } = await supabase
          .from('chat_rooms')
          .select(`
            id,
            name,
            room_type,
            is_premium,
            updated_at,
            created_by,
            chat_participants!inner(user_id,is_active),
            counts:chat_participants(count)
          `)
          .eq('chat_participants.user_id', user.id)
.or('is_active.is.null,is_active.eq.true')
          .eq('chat_participants.is_active', true as any)
          .order('updated_at', { ascending: false });

        if (joinError) {
          console.warn('⚠️ Join query failed, will fallback:', joinError);
        } else {
          roomsData = joined;
        }
      } catch (e) {
        console.warn('⚠️ Join query threw, will fallback:', e);
      }

      // Robust fallback: fetch via participants -> rooms (avoids join/RLS quirks)
      if (!roomsData || roomsData.length === 0) {
        console.log('↪️ Fallback path: loading rooms via chat_participants list');
        const { data: parts, error: partsError } = await supabase
          .from('chat_participants')
          .select('room_id')
          .eq('user_id', user.id)
          .or('is_active.is.null,is_active.eq.true');
        if (partsError) throw partsError;
        const roomIds = Array.from(new Set((parts || []).map((p: any) => p.room_id)));

        if (roomIds.length === 0) {
          console.log('No participant rooms found for user');
          setRooms([]);
          return;
        }

        const { data: roomsRes, error: roomsErr } = await supabase
          .from('chat_rooms')
          .select('id, name, room_type, is_premium, updated_at, created_by, counts:chat_participants(count)')
          .in('id', roomIds)
          .or('is_active.is.null,is_active.eq.true')
          .order('updated_at', { ascending: false });

        if (roomsErr) throw roomsErr;
        roomsData = roomsRes;
      }

      // Map participant counts with robust handling of different shapes
      const roomsWithCounts = (roomsData || []).map((room: any) => {
        const counts = (room as any).counts;
        const participant_count =
          typeof counts === 'number'
            ? counts
            : Array.isArray(counts)
              ? (counts[0]?.count ?? 0)
              : (counts?.count ?? 0);
        return { ...room, participant_count };
      });

      console.log('✅ Rooms loaded:', roomsWithCounts);
      setRooms(roomsWithCounts);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chats',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('chat-rooms-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_rooms' },
        () => fetchRooms()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${user?.id}` },
        () => fetchRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      // Use the secure admin_delete_room RPC function
      const { data, error } = await supabase.rpc('admin_delete_room', {
        target_room_id: roomId
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Conversation deleted'
      });

      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete conversation',
        variant: 'destructive'
      });
    }
  };
  
  const handleLeaveRoom = async (roomId: string) => {
    if (!user) return;
    if (!confirm('Leave this conversation?')) return;
    try {
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);
      if (error) throw error;

      toast({
        title: 'Left conversation',
        description: 'You will no longer receive messages from this chat.'
      });
      fetchRooms();
    } catch (error) {
      console.error('Error leaving room:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave conversation',
        variant: 'destructive'
      });
    }
  };
  
  const effectiveType = roomType !== 'all'
    ? roomType
    : (filter === 'private' ? 'direct' : filter === 'community' ? 'group' : 'all');

  const isDirectRoom = (room: any) => (room.room_type ? room.room_type === 'direct' : ((room as any).participant_count ?? 0) <= 2);

  const filteredRooms = rooms
    .filter((room) => {
      // Filter by search query (trim to avoid accidental spaces hiding results)
      const q = (searchQuery || '').trim().toLowerCase();
      if (q && !((room.name || '').toLowerCase().includes(q))) {
        return false;
      }

      // Filter by type with safe fallback using participant count
      if (effectiveType === 'direct' && !isDirectRoom(room)) return false;
      if (effectiveType === 'group' && isDirectRoom(room)) return false;

      return true;
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      {!hideFilterControls && roomType === 'all' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filter === 'private' ? 'default' : 'outline'}
            onClick={() => setFilter('private')}
            className={filter === 'private' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Private
          </Button>
          <Button
            size="sm"
            variant={filter === 'community' ? 'default' : 'outline'}
            onClick={() => setFilter('community')}
            className={filter === 'community' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            <Users className="h-3 w-3 mr-1" />
            Community
          </Button>
        </div>
      )}

      {/* Room List */}
      {filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No conversations found</p>
            <p className="text-sm text-gray-500 mt-2">
              Start a new chat to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRooms.map((room) => (
            <Card
              key={room.id}
              className="hover:shadow-md transition-shadow cursor-pointer border-emerald-100"
              onClick={() => navigate(`/chatapp?room=${room.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700">
                        {room.room_type === 'direct' ? (
                          <MessageSquare className="h-5 w-5" />
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {room.name}
                        </h3>
                        {room.is_premium && (
                          <Badge className="bg-amber-500 text-white text-xs">
                            Premium
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {(room as any).participant_count} member{(room as any).participant_count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(room.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {room.created_by === user?.id ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room.id);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete room"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeaveRoom(room.id);
                        }}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        title="Leave chat"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                    <ArrowRight className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
