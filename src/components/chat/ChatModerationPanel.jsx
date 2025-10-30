import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  UserPlus, 
  UserMinus, 
  Check, 
  X, 
  Clock,
  Users,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ChatModerationPanel = ({ currentRoom, currentUser }) => {
  const { toast } = useToast();
  const [joinRequests, setJoinRequests] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentRoom && currentUser && isModeratorOrCreator()) {
      fetchJoinRequests();
      fetchParticipants();
    }
  }, [currentRoom, currentUser]);

  const isModeratorOrCreator = () => {
    if (!currentRoom || !currentUser) return false;
    
    // Check if user is room creator
    if (currentRoom.created_by === currentUser.id) return true;
    
    // Check if user is moderator
    const userParticipant = participants.find(p => p.user_id === currentUser.id);
    return userParticipant?.is_moderator === true;
  };

  const fetchJoinRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_join_requests')
        .select(`
          *,
          profiles!chat_join_requests_user_id_fkey(display_name, avatar_url)
        `)
        .eq('room_id', currentRoom.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setJoinRequests(data || []);
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  };

  const fetchParticipants = async () => {
    try {
      // Load participant rows first (avoid broken FK join)
      const { data: partRows, error: partErr } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('room_id', currentRoom.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (partErr) throw partErr;

      const ids = (partRows || []).map((r) => r.user_id);
      if (ids.length === 0) {
        setParticipants([]);
        return;
      }

      // Fetch profiles separately
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', ids);
      if (profErr) throw profErr;

      const profileById = Object.fromEntries((profs || []).map((p) => [p.user_id, p]));
      const enriched = (partRows || []).map((row) => ({ ...row, profiles: profileById[row.user_id] || null }));

      setParticipants(enriched);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId, userName) => {
    try {
      const { error } = await supabase.rpc('approve_join_request', {
        request_id: requestId
      });

      if (error) throw error;

      toast({
        title: "Request Approved",
        description: `${userName} has been added to the room.`,
      });

      // Refresh the lists
      fetchJoinRequests();
      fetchParticipants();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve join request.",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (requestId, userName) => {
    try {
      const { error } = await supabase.rpc('reject_join_request', {
        request_id: requestId
      });

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: `${userName}'s request has been declined.`,
      });

      // Refresh the requests
      fetchJoinRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject join request.",
        variant: "destructive",
      });
    }
  };

  const handleKickUser = async (userId, userName) => {
    try {
      const { error } = await supabase.rpc('kick_user_from_room', {
        room_id_param: currentRoom.id,
        user_id_param: userId,
        kick_reason_param: 'Removed by moderator'
      });

      if (error) throw error;

      toast({
        title: "User Removed",
        description: `${userName} has been removed from the room.`,
      });

      // Refresh the participants list
      fetchParticipants();
    } catch (error) {
      console.error('Error kicking user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user from room.",
        variant: "destructive",
      });
    }
  };

  if (!currentRoom || !currentUser || !isModeratorOrCreator()) {
    return null;
  }

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4 text-center">
          <div className="text-white">Loading moderation panel...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5" />
          Moderation Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Join Requests Section */}
        {joinRequests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-yellow-400" />
              <h3 className="text-sm font-semibold text-white">Pending Join Requests</h3>
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300">
                {joinRequests.length}
              </Badge>
            </div>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {joinRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {request.profiles?.display_name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {request.profiles?.display_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-white/60">
                          {new Date(request.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleApproveRequest(request.id, request.profiles?.display_name)}
                        className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectRequest(request.id, request.profiles?.display_name)}
                        className="bg-red-600 hover:bg-red-700 text-white h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Participants Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Room Participants</h3>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
              {participants.length}
            </Badge>
          </div>
          <ScrollArea className="h-40">
            <div className="space-y-2">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {participant.profiles?.display_name?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">
                          {participant.profiles?.display_name || 'Unknown User'}
                        </p>
                        {participant.is_moderator && (
                          <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                            MOD
                          </Badge>
                        )}
                        {participant.user_id === currentRoom.created_by && (
                          <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">
                            CREATOR
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-white/60">
                        Joined {new Date(participant.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {/* Only show kick button if current user can kick this participant */}
                  {(
                    currentUser.id !== participant.user_id && // Can't kick yourself
                    participant.user_id !== currentRoom.created_by && // Can't kick room creator
                    (
                      currentRoom.created_by === currentUser.id || // Room creator can kick anyone
                      (!participant.is_moderator && participants.find(p => p.user_id === currentUser.id)?.is_moderator) // Moderators can kick non-moderators
                    )
                  ) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleKickUser(participant.user_id, participant.profiles?.display_name)}
                      className="bg-red-600 hover:bg-red-700 text-white h-8 w-8 p-0"
                      title="Remove from room"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {joinRequests.length === 0 && (
          <div className="text-center py-4">
            <Check className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <p className="text-sm text-white/70">No pending join requests</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatModerationPanel;