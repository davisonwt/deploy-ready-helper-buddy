import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

export const useChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's chat rooms
  const fetchRooms = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants!inner(
            user_id,
            is_moderator,
            joined_at
          )
        `)
        .eq('chat_participants.user_id', user.id)
        .eq('chat_participants.is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load chat rooms",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Fetch messages for a room
  const fetchMessages = useCallback(async (roomId) => {
    if (!roomId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender_profiles:profiles!sender_id(display_name, avatar_url, first_name, last_name)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error", 
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch participants for a room
  const fetchParticipants = useCallback(async (roomId) => {
    if (!roomId) return;

    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          *,
          participant_profiles:profiles!user_id(display_name, avatar_url, first_name, last_name)
        `)
        .eq('room_id', roomId)
        .eq('is_active', true);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (roomId, content, messageType = 'text', fileData = null) => {
    if (!user || !roomId || (!content && !fileData)) return;

    try {
      const messageData = {
        room_id: roomId,
        sender_id: user.id,
        content: content || null,
        message_type: messageType,
        ...(fileData && {
          file_url: fileData.url,
          file_name: fileData.name,
          file_type: fileData.type,
          file_size: fileData.size,
        }),
      };

      const { error } = await supabase
        .from('chat_messages')
        .insert(messageData);

      if (error) throw error;

      // Update room's updated_at timestamp
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Create a direct message room with another user
  const createDirectRoom = useCallback(async (otherUserId) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: user.id,
        user2_id: otherUserId
      });

      if (error) throw error;

      const { data: room } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', data)
        .single();

      fetchRooms(); // Refresh rooms list
      return room;
    } catch (error) {
      console.error('Error creating direct room:', error);
      toast({
        title: "Error",
        description: "Failed to create direct chat",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast, fetchRooms]);

  // Create a new room
  const createRoom = useCallback(async (roomData) => {
    if (!user) return null;

    try {
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          ...roomData,
          created_by: user.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as participant
      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          is_moderator: true,
        });

      if (participantError) throw participantError;

      toast({
        title: "Success",
        description: "Chat room created successfully",
      });

      fetchRooms(); // Refresh rooms list
      return room;
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create chat room",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast, fetchRooms]);

  // Join a room
  const joinRoom = useCallback(async (roomId) => {
    if (!user || !roomId) return;

    try {
      const { error } = await supabase
        .from('chat_participants')
        .insert({
          room_id: roomId,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Joined chat room successfully",
      });

      fetchRooms();
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join chat room",
        variant: "destructive",
      });
    }
  }, [user, toast, fetchRooms]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to room changes
    const roomSubscription = supabase
      .channel('room-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms',
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    // Subscribe to message changes for current room
    let messageSubscription = null;
    if (currentRoom) {
      messageSubscription = supabase
        .channel(`messages-${currentRoom.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${currentRoom.id}`,
          },
          () => {
            fetchMessages(currentRoom.id);
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(roomSubscription);
      if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
      }
    };
  }, [user, currentRoom, fetchRooms, fetchMessages]);

  // Load rooms on mount
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Load messages and participants when current room changes
  useEffect(() => {
    if (currentRoom) {
      fetchMessages(currentRoom.id);
      fetchParticipants(currentRoom.id);
    }
  }, [currentRoom, fetchMessages, fetchParticipants]);

  return {
    rooms,
    currentRoom,
    setCurrentRoom,
    messages,
    participants,
    loading,
    sendMessage,
    createRoom,
    createDirectRoom,
    joinRoom,
    fetchRooms,
  };
};