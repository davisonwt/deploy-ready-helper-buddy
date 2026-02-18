import { useState, useRef, useCallback } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Video, VideoOff, Phone, Users, Hand, Settings, UserPlus } from 'lucide-react';
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
  const { toast } = useToast();

  const jitsiRoomName = JITSI_CONFIG.getRoomName(roomName);

  const loadAvailableUsers = async () => {
    if (!user) return;
    setLoadingUsers(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, first_name, last_name')
        .neq('user_id', user.id)
        .limit(50);
      if (error) throw error;
      setAvailableUsers(profiles || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleInviteUser = async (invitedUser: any) => {
    const roomLink = `${window.location.origin}/communications-hub?joinCall=${roomName}`;
    try {
      await navigator.clipboard.writeText(roomLink);
      toast({
        title: 'Invite sent!',
        description: `Room link copied. Share it with ${invitedUser.display_name || invitedUser.first_name || 'the user'} to join the call.`,
      });
    } catch {
      toast({
        title: 'Invite ready',
        description: `Ask ${invitedUser.display_name || invitedUser.first_name || 'the user'} to join room: ${roomName}`,
      });
    }
    setShowInviteDialog(false);
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
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">Connecting to {roomName}...</p>
          </Card>
        </div>
      )}

      <div className="w-full h-full">
        <JitsiMeeting
          domain={JITSI_CONFIG.domain}
          roomName={jitsiRoomName}
          userInfo={{ displayName, email: '' }}
          configOverwrite={{
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableClosePage: false,
            defaultLanguage: 'en',
            resolution: 720,
            constraints: { video: { height: { ideal: 720, max: 1080, min: 240 } } },
            disableAudioLevels: false,
            enableNoAudioDetection: true,
            enableNoisyMicDetection: true,
          }}
          interfaceConfigOverwrite={{
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'fullscreen', 'hangup',
              'chat', 'settings', 'raisehand', 'videoquality', 'filmstrip', 'tileview',
            ],
            SETTINGS_SECTIONS: ['devices', 'language', 'profile'],
            MOBILE_APP_PROMO: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
          }}
          onApiReady={onApiReady}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.width = '100%';
            iframeRef.style.height = '100%';
          }}
        />
      </div>

      {/* Custom Control Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <Card className="p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-background/50 rounded-md">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{participantCount}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => { loadAvailableUsers(); setShowInviteDialog(true); }} className="rounded-full h-12 w-12" title="Invite users">
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

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite Users to Call</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-80">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : availableUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No users available</p>
            ) : (
              <div className="space-y-2">
                {availableUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={() => handleInviteUser(u)}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback>{(u.display_name || u.first_name || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User'}</p>
                    </div>
                    <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" />Invite</Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
