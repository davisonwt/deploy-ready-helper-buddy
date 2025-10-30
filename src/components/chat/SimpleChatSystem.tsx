import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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
      
      // Two-step fetch: my created rooms + rooms I'm a participant in
      const { data: partRows, error: partErr } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', user.id)
        .or('is_active.is.null,is_active.eq.true');
      if (partErr) throw partErr;

      const roomIds = Array.from(new Set((partRows || []).map((r: any) => r.room_id)));

      const [byIdsRes, createdRes] = await Promise.all([
        roomIds.length
          ? supabase
              .from('chat_rooms')
              .select('*')
              .in('id', roomIds)
              .eq('is_active', true)
          : Promise.resolve({ data: [], error: null } as any),
        supabase
          .from('chat_rooms')
          .select('*')
          .eq('created_by', user.id)
          .eq('is_active', true)
      ]);

      if (byIdsRes.error) throw byIdsRes.error;
      if (createdRes.error) throw createdRes.error;

      const dedup = new Map<string, any>();
      [...(byIdsRes.data || []), ...(createdRes.data || [])].forEach((r: any) => dedup.set(r.id, r));
      const allRooms = Array.from(dedup.values());
      const ordered = allRooms.sort((a: any, b: any) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
      setChats(ordered);

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

  // Create new direct chat using secure RPC
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
      console.log('🔄 Creating/fetching direct room via RPC for user:', newChatUserId);
      const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: user.id,
        user2_id: newChatUserId,
      });
      if (error) throw error;

      toast({ title: 'Success', description: 'Chat ready!' });

      setNewChatUserId('');
      await loadChats();
      try { sessionStorage.setItem('chat:allowOpen', '1'); } catch {}
      navigate(`/chatapp?room=${roomId}`);
    } catch (error: any) {
      console.error('Error creating chat via RPC:', error);
      toast({
        title: 'Error',
        description: 'Failed to create or open chat: ' + (error.message || 'Unknown error'),
        variant: 'destructive',
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
