import { JitsiMeeting } from '@jitsi/react-sdk';
import { useEffect } from 'react';

// Component for Jitsi video calls using self-hosted instance

interface JitsiCallProps {
  roomName: string;
  onLeave: () => void;
}

export function JitsiCall({ roomName, onLeave }: JitsiCallProps) {
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
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: false,
        }}
        interfaceConfigOverwrite={{
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup'],
          DISABLE_VIDEO_BACKGROUND: true,
          DISABLE_FOCUS_INDICATOR: true,
        }}
        onApiReady={(externalApi) => {
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

