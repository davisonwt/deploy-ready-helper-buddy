import { JitsiMeeting } from '@jitsi/react-sdk';
import { useEffect } from 'react';

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
    <div className="w-full h-full min-h-[600px] rounded-lg overflow-hidden border border-border">
      <JitsiMeeting
        domain="meet.sow2growapp.com"
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableClosePage: false,
        }}
        interfaceConfigOverwrite={{
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'hangup',
            'fodeviceselection',
            'settings',
            'videoquality',
            'filmstrip',
            'fullscreen',
            'tileview',
          ],
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
          DISABLE_FOCUS_INDICATOR: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          DISABLE_PRESENCE_STATUS: false,
          DISABLE_RINGING: false,
          ENABLE_FEEDBACK_ANIMATION: false,
          FILM_STRIP_MAX_HEIGHT: 90,
          INITIAL_TOOLBAR_TIMEOUT: 20000,
          TOOLBAR_TIMEOUT: 4000,
          TOOLBAR_ALWAYS_VISIBLE: false,
          DEFAULT_BACKGROUND: '#474747',
          DEFAULT_REMOTE_DISPLAY_NAME: 'Fellow Jitster',
          DEFAULT_LOCAL_DISPLAY_NAME: 'me',
          PROVIDER_NAME: 'Jitsi',
          APP_NAME: 'Jitsi Meet',
          NATIVE_APP_NAME: 'Jitsi Meet',
          CONFIGURE_NOW: 'CONFIGURE NOW',
          BYPASS_JOIN_LEAVE_NOTIFICATIONS: false,
          CLOSE_PAGE_GUEST_HAS_LEFT: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          ENABLE_DIAL_OUT: false,
          ENABLE_FILE_UPLOAD: false,
          FILENAME_READONLY: true,
          ENABLE_WELCOME_PAGE: true,
          ENABLE_CLOSE_PAGE: false,
          ENABLE_PREJOIN_PAGE: true,
          ENABLE_WELCOME_PAGE_TOOLBAR_BUTTON: true,
          PREJOIN_PAGE_ENABLED: true,
        }}
        onApiReady={(externalApi) => {
          // API is ready
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

