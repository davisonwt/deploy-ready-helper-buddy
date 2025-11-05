import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Video, VideoOff, Phone, Users, Hand, Settings } from 'lucide-react';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface JitsiRoomProps {
  roomName: string;
  displayName?: string;
  domain?: string;
  onLeave?: () => void;
  isModerator?: boolean;
}

export default function JitsiRoom({
  roomName,
  displayName = 'Guest',
  domain = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si',
  onLeave,
  isModerator = false,
}: JitsiRoomProps) {
  const jitsiContainer = useRef<HTMLDivElement>(null);
  const jitsiApi = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load Jitsi Meet API script
    const loadJitsiScript = () => {
      if (window.JitsiMeetExternalAPI) {
        initializeJitsi();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = initializeJitsi;
      script.onerror = () => {
        toast({
          title: 'Error',
          description: 'Failed to load Jitsi Meet. Please check your internet connection.',
          variant: 'destructive',
        });
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    const initializeJitsi = () => {
      if (!jitsiContainer.current) return;

      try {
        const options = {
          roomName,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainer.current,
          userInfo: {
            displayName,
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableClosePage: false,
            defaultLanguage: 'en',
            hideConferenceSubject: false,
            subject: roomName,
            enableLayerSuspension: true,
            resolution: 720,
            constraints: {
              video: {
                height: {
                  ideal: 720,
                  max: 1080,
                  min: 240,
                },
              },
            },
            // Mobile optimization
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
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'hangup',
              'profile',
              'chat',
              'recording',
              'livestreaming',
              'etherpad',
              'sharedvideo',
              'settings',
              'raisehand',
              'videoquality',
              'filmstrip',
              'invite',
              'feedback',
              'stats',
              'shortcuts',
              'tileview',
              'videobackgroundblur',
              'download',
              'help',
              'mute-everyone',
              'security',
            ],
            SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
            MOBILE_APP_PROMO: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            HIDE_INVITE_MORE_HEADER: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
            VERTICAL_FILMSTRIP: false,
          },
        };

        jitsiApi.current = new window.JitsiMeetExternalAPI(domain, options);

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
  }, [roomName, displayName, domain, toast]);

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
    </div>
  );
}
