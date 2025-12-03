import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Video, VideoOff, Phone, Users, Hand, Settings, UserPlus } from 'lucide-react';
import { JAAS_CONFIG } from '@/lib/jitsi-config';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

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
  isModerator = false,
  jwt,
}: JitsiRoomProps) {
  const { user } = useAuth();
  const jitsiContainer = useRef<HTMLDivElement>(null);
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

  // Generate JaaS room name
  const jaasRoomName = JAAS_CONFIG.getRoomName(roomName);

  // Load available users for invite
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
    // Copy room link to clipboard and show toast with invite info
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


  useEffect(() => {
    // Load JaaS API script
    const loadJitsiScript = () => {
      if (window.JitsiMeetExternalAPI) {
        initializeJitsi();
        return;
      }

      const script = document.createElement('script');
      script.src = JAAS_CONFIG.getScriptUrl();
      script.async = true;
      script.onload = initializeJitsi;
      script.onerror = () => {
        toast({
          title: 'Error',
          description: 'Failed to load JaaS. Please check your internet connection.',
          variant: 'destructive',
        });
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    const initializeJitsi = () => {
      if (!jitsiContainer.current) return;

      try {
        const options: any = {
          roomName: jaasRoomName,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainer.current,
          userInfo: {
            displayName,
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableClosePage: false,
            defaultLanguage: 'en',
            resolution: 720,
            constraints: {
              video: {
                height: { ideal: 720, max: 1080, min: 240 },
              },
            },
            disableAudioLevels: false,
            enableNoAudioDetection: true,
            enableNoisyMicDetection: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'desktop',
              'fullscreen',
              'hangup',
              'chat',
              'settings',
              'raisehand',
              'videoquality',
              'filmstrip',
              'tileview',
            ],
            SETTINGS_SECTIONS: ['devices', 'language', 'profile'],
            MOBILE_APP_PROMO: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
          },
        };

        // Add JWT if provided for premium features
        if (jwt || JAAS_CONFIG.jwt) {
          options.jwt = jwt || JAAS_CONFIG.jwt;
        }

        jitsiApi.current = new window.JitsiMeetExternalAPI(JAAS_CONFIG.domain, options);

        // Event listeners
        jitsiApi.current.addListener('videoConferenceJoined', () => {
          setIsLoading(false);
          toast({
            title: 'Connected',
            description: 'You joined the live room',
          });
        });

        jitsiApi.current.addListener('videoConferenceLeft', () => {
          handleLeave();
        });

        jitsiApi.current.addListener('participantJoined', () => {
          updateParticipantCount();
        });

        jitsiApi.current.addListener('participantLeft', () => {
          updateParticipantCount();
        });

        jitsiApi.current.addListener('audioMuteStatusChanged', ({ muted }: { muted: boolean }) => {
          setIsAudioMuted(muted);
        });

        jitsiApi.current.addListener('videoMuteStatusChanged', ({ muted }: { muted: boolean }) => {
          setIsVideoMuted(muted);
        });

        jitsiApi.current.addListener('raiseHandUpdated', ({ id, handRaised }: any) => {
          const myId = jitsiApi.current.getParticipantsInfo().find((p: any) => p.isLocal)?.participantId;
          if (id === myId) {
            setIsHandRaised(handRaised);
          }
        });
      } catch (error) {
        console.error('Error initializing Jitsi:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize video room',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    };

    const updateParticipantCount = () => {
      if (jitsiApi.current) {
        const participants = jitsiApi.current.getNumberOfParticipants();
        setParticipantCount(participants + 1); // +1 for local participant
      }
    };

    loadJitsiScript();

    return () => {
      if (jitsiApi.current) {
        jitsiApi.current.dispose();
        jitsiApi.current = null;
      }
    };
  }, [jaasRoomName, displayName, toast]);

  const handleLeave = () => {
    if (jitsiApi.current) {
      jitsiApi.current.dispose();
      jitsiApi.current = null;
    }
    onLeave?.();
  };

  const toggleAudio = () => {
    if (jitsiApi.current) {
      jitsiApi.current.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (jitsiApi.current) {
      jitsiApi.current.executeCommand('toggleVideo');
    }
  };

  const toggleRaiseHand = () => {
    if (jitsiApi.current) {
      jitsiApi.current.executeCommand('toggleRaiseHand');
    }
  };

  const openSettings = () => {
    if (jitsiApi.current) {
      jitsiApi.current.executeCommand('toggleSettings');
    }
  };

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

      <div ref={jitsiContainer} className="w-full h-full" />

      {/* Custom Control Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <Card className="p-4 shadow-lg">
          <div className="flex items-center gap-3">
            {/* Participant Count */}
            <div className="flex items-center gap-2 px-3 py-2 bg-background/50 rounded-md">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{participantCount}</span>
            </div>

            {/* Invite Users */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                loadAvailableUsers();
                setShowInviteDialog(true);
              }}
              className="rounded-full h-12 w-12"
              title="Invite users to call"
            >
              <UserPlus className="h-5 w-5" />
            </Button>

            {/* Audio Toggle */}
            <Button
              variant={isAudioMuted ? 'destructive' : 'secondary'}
              size="icon"
              onClick={toggleAudio}
              className="rounded-full h-12 w-12"
            >
              {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {/* Video Toggle */}
            <Button
              variant={isVideoMuted ? 'destructive' : 'secondary'}
              size="icon"
              onClick={toggleVideo}
              className="rounded-full h-12 w-12"
            >
              {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>

            {/* Raise Hand */}
            <Button
              variant={isHandRaised ? 'default' : 'outline'}
              size="icon"
              onClick={toggleRaiseHand}
              className="rounded-full h-12 w-12"
            >
              <Hand className="h-5 w-5" />
            </Button>

            {/* Settings */}
            <Button variant="outline" size="icon" onClick={openSettings} className="rounded-full h-12 w-12">
              <Settings className="h-5 w-5" />
            </Button>

            {/* Leave Call */}
            <Button
              variant="destructive"
              size="icon"
              onClick={handleLeave}
              className="rounded-full h-12 w-12 ml-2"
            >
              <Phone className="h-5 w-5 rotate-135" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Invite Users Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Users to Call</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : availableUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No users available to invite</p>
            ) : (
              <div className="space-y-2">
                {availableUsers.map((invitedUser) => (
                  <div
                    key={invitedUser.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleInviteUser(invitedUser)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={invitedUser.avatar_url} />
                        <AvatarFallback>
                          {(invitedUser.display_name || invitedUser.first_name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {invitedUser.display_name || `${invitedUser.first_name || ''} ${invitedUser.last_name || ''}`.trim() || 'User'}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <UserPlus className="h-4 w-4 mr-1" />
                      Invite
                    </Button>
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
