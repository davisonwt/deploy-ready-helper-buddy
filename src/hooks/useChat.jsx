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
      
      // First get messages
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Then get sender profiles for the messages
      const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
      
      let messagesWithProfiles = messages || [];
      
      if (senderIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, first_name, last_name')
          .in('user_id', senderIds);

        if (!profilesError && profiles) {
          // Map profiles to messages
          messagesWithProfiles = messages.map(message => {
            const senderProfile = profiles.find(p => p.user_id === message.sender_id);
            return {
              ...message,
              sender_profile: senderProfile || {
                display_name: 'Unknown User',
                first_name: 'Unknown',
                last_name: 'User'
              }
            };
          });
        }
      }

      setMessages(messagesWithProfiles);
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
      // First get participants
      const { data: participants, error: participantsError } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true);

      if (participantsError) throw participantsError;

      // Then get profiles for the participants
      const userIds = participants?.map(p => p.user_id) || [];
      
      let participantsWithProfiles = participants || [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, first_name, last_name')
          .in('user_id', userIds);

        if (!profilesError && profiles) {
          // Map profiles to participants
          participantsWithProfiles = participants.map(participant => {
            const userProfile = profiles.find(p => p.user_id === participant.user_id);
            return {
              ...participant,
              profiles: userProfile || {
                display_name: 'Unknown User',
                first_name: 'Unknown',
                last_name: 'User'
              }
            };
          });
        }
      }

      setParticipants(participantsWithProfiles);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (roomId, content, messageType = 'text', fileData = null) => {
    if (!user || !roomId || (!content && !fileData)) return;

    try {
      console.log('sendMessage called with:', { roomId, content, messageType, fileData, user: user.id });
      
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

      console.log('Inserting message data:', messageData);

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select();

      if (error) {
        console.error('Database error inserting message:', error);
        throw error;
      }

      console.log('Message inserted successfully:', data);

      // Update room's updated_at timestamp
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
      throw error; // Re-throw so calling code can handle it
    }
  }, [user, toast]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId) => {
    if (!user) return;

    try {
      console.log('Deleting message:', messageId);

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id); // Extra security check

      if (error) {
        console.error('Error deleting message:', error);
        throw error;
      }

      console.log('Message deleted successfully');
      
      // Refresh messages for the current room
      if (currentRoom) {
        await fetchMessages(currentRoom.id);
      }

    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: `Failed to delete message: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [user, currentRoom, fetchMessages, toast]);

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
    deleteMessage,
    createRoom,
    createDirectRoom,
    joinRoom,
    fetchRooms,
  };
};