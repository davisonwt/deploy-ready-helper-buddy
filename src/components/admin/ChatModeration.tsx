import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  Trash2, 
  Flag, 
  User, 
  Ban,
  Search,
  Filter,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';

interface ChatModerationProps {
  roomId?: string;
}

const ChatModeration = ({ roomId }: ChatModerationProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [banReason, setBanReason] = useState('');
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [userToBan, setUserToBan] = useState<any>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages for moderation
  const { data: messages, isLoading } = useQuery({
    queryKey: ['moderation-messages', roomId, searchTerm, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('chat_messages')
        .select(`
          *,
          sender_profile:profiles!chat_messages_sender_id_fkey(
            user_id,
            display_name,
            avatar_url,
            first_name,
            last_name
          ),
          chat_rooms!chat_messages_room_id_fkey(
            name,
            room_type
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (roomId) {
        query = query.eq('room_id', roomId);
      }

      if (searchTerm) {
        query = query.ilike('content', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Flag message mutation
  const flagMutation = useMutation({
    mutationFn: async ({ messageId, reason }: { messageId: string; reason?: string }) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          system_metadata: { 
            flagged: true, 
            flagged_by: user?.id,
            flagged_at: new Date().toISOString(),
            flag_reason: reason || 'Inappropriate content'
          }
        })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-messages'] });
      toast({
        title: 'Message flagged',
        description: 'Message has been flagged for review'
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error flagging message',
        description: error.message
      });
    }
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          content: '[Message deleted by moderator]',
          system_metadata: {
            deleted: true,
            deleted_by: user?.id,
            deleted_at: new Date().toISOString()
          }
        })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-messages'] });
      toast({
        title: 'Message deleted',
        description: 'Message has been deleted'
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error deleting message',
        description: error.message
      });
    }
  });

  // Ban user mutation
  const banMutation = useMutation({
    mutationFn: async ({ userId, reason, duration }: { userId: string; reason: string; duration?: number }) => {
      // Remove user from all chat rooms
      const { error: participantError } = await supabase
        .from('chat_participants')
        .update({ 
          is_active: false,
          kicked_at: new Date().toISOString(),
          kicked_by: user?.id,
          kick_reason: reason
        })
        .eq('user_id', userId);

      if (participantError) throw participantError;

      // Log the ban action
      await supabase.rpc('log_admin_action', {
        action_type: 'user_banned',
        target_user_id: userId,
        action_details: { reason, duration, banned_by: user?.id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-messages'] });
      setShowBanDialog(false);
      setBanReason('');
      setUserToBan(null);
      toast({
        title: 'User banned',
        description: 'User has been removed from all chat rooms'
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error banning user',
        description: error.message
      });
    }
  });

  const handleBanUser = (messageUser: any) => {
    setUserToBan(messageUser);
    setShowBanDialog(true);
  };

  const confirmBan = () => {
    if (userToBan && banReason.trim()) {
      banMutation.mutate({
        userId: userToBan.user_id,
        reason: banReason.trim()
      });
    }
  };

  const filteredMessages = messages?.filter(message => {
    const metadata = message.system_metadata as any;
    if (filterStatus === 'flagged') {
      return metadata?.flagged;
    }
    if (filterStatus === 'deleted') {
      return metadata?.deleted;
    }
    return true;
  });

  const getSenderName = (profile: any) => {
    if (!profile) return 'Unknown User';
    return profile.display_name || 
           `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
           'Anonymous User';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat Moderation
            {roomId && <Badge variant="outline">Room Specific</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="flagged">Flagged Only</SelectItem>
                <SelectItem value="deleted">Deleted Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Messages List */}
          <ScrollArea className="h-[600px] w-full">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading messages...
                </div>
              ) : filteredMessages?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages found
                </div>
              ) : (
                filteredMessages?.map((message) => (
                  <Card key={message.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Message Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {getSenderName(message.sender_profile)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {message.chat_rooms?.name || 'Unknown Room'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                          {(message.system_metadata as any)?.flagged && (
                            <Badge variant="destructive" className="text-xs">
                              <Flag className="h-3 w-3 mr-1" />
                              Flagged
                            </Badge>
                          )}
                          {(message.system_metadata as any)?.deleted && (
                            <Badge variant="secondary" className="text-xs">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Deleted
                            </Badge>
                          )}
                        </div>

                        {/* Message Content */}
                        <div className="text-sm bg-muted/50 p-3 rounded-lg">
                          {(message.system_metadata as any)?.deleted ? (
                            <em className="text-muted-foreground">[Message deleted by moderator]</em>
                          ) : (
                            message.content || '[File attachment]'
                          )}
                        </div>

                        {/* File Info */}
                        {message.file_url && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            📎 {message.file_name} ({message.file_type})
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Message Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <strong>Sender:</strong> {getSenderName(message.sender_profile)}
                              </div>
                              <div>
                                <strong>Room:</strong> {message.chat_rooms?.name}
                              </div>
                              <div>
                                <strong>Time:</strong> {new Date(message.created_at).toLocaleString()}
                              </div>
                              <div>
                                <strong>Content:</strong>
                                <div className="mt-1 p-2 bg-muted rounded">
                                  {message.content || '[File attachment]'}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {!(message.system_metadata as any)?.flagged && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => flagMutation.mutate({ messageId: message.id })}
                            className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                        )}

                        {!(message.system_metadata as any)?.deleted && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteMutation.mutate(message.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleBanUser(message.sender_profile)}
                          className="h-8 w-8 p-0 text-red-700 hover:text-red-800"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Ban User Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to ban <strong>{getSenderName(userToBan)}</strong>? 
              This will remove them from all chat rooms.
            </p>
            <div>
              <label className="text-sm font-medium">Reason for ban:</label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason for ban..."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBanDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmBan}
                disabled={!banReason.trim() || banMutation.isPending}
              >
                Confirm Ban
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatModeration;