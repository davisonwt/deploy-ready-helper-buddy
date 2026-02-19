/**
 * ResilientJitsiMeeting - Uses JitsiMeetExternalAPI (the OFFICIAL way).
 * Falls back to direct iframe only if API script fails to load.
 * The External API creates its own iframe with proper WebRTC negotiation.
 */
import { useRef, useEffect, useState, memo } from 'react';
import { loadJitsiApi, JITSI_DOMAIN } from '@/lib/jitsiLoader';

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
  configOverwrite,
  interfaceConfigOverwrite,
  startWithVideoMuted = true,
  startWithAudioMuted = false,
  onApiReady,
  style,
  className,
}: ResilientJitsiMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiInstanceRef = useRef<any>(null);
  const onApiReadyRef = useRef(onApiReady);
  const [mode, setMode] = useState<'loading' | 'api' | 'iframe'>('loading');

  useEffect(() => {
    onApiReadyRef.current = onApiReady;
  }, [onApiReady]);

  // Load External API and create Jitsi instance
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Try to load the External API
      const JitsiMeetExternalAPI = await loadJitsiApi();

      if (cancelled) return;

      if (!JitsiMeetExternalAPI || !containerRef.current) {
        console.warn('📞 [JITSI] External API unavailable, falling back to iframe');
        setMode('iframe');
        return;
      }

      try {
        console.log('📞 [JITSI] Creating External API instance for room:', roomName);

        const api = new JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName,
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            prejoinConfig: { enabled: false },
            startWithAudioMuted: startWithAudioMuted,
            startWithVideoMuted: startWithVideoMuted,
            disableDeepLinking: true,
            enableClosePage: false,
            enableWelcomePage: false,
            enableInsecureRoomNameWarning: false,
            hideConferenceSubject: true,
            disableInviteFunctions: true,
            // Lobby bypass
            lobby: { autoKnock: true, enabled: false },
            membersOnly: false,
            requireDisplayName: false,
            // Audio quality
            disableAudioLevels: false,
            enableNoAudioDetection: true,
            enableNoisyMicDetection: true,
            audioQuality: { stereo: false, opusMaxAverageBitrate: 32000 },
            // P2P for direct audio
            p2p: {
              enabled: true,
              useStunTurn: true,
              stunServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            },
            channelLastN: -1,
            enableLayerSuspension: true,
            // Security bypass
            security: { lobbyEnabled: false, requireLobby: false },
            ...configOverwrite,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            MOBILE_APP_PROMO: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            HIDE_INVITE_MORE_HEADER: true,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            ...interfaceConfigOverwrite,
          },
        });

        if (cancelled) {
          api.dispose();
          return;
        }

        apiInstanceRef.current = api;
        setMode('api');

        // Notify parent that API is ready
        console.log('📞 [JITSI] ✅ External API instance created successfully');
        onApiReadyRef.current?.(api);

        // Listen for key events
        api.addListener('videoConferenceJoined', () => {
          console.log('📞 [JITSI] ✅ Successfully joined conference in room:', roomName);
        });

        api.addListener('audioMuteStatusChanged', (data: any) => {
          console.log('📞 [JITSI] Audio mute changed:', data);
        });

        api.addListener('readyToClose', () => {
          console.log('📞 [JITSI] Meeting ready to close');
        });

      } catch (err) {
        console.error('📞 [JITSI] Failed to create External API instance:', err);
        if (!cancelled) {
          setMode('iframe');
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (apiInstanceRef.current) {
        try {
          apiInstanceRef.current.dispose();
        } catch (e) {
          console.warn('📞 [JITSI] Dispose error (safe to ignore):', e);
        }
        apiInstanceRef.current = null;
      }
    };
    // Only re-run if room or display name changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, displayName]);

  // Fallback iframe URL (only used if External API fails)
  const iframeUrl = `https://${JITSI_DOMAIN}/${roomName}#config.prejoinPageEnabled=false&config.startWithAudioMuted=${startWithAudioMuted}&config.startWithVideoMuted=${startWithVideoMuted}&config.disableDeepLinking=true&config.enableWelcomePage=false&userInfo.displayName=${encodeURIComponent(displayName)}`;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        ...style,
      }}
      className={className}
    >
      {mode === 'loading' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: '#fff',
          background: '#1a1a2e',
          fontSize: '16px',
        }}>
          Loading call...
        </div>
      )}
      {mode === 'iframe' && (
        <iframe
          src={iframeUrl}
          allow="camera; microphone; display-capture; autoplay"
          allowFullScreen
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          onLoad={() => {
            console.log('📞 [JITSI] ✅ Fallback iframe loaded for room:', roomName);
            onApiReadyRef.current?.(null);
          }}
        />
      )}
      {/* When mode === 'api', the External API creates its own iframe inside containerRef */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if stable props change
  return (
    prevProps.roomName === nextProps.roomName &&
    prevProps.displayName === nextProps.displayName &&
    prevProps.startWithVideoMuted === nextProps.startWithVideoMuted &&
    prevProps.startWithAudioMuted === nextProps.startWithAudioMuted
  );
});

export default ResilientJitsiMeeting;
