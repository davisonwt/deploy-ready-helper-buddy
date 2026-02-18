/**
 * ResilientJitsiMeeting - Always uses direct iframe to meet.jit.si
 * The JitsiMeetExternalAPI approach fails to bypass the prejoin screen,
 * so we skip it entirely and use iframe with URL hash config params.
 */
import { memo } from 'react';
import { getJitsiIframeUrl } from '@/lib/jitsiLoader';

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
  startWithVideoMuted = false,
  startWithAudioMuted = false,
  onApiReady,
  style,
  className,
}: ResilientJitsiMeetingProps) {
  const iframeUrl = getJitsiIframeUrl(roomName, {
    displayName,
    startWithVideoMuted,
    startWithAudioMuted,
  });

  console.log('📞 [JITSI] Using direct iframe mode for room:', roomName);

  return (
    <iframe
      src={iframeUrl}
      allow="camera; microphone; display-capture; autoplay; clipboard-write"
      allowFullScreen
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        ...style,
      }}
      className={className}
      onLoad={() => {
        console.log('📞 [JITSI] Iframe loaded for room:', roomName);
        // Signal that the meeting is "ready" - no API control in iframe mode
        // but the call is active
        onApiReady?.(null);
      }}
    />
  );
});

export default ResilientJitsiMeeting;
