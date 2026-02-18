/**
 * ResilientJitsiMeeting - Always uses direct iframe to meet.jit.si
 * Uses stable props comparison to prevent iframe re-creation which kills audio.
 */
import { memo, useRef, useEffect } from 'react';
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

  // Store callback in ref so iframe never re-renders due to callback changes
  const onApiReadyRef = useRef(onApiReady);
  useEffect(() => {
    onApiReadyRef.current = onApiReady;
  }, [onApiReady]);

  // Only log once on mount
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      console.log('📞 [JITSI] Iframe mounted for room:', roomName);
      mountedRef.current = true;
    }
  }, [roomName]);

  return (
    <iframe
      src={iframeUrl}
      allow="camera; microphone; display-capture; autoplay; clipboard-write; encrypted-media"
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
        onApiReadyRef.current?.(null);
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if room or display config changes - NEVER for callback changes
  return (
    prevProps.roomName === nextProps.roomName &&
    prevProps.displayName === nextProps.displayName &&
    prevProps.startWithVideoMuted === nextProps.startWithVideoMuted &&
    prevProps.startWithAudioMuted === nextProps.startWithAudioMuted
  );
});

export default ResilientJitsiMeeting;
