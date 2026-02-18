/**
 * ResilientJitsiMeeting - Simple iframe approach that WORKS.
 * No External API complexity - just embed meet.jit.si in an iframe.
 * Both callers join the same room URL and audio works via Jitsi's own UI.
 */
import { memo, useRef, useEffect } from 'react';
import { JITSI_DOMAIN } from '@/lib/jitsiLoader';

interface ResilientJitsiMeetingProps {
  roomName: string;
  displayName?: string;
  configOverwrite?: Record<string, any>;
  interfaceConfigOverwrite?: Record<string, any>;
  startWithVideoMuted?: boolean;
  startWithAudioMuted?: boolean;
  onApiReady?: (api: any) => void;
  onLoadFailure?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const ResilientJitsiMeeting = memo(function ResilientJitsiMeeting({
  roomName,
  displayName = 'User',
  startWithVideoMuted = true,
  startWithAudioMuted = false,
  onApiReady,
  style,
  className,
}: ResilientJitsiMeetingProps) {
  const onApiReadyRef = useRef(onApiReady);
  const calledRef = useRef(false);

  useEffect(() => {
    onApiReadyRef.current = onApiReady;
  }, [onApiReady]);

  // Build a minimal Jitsi URL - fewer params = fewer chances for issues
  const params = [
    'config.prejoinPageEnabled=false',
    'config.startWithAudioMuted=false',
    `config.startWithVideoMuted=${startWithVideoMuted}`,
    'config.disableDeepLinking=true',
    'config.enableClosePage=false',
    'config.enableWelcomePage=false',
    'config.enableInsecureRoomNameWarning=false',
    'config.hideConferenceSubject=true',
    `userInfo.displayName=${encodeURIComponent(displayName)}`,
  ].join('&');

  const iframeUrl = `https://${JITSI_DOMAIN}/${roomName}#${params}`;

  const handleLoad = () => {
    console.log('📞 [JITSI] ✅ Iframe loaded for room:', roomName);
    if (!calledRef.current) {
      calledRef.current = true;
      // Signal connected after a short delay to let Jitsi initialize audio
      setTimeout(() => {
        onApiReadyRef.current?.(null);
      }, 2000);
    }
  };

  return (
    <iframe
      src={iframeUrl}
      allow="camera; microphone; display-capture; autoplay"
      allowFullScreen
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        ...style,
      }}
      className={className}
      onLoad={handleLoad}
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.roomName === nextProps.roomName &&
    prevProps.displayName === nextProps.displayName
  );
});

export default ResilientJitsiMeeting;
