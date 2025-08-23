import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceMemo } from '@/hooks/useVoiceMemo';
import { 
  Hand, 
  Mic, 
  MicOff, 
  Crown, 
  Shield, 
  Users,
  CheckCircle,
  XCircle,
  MicIcon,
  Square,
  Play,
  Trash2,
  Clock
} from 'lucide-react';

const LiveCallQueue = ({ callSession, isHost, isModerator }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState([]);
  const [queuedParticipants, setQueuedParticipants] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const { 
    isRecording, 
    isUploading, 
    recordingTime,
    formatRecordingTime,
    startRecording, 
    stopRecording, 
    uploadVoiceMemo, 
    deleteVoiceMemo 
  } = useVoiceMemo();

  // Get current topic/conversation context
  const getCurrentTopic = () => {
    // You could enhance this to get actual topic from call session or room context
    return "Live conversation topic";
  };

  // Fetch participants and queue
  const fetchParticipants = async () => {
    if (!callSession) return;

    try {
      const { data, error } = await supabase
        .from('live_call_participants')
        .select(`
          *,
          profiles!inner(
            display_name,
            avatar_url,
            first_name,
            last_name
          )
        `)
        .eq('call_session_id', callSession)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const activeParticipants = data || [];
      
      // Separate queued participants (those with hand raised)
      const queued = activeParticipants
        .filter(p => p.hand_raised_at && p.is_muted)
        .sort((a, b) => a.queue_position - b.queue_position);
      
      // All active participants
      const allParticipants = activeParticipants;
      
      setParticipants(allParticipants);
      setQueuedParticipants(queued);
      
      // Find current user
      const currentUserData = activeParticipants.find(p => p.user_id === user?.id);
      setCurrentUser(currentUserData);

    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  // Join call as participant
  const joinCall = async (role = 'participant') => {
    if (!user || !callSession) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('live_call_participants')
        .insert({
          call_session_id: callSession,
          user_id: user.id,
          role: role,
          is_muted: role === 'participant' // Participants start muted
        });

      if (error) throw error;

      toast({
        title: "Joined Call",
        description: "You have joined the live call",
      });

    } catch (error) {
      console.error('Error joining call:', error);
      toast({
        title: "Error",
        description: "Failed to join call",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Raise hand to speak
  const raiseHand = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('live_call_participants')
        .update({
          hand_raised_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Reorder queue
      await supabase.rpc('reorder_hand_raise_queue', {
        call_session_id_param: callSession
      });

      toast({
        title: "Hand Raised",
        description: "You've been added to the speaking queue",
      });

    } catch (error) {
      console.error('Error raising hand:', error);
      toast({
        title: "Error",
        description: "Failed to raise hand",
        variant: "destructive",
      });
    }
  };

  // Lower hand
  const lowerHand = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('live_call_participants')
        .update({
          hand_raised_at: null,
          queue_position: null
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Reorder queue
      await supabase.rpc('reorder_hand_raise_queue', {
        call_session_id_param: callSession
      });

      toast({
        title: "Hand Lowered",
        description: "You've been removed from the speaking queue",
      });

    } catch (error) {
      console.error('Error lowering hand:', error);
    }
  };

  // Unmute participant (host/moderator only)
  const unmuteParticipant = async (participantId) => {
    if (!isHost && !isModerator) return;

    try {
      const { error } = await supabase
        .from('live_call_participants')
        .update({
          is_muted: false,
          hand_raised_at: null,
          queue_position: null
        })
        .eq('id', participantId);

      if (error) throw error;

      // Reorder queue after removing participant
      await supabase.rpc('reorder_hand_raise_queue', {
        call_session_id_param: callSession
      });

      toast({
        title: "Participant Unmuted",
        description: "Participant can now speak",
      });

    } catch (error) {
      console.error('Error unmuting participant:', error);
      toast({
        title: "Error",
        description: "Failed to unmute participant",
        variant: "destructive",
      });
    }
  };

  // Mute participant (host/moderator only)
  const muteParticipant = async (participantId) => {
    if (!isHost && !isModerator) return;

    try {
      const { error } = await supabase
        .from('live_call_participants')
        .update({
          is_muted: true
        })
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: "Participant Muted",
        description: "Participant has been muted",
      });

    } catch (error) {
      console.error('Error muting participant:', error);
    }
  };

  // Remove participant from call (host/moderator only)
  const removeParticipant = async (participantId) => {
    if (!isHost && !isModerator) return;

    try {
      const { error } = await supabase
        .from('live_call_participants')
        .update({
          is_active: false
        })
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: "Participant Removed",
        description: "Participant has been removed from the call",
      });

    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  // Record voice memo
  const handleRecordVoiceMemo = async () => {
    if (!currentUser) return;

    if (isRecording) {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        const topic = getCurrentTopic();
        await uploadVoiceMemo(audioBlob, currentUser.id, topic);
      }
    } else {
      const topic = getCurrentTopic();
      await startRecording(topic);
    }
  };

  // Play voice memo
  const playVoiceMemo = (voiceMemoUrl) => {
    const audio = new Audio(voiceMemoUrl);
    audio.play().catch(error => {
      console.error('Error playing voice memo:', error);
      toast({
        title: "Playback Error",
        description: "Could not play voice memo",
        variant: "destructive",
      });
    });
  };

  // Delete voice memo
  const handleDeleteVoiceMemo = async (participantId, voiceMemoUrl) => {
    await deleteVoiceMemo(participantId, voiceMemoUrl);
  };

  // Format duration for display
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!callSession) return;

    fetchParticipants();

    const channel = supabase
      .channel(`call-${callSession}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_call_participants',
          filter: `call_session_id=eq.${callSession}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callSession]);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'host':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'host':
        return 'default';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!callSession) return null;

  return (
    <div className="space-y-4">
      {/* Join Call Button */}
      {!currentUser && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Join the live conversation
              </p>
              <Button 
                onClick={() => joinCall('participant')}
                disabled={loading}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Join Call
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current User Controls */}
      {currentUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Your Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getRoleIcon(currentUser.role)}
                <Badge variant={getRoleBadgeVariant(currentUser.role)}>
                  {currentUser.role}
                </Badge>
                {currentUser.is_muted ? (
                  <MicOff className="h-4 w-4 text-red-500" />
                ) : (
                  <Mic className="h-4 w-4 text-green-500" />
                )}
              </div>
              
              {currentUser.role === 'participant' && currentUser.is_muted && (
                <div className="flex gap-2">
                  {currentUser.hand_raised_at ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={lowerHand}
                    >
                      <Hand className="h-4 w-4 mr-1" />
                      Lower Hand
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={raiseHand}
                    >
                      <Hand className="h-4 w-4 mr-1" />
                      Raise Hand
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {/* Voice Memo Controls for Queued Participants */}
            {currentUser && currentUser.hand_raised_at && currentUser.is_muted && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Voice Memo</span>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {isRecording && (
                      <span className="mr-2 text-red-500">{formatRecordingTime(recordingTime)}</span>
                    )}
                    {currentUser.voice_memo_url && (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(currentUser.voice_memo_duration || 0)}
                      </>
                    )}
                  </div>
                </div>
                
                {currentUser.voice_memo_url ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playVoiceMemo(currentUser.voice_memo_url)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Play
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteVoiceMemo(currentUser.id, currentUser.voice_memo_url)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecordVoiceMemo}
                    disabled={isUploading}
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-4 w-4 mr-1 text-red-500" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <MicIcon className="h-4 w-4 mr-1" />
                        Record Message
                      </>
                    )}
                  </Button>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  Record what you want to say about the current topic while waiting (max 2 minutes). Your message will be saved to your queue position.
                </p>
              </div>
            )}
            
            {currentUser.hand_raised_at && currentUser.queue_position && (
              <div className="mt-2 text-sm text-muted-foreground">
                Position in queue: #{currentUser.queue_position}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Speaking Queue */}
      {queuedParticipants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Hand className="h-4 w-4" />
              Speaking Queue ({queuedParticipants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {queuedParticipants.map((participant, index) => (
                <div 
                  key={participant.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-sm font-medium">#{index + 1}</div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.profiles?.avatar_url} />
                      <AvatarFallback>
                        {participant.profiles?.display_name?.charAt(0) || 
                         participant.profiles?.first_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {participant.profiles?.display_name || 
                           `${participant.profiles?.first_name} ${participant.profiles?.last_name}` || 
                           'Unknown User'}
                        </p>
                        {participant.voice_memo_url && (
                          <MicIcon className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Waiting to speak</span>
                        {participant.voice_memo_url && (
                          <>
                            <span>•</span>
                            <span>Has voice memo ({formatDuration(participant.voice_memo_duration || 0)})</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    {participant.voice_memo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => playVoiceMemo(participant.voice_memo_url)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {(isHost || isModerator) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unmuteParticipant(participant.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeParticipant(participant.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Participants ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div 
                key={participant.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.profiles?.avatar_url} />
                    <AvatarFallback>
                      {participant.profiles?.display_name?.charAt(0) || 
                       participant.profiles?.first_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {participant.profiles?.display_name || 
                         `${participant.profiles?.first_name} ${participant.profiles?.last_name}` || 
                         'Unknown User'}
                      </p>
                      {getRoleIcon(participant.role)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={getRoleBadgeVariant(participant.role)} className="text-xs">
                        {participant.role}
                      </Badge>
                      {participant.is_muted ? (
                        <MicOff className="h-3 w-3 text-red-500" />
                      ) : (
                        <Mic className="h-3 w-3 text-green-500" />
                      )}
                      {participant.hand_raised_at && (
                        <Hand className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                  </div>
                </div>
                
                {(isHost || isModerator) && participant.user_id !== user?.id && (
                  <div className="flex gap-1">
                    {participant.is_muted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unmuteParticipant(participant.id)}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => muteParticipant(participant.id)}
                      >
                        <MicOff className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeParticipant(participant.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveCallQueue;