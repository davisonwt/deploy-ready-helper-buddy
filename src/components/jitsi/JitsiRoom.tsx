import { useState, useRef, useCallback, useEffect } from 'react';
import ResilientJitsiMeeting from '@/components/jitsi/ResilientJitsiMeeting';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Video, VideoOff, Phone, Users, Hand, Settings, UserPlus, Search, Check } from 'lucide-react';
import { JITSI_CONFIG } from '@/lib/jitsi-config';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface JitsiRoomProps {
  roomName: string;
  displayName?: string;
  onLeave?: () => void;
  isModerator?: boolean;
  jwt?: string;
}

export default function JitsiRoom({
  roomName,
  displayName = 'Guest',
  onLeave,
}: JitsiRoomProps) {
  const { user } = useAuth();
  const jitsiApi = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const jitsiRoomName = JITSI_CONFIG.getRoomName(roomName);

  // Load users when dialog opens or search changes
  useEffect(() => {
    if (!showInviteDialog || !user) return;
    const timeout = setTimeout(() => {
      loadAvailableUsers();
    }, 300); // debounce
    return () => clearTimeout(timeout);
  }, [showInviteDialog, inviteSearch, user]);

  const loadAvailableUsers = async () => {
    if (!user) return;
    setLoadingUsers(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, first_name, last_name')
        .neq('user_id', user.id)
        .limit(30);

      if (inviteSearch.trim()) {
        const s = inviteSearch.trim();
        query = query.or(
          `display_name.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%`
        );
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Filter out blank names
      const filtered = (profiles || []).filter((u: any) => {
        const name = (u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim());
        return name.length > 1 && name !== ' ';
      });

      setAvailableUsers(filtered);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleInviteUser = async (invitedUser: any) => {
    if (!user) return;
    try {
      // Create a call_session record so the invited user gets a real in-app notification
      const { error } = await supabase.from('call_sessions').insert({
        caller_id: user.id,
        receiver_id: invitedUser.user_id,
        call_type: 'video',
        status: 'ringing',
      });
      if (error) throw error;

      setInvitedUserIds(prev => new Set(prev).add(invitedUser.user_id));
      toast({
        title: 'Invitation sent!',
        description: `${invitedUser.display_name || invitedUser.first_name || 'User'} will receive a call notification.`,
      });
    } catch (err: any) {
      console.error('Invite error:', err);
      toast({
        variant: 'destructive',
        title: 'Invite failed',
        description: err.message || 'Could not send invitation',
      });
    }
  };

  const onApiReady = useCallback((externalApi: any) => {
    console.log('🚀 [JITSI] Room API ready');
    jitsiApi.current = externalApi;

    externalApi.addListener('videoConferenceJoined', () => {
      console.log('✅ [JITSI] Conference joined');
      setIsLoading(false);
      toast({ title: 'Connected', description: 'You joined the live room' });
    });

    externalApi.addListener('videoConferenceLeft', () => {
      handleLeave();
    });

    externalApi.addListener('participantJoined', () => {
      const count = externalApi.getNumberOfParticipants();
      setParticipantCount(count + 1);
    });

    externalApi.addListener('participantLeft', () => {
      const count = externalApi.getNumberOfParticipants();
      setParticipantCount(count + 1);
    });

    externalApi.addListener('audioMuteStatusChanged', ({ muted }: { muted: boolean }) => {
      setIsAudioMuted(muted);
    });

    externalApi.addListener('videoMuteStatusChanged', ({ muted }: { muted: boolean }) => {
      setIsVideoMuted(muted);
    });

    externalApi.addListener('raiseHandUpdated', ({ id, handRaised }: any) => {
      const myId = externalApi.getParticipantsInfo().find((p: any) => p.isLocal)?.participantId;
      if (id === myId) setIsHandRaised(handRaised);
    });
  }, [toast]);

  const handleLeave = () => {
    if (jitsiApi.current) {
      jitsiApi.current.dispose();
      jitsiApi.current = null;
    }
    onLeave?.();
  };

  const toggleAudio = () => jitsiApi.current?.executeCommand('toggleAudio');
  const toggleVideo = () => jitsiApi.current?.executeCommand('toggleVideo');
  const toggleRaiseHand = () => jitsiApi.current?.executeCommand('toggleRaiseHand');
  const openSettings = () => jitsiApi.current?.executeCommand('toggleSettings');

  return (
    <div className="relative w-full h-screen bg-background">
      {isLoading && !isFallbackMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">Connecting to {roomName}...</p>
          </Card>
        </div>
      )}

      <div className="w-full h-full">
        <ResilientJitsiMeeting
          roomName={jitsiRoomName}
          displayName={displayName}
          startWithAudioMuted={false}
          startWithVideoMuted={false}
          configOverwrite={{
            defaultLanguage: 'en',
            resolution: 720,
            constraints: { video: { height: { ideal: 720, max: 1080, min: 240 } } },
            disableAudioLevels: false,
            enableNoAudioDetection: true,
            enableNoisyMicDetection: true,
            disableInviteFunctions: true,
            toolbarButtons: [
              'microphone', 'camera', 'desktop', 'fullscreen', 'hangup',
              'chat', 'settings', 'raisehand', 'videoquality', 'filmstrip', 'tileview',
            ],
          }}
          interfaceConfigOverwrite={{
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'fullscreen', 'hangup',
              'chat', 'settings', 'raisehand', 'videoquality', 'filmstrip', 'tileview',
            ],
            SETTINGS_SECTIONS: ['devices', 'language', 'profile'],
            DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
            HIDE_INVITE_MORE_HEADER: true,
            SHOW_INVITE_MORE_HEADER: false,
          }}
          onApiReady={onApiReady}
          onLoadFailure={() => {
            setIsFallbackMode(true);
            setIsLoading(false);
          }}
        />
      </div>

      {/* Custom Control Bar */}
      {!isFallbackMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <Card className="p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-background/50 rounded-md">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{participantCount}</span>
              </div>
              <Button variant="outline" size="icon" onClick={() => { setInviteSearch(''); setShowInviteDialog(true); }} className="rounded-full h-12 w-12" title="Invite users">
                <UserPlus className="h-5 w-5" />
              </Button>
              <Button variant={isAudioMuted ? 'destructive' : 'secondary'} size="icon" onClick={toggleAudio} className="rounded-full h-12 w-12">
                {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button variant={isVideoMuted ? 'destructive' : 'secondary'} size="icon" onClick={toggleVideo} className="rounded-full h-12 w-12">
                {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
              <Button variant={isHandRaised ? 'default' : 'outline'} size="icon" onClick={toggleRaiseHand} className="rounded-full h-12 w-12">
                <Hand className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={openSettings} className="rounded-full h-12 w-12">
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="destructive" size="icon" onClick={handleLeave} className="rounded-full h-12 w-12 ml-2">
                <Phone className="h-5 w-5 rotate-135" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Invite Dialog with Search */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite Members to Call</DialogTitle></DialogHeader>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search registered members..."
              value={inviteSearch}
              onChange={(e) => setInviteSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <ScrollArea className="max-h-80">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : availableUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {inviteSearch.trim() ? `No members found for "${inviteSearch}"` : 'No members available'}
              </p>
            ) : (
              <div className="space-y-2">
                {availableUsers.map((u) => {
                  const alreadyInvited = invitedUserIds.has(u.user_id);
                  const name = u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User';
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        alreadyInvited ? 'bg-primary/10' : 'hover:bg-accent cursor-pointer'
                      }`}
                      onClick={() => !alreadyInvited && handleInviteUser(u)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="font-medium">{name}</p>
                      </div>
                      {alreadyInvited ? (
                        <span className="flex items-center gap-1 text-sm text-primary">
                          <Check className="h-4 w-4" /> Invited
                        </span>
                      ) : (
                        <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" />Invite</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
