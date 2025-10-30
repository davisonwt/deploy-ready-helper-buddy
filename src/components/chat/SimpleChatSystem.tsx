import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { MessageSquare, Plus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SimpleChatSystem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newChatUserId, setNewChatUserId] = useState('');
  const [users, setUsers] = useState([]);

  // Load existing chats - direct approach
  const loadChats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get all chat rooms where user is creator OR participant
      const { data: allRooms, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`created_by.eq.${user.id},id.in.(select room_id from chat_participants where user_id = '${user.id}')`)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      console.log('📋 Found chats:', allRooms);
      setChats(allRooms || []);
    } catch (error) {
      console.error('Error loading chats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chats: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load users for chat creation
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .neq('user_id', user?.id)
        .limit(50);
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadChats();
      loadUsers();
    }
  }, [user]);

  // Create new direct chat - simple approach
  const createDirectChat = async () => {
    if (!user || !newChatUserId.trim()) {
      toast({
        title: 'Error',
        description: 'Please select a user to chat with',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('🔄 Creating direct chat with user:', newChatUserId);

      // Step 1: Create the room
      const roomName = `Chat between users`;
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: roomName,
          room_type: 'direct',
          created_by: user.id,
          is_active: true,
          max_participants: 2
        })
        .select()
        .single();

      if (roomError) {
        console.error('Room creation error:', roomError);
        throw roomError;
      }

      console.log('✅ Room created:', room);

      // Step 2: Add both users as participants
      const participants = [
        {
          room_id: room.id,
          user_id: user.id,
          is_active: true,
          is_moderator: false
        },
        {
          room_id: room.id,
          user_id: newChatUserId,
          is_active: true,
          is_moderator: false
        }
      ];

      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantError) {
        console.error('Participant error:', participantError);
        throw participantError;
      }

      console.log('✅ Participants added');

      toast({
        title: 'Success',
        description: 'Chat created successfully!'
      });

      setNewChatUserId('');
      loadChats(); // Refresh the list
      
      // Navigate to the new chat
      navigate(`/chatapp?room=${room.id}`);

    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to create chat: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p>Please log in to access chats</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Simple Chat System</h1>
        <p className="text-muted-foreground">Direct approach to messaging</p>
      </div>

      {/* Create New Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <select 
              value={newChatUserId}
              onChange={(e) => setNewChatUserId(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            >
              <option value="">Select a user to chat with...</option>
              {users.map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {user.display_name || `${user.first_name} ${user.last_name}` || 'Unknown User'}
                </option>
              ))}
            </select>
            <Button onClick={createDirectChat} disabled={!newChatUserId}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Chat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Chats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Chats ({chats.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading chats...</p>
          ) : chats.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No chats found. Create your first chat above!
            </p>
          ) : (
            <div className="space-y-2">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-accent cursor-pointer"
                  onClick={() => navigate(`/chatapp?room=${chat.id}`)}
                >
                  <div>
                    <p className="font-medium">{chat.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Type: {chat.room_type} • Updated: {new Date(chat.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
