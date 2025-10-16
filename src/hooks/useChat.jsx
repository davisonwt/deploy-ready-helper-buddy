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
      // First get rooms where user is a participant
      const { data: userRooms, error: roomsError } = await supabase
        .from('chat_participants')
        .select(`
          room_id,
          chat_rooms!inner(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (roomsError) throw roomsError;

      // Extract room data and get all participants for each room
      const roomsWithParticipants = await Promise.all(
        (userRooms || []).map(async (userRoom) => {
          const room = userRoom.chat_rooms;
          
          // Get all participants for this room
          const { data: allParticipants, error: participantsError } = await supabase
            .from('chat_participants')
            .select('user_id, is_moderator, joined_at')
            .eq('room_id', room.id)
            .eq('is_active', true);

          return {
            ...room,
            chat_participants: allParticipants || []
          };
        })
      );

      // Sort by updated_at
      roomsWithParticipants.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      
      setRooms(roomsWithParticipants);
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
          .select('user_id, display_name, avatar_url, first_name, last_name, verification_status') // Only safe public fields
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
          .select('user_id, display_name, avatar_url, first_name, last_name, verification_status') // Only safe public fields
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

      const payload = {
        p_room_id: roomId,
        p_content: content || null,
        p_message_type: messageType,
        p_file_url: fileData?.url || null,
        p_file_name: fileData?.name || null,
        p_file_type: fileData?.type || null,
        p_file_size: fileData?.size || null,
      };

      const { data, error } = await supabase.rpc('send_chat_message', payload);

      if (error) {
        console.error('Database error inserting message via RPC:', error);
        throw error;
      }

      console.log('Message inserted successfully (RPC):', data);

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
  const createRoom = useCallback(async (roomData, moderators = []) => {
    if (!user) return null;

    try {
      console.log('Creating room with data:', roomData);
      console.log('Moderators:', moderators);
      
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          ...roomData,
          created_by: user.id,
        })
        .select()
        .single();

      if (roomError) {
        console.error('Room creation error:', roomError);
        throw roomError;
      }

      console.log('Room created successfully:', room);

      // Add creator as participant (always a moderator)
      const participantsToAdd = [
        {
          room_id: room.id,
          user_id: user.id,
          is_moderator: true,
        }
      ];

      // Add selected moderators as participants
      if (moderators && moderators.length > 0) {
        const moderatorParticipants = moderators.map(mod => ({
          room_id: room.id,
          user_id: mod.user_id,
          is_moderator: true,
        }));
        participantsToAdd.push(...moderatorParticipants);
      }

      console.log('Adding participants:', participantsToAdd);

      // Insert all participants (creator + moderators)
      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert(participantsToAdd);

      if (participantError) {
        console.error('Participant creation error:', participantError);
        throw participantError;
      }

      console.log('Participants added successfully');

      toast({
        title: "Success",
        description: `Chat room created successfully${moderators?.length > 0 ? ` with ${moderators.length} moderator(s)` : ''}`,
      });

      fetchRooms(); // Refresh rooms list
      return room;
    } catch (error) {
      console.error('Error creating room - Full error details:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      console.error('Error code:', error.code);
      
      let errorMessage = "Failed to create chat room";
      
      // Provide more specific error messages based on the error
      if (error.message) {
        if (error.message.includes('violates unique constraint')) {
          errorMessage = "A room with this name already exists";
        } else if (error.message.includes('violates check constraint')) {
          errorMessage = "Invalid room data provided";
        } else if (error.message.includes('permission denied') || error.message.includes('insufficient_privilege')) {
          errorMessage = "You don't have permission to create chat rooms";
        } else if (error.message.includes('search_user_profiles')) {
          errorMessage = "Error searching for users to add as moderators";
        } else {
          errorMessage = `Failed to create chat room: ${error.message}`;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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

  // Delete a conversation (room and all its messages)
  const deleteConversation = useCallback(async (roomId) => {
    if (!user || !roomId) return;

    try {
      // First check if user is the room creator or has permission
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .select('created_by, room_type')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      // Only allow deletion if user is the creator or it's a direct message
      if (room.created_by !== user.id && room.room_type !== 'direct') {
        toast({
          title: "Error",
          description: "You can only delete conversations you created",
          variant: "destructive",
        });
        return;
      }

      // Delete all messages first
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('room_id', roomId);

      if (messagesError) throw messagesError;

      // Delete all participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .delete()
        .eq('room_id', roomId);

      if (participantsError) throw participantsError;

      // Delete the room
      const { error: deleteError } = await supabase
        .from('chat_rooms')
        .delete()
        .eq('id', roomId);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: "Conversation deleted successfully",
      });

      // Clear current room if it was deleted
      if (currentRoom?.id === roomId) {
        setCurrentRoom(null);
        setMessages([]);
        setParticipants([]);
      }

      fetchRooms();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  }, [user, toast, fetchRooms, currentRoom]);

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
    deleteConversation,
    fetchRooms,
  };
};