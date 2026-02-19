import { useState, useRef, useCallback, useEffect } from 'react';
import ResilientJitsiMeeting from '@/components/jitsi/ResilientJitsiMeeting';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { JITSI_CONFIG } from '@/lib/jitsi-config';
import CallControlBar from '@/components/jitsi/CallControlBar';

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
  const jitsiApi = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const { toast } = useToast();

  const jitsiRoomName = JITSI_CONFIG.getRoomName(roomName);

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
      setParticipantCount(externalApi.getNumberOfParticipants() + 1);
    });

    externalApi.addListener('participantLeft', () => {
      setParticipantCount(externalApi.getNumberOfParticipants() + 1);
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
            hideAddMoreParticipants: true,
          }}
          interfaceConfigOverwrite={{
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup'],
            TOOLBAR_ALWAYS_VISIBLE: false,
            TOOLBAR_TIMEOUT: 1,
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

      {/* Custom Control Bar with S2G Invite */}
      {!isFallbackMode && (
        <CallControlBar
          jitsiApi={jitsiApi.current}
          isAudioMuted={isAudioMuted}
          isVideoMuted={isVideoMuted}
          isHandRaised={isHandRaised}
          participantCount={participantCount}
          onHangUp={handleLeave}
        />
      )}
    </div>
  );
}
