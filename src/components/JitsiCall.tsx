import { JitsiMeeting } from '@jitsi/react-sdk';
import { useEffect } from 'react';

// Jitsi video call component for self-hosted instance

interface JitsiCallProps {
  roomName: string;
  onLeave: () => void;
  userInfo?: {
    displayName: string;
    email: string;
  };
  isAudioOnly?: boolean;
}

export function JitsiCall({ roomName, onLeave, userInfo, isAudioOnly = false }: JitsiCallProps) {
  useEffect(() => {
    // Hide any loading spinners when component mounts
    const spinners = document.querySelectorAll('[class*="spinner"], [class*="loading"]');
    spinners.forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
  }, []);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border">
      <JitsiMeeting
        domain="meet.sow2growapp.com"
        roomName={roomName}
        userInfo={userInfo}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: isAudioOnly ? true : false,
        }}
        interfaceConfigOverwrite={{
          TOOLBAR_BUTTONS: isAudioOnly 
            ? ['microphone', 'hangup'] 
            : ['microphone', 'camera', 'hangup'],
          DISABLE_VIDEO_BACKGROUND: true,
          DISABLE_FOCUS_INDICATOR: true,
        }}
        onApiReady={(externalApi) => {
          console.log('Jitsi ready');
          console.log("Jitsi iframe rendered");
          externalApi.addListener('readyToClose', () => {
            onLeave();
          });
        }}
        getIFrameRef={(iframeRef) => {
          if (iframeRef) {
            iframeRef.style.width = '100%';
            iframeRef.style.height = '100%';
            iframeRef.style.minHeight = '600px';
            iframeRef.style.border = 'none';
          }
        }}
      />
    </div>
  );
}

