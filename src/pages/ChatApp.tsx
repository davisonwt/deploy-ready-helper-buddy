import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Search,
  Plus,
  LogIn
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ChatList } from '@/components/chat/ChatList';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const ChatApp = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateChat = async () => {
    if (!newChatName.trim()) {
      toast({
        title: 'Chat name required',
        description: 'Please enter a name for your chat room.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      
      // Create new chat room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: newChatName.trim(),
          room_type: 'group',
          created_by: user.id,
          is_active: true,
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
          is_active: true,
        });

      if (participantError) throw participantError;

      toast({
        title: 'Chat created!',
        description: `${newChatName} has been created successfully.`,
      });

      setNewChatName('');
      setIsCreateDialogOpen(false);
      
      // Refresh the chat list
      window.location.reload();
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: 'Failed to create chat',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <MessageSquare className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">
                Welcome to ChatApp
              </h2>
              <p className="text-muted-foreground">
                Please log in to access chats.
              </p>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Log In to Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Chats</h1>
            <p className="text-sm text-muted-foreground">
              Connect and collaborate with others
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Your Conversations
          </h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-lov-name="NewChatButton">
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Chat</DialogTitle>
                <DialogDescription>
                  Create a new group chat or conversation. You can invite others later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="chatName">Chat Name</Label>
                  <Input
                    id="chatName"
                    placeholder="Enter chat name..."
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isCreating) {
                        handleCreateChat();
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateChat} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Chat'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <ScrollArea className="h-[calc(100vh-300px)]">
          <ChatList searchQuery={searchQuery} />
        </ScrollArea>
      </div>
    </div>
  );
};

export default ChatApp;
