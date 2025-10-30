import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, Search, UserPlus, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const InviteModal = ({ isOpen, onClose, room, currentParticipants = [] }) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invitingUsers, setInvitingUsers] = useState(new Set());
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    if (room) {
      setInviteLink(`${window.location.origin}/chatapp?join=${room.id}`);
    }
  }, [room]);

  const fetchUsers = async () => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      // Use the secure search function to get only safe profile data
      const { data: searchData, error: searchError } = await supabase.rpc('search_user_profiles', { 
        search_term: searchQuery 
      });

      if (searchError) throw searchError;

      // Filter out users already in the room
      const participantUserIds = new Set(currentParticipants.map(p => p.user_id));
      const filteredUsers = (searchData || []).filter(user => !participantUserIds.has(user.user_id));
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleInviteUser = async (userId) => {
    if (!room || invitingUsers.has(userId)) return;

    try {
      setInvitingUsers(prev => new Set([...prev, userId]));

      const { error } = await supabase
        .from('chat_participants')
        .insert({
          room_id: room.id,
          user_id: userId,
          is_moderator: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User invited successfully",
      });

      // Remove user from the list since they're now a participant
      setUsers(prev => prev.filter(user => user.user_id !== userId));
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: "Error",
        description: "Failed to invite user",
        variant: "destructive",
      });
    } finally {
      setInvitingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Success",
        description: "Invite link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy invite link",
        variant: "destructive",
      });
    }
  };

  const getUserDisplayName = (user) => {
    return user.display_name || 'Anonymous User';
  };

  const getUserInitials = (user) => {
    const name = getUserDisplayName(user);
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to {room?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Invite Link */}
          <div className="space-y-2">
            <Label>Share Invite Link</Label>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyInviteLink}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>

          {/* Search Users */}
          <div className="space-y-2">
            <Label>Search and Invite Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* User List */}
          <div className="space-y-2">
            <ScrollArea className="h-48">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Searching users...
                </div>
              ) : users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {getUserDisplayName(user)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInviteUser(user.user_id)}
                        disabled={invitingUsers.has(user.user_id)}
                        className="gap-2"
                      >
                        {invitingUsers.has(user.user_id) ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Inviting...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3" />
                            Invite
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Search for users to invite</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Current Participants Count */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Current participants: {currentParticipants.length}</span>
              {room?.max_participants && (
                <Badge variant="secondary">
                  Max: {room.max_participants}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteModal;