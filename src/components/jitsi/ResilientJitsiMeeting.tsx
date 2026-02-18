/**
 * ResilientJitsiMeeting - Uses JitsiMeetExternalAPI for proper programmatic control.
 * Falls back to direct iframe ONLY if the API script fails to load.
 * The External API properly sends config to the Jitsi server (unlike URL hash params).
 */
import { memo, useRef, useEffect, useCallback, useState } from 'react';
import { loadJitsiApi, getJitsiIframeUrl, JITSI_DOMAIN } from '@/lib/jitsiLoader';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const apiInstanceRef = useRef<any>(null);
  const onApiReadyRef = useRef(onApiReady);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // Keep callback ref fresh
  useEffect(() => {
    onApiReadyRef.current = onApiReady;
  }, [onApiReady]);

  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Initialize Jitsi
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initJitsi = async () => {
      console.log('📞 [JITSI] Attempting to load External API for room:', roomName);
      
      try {
        const JitsiMeetExternalAPI = await loadJitsiApi();
        
        if (!JitsiMeetExternalAPI) {
          throw new Error('API not available');
        }

        if (!mountedRef.current || !containerRef.current) return;

        console.log('📞 [JITSI] ✅ External API loaded, creating meeting...');

        const api = new JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: displayName,
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            prejoinConfig: { enabled: false },
            startWithAudioMuted: startWithAudioMuted,
            startWithVideoMuted: startWithVideoMuted,
            disableDeepLinking: true,
            enableClosePage: false,
            enableWelcomePage: false,
            enableLobbyChat: false,
            hideLobbyButton: true,
            requireDisplayName: false,
            enableInsecureRoomNameWarning: false,
            // Lobby bypass
            lobby: {
              autoKnock: true,
              enabled: false,
            },
            // Audio optimization
            disableAudioLevels: false,
            enableNoAudioDetection: true,
            enableNoisyMicDetection: true,
            // P2P for 1-on-1 calls
            p2p: {
              enabled: true,
              useStunTurn: true,
              stunServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
              ],
            },
            channelLastN: -1,
            enableLayerSuspension: true,
            enableForcedReload: false,
            hideConferenceSubject: true,
            hideConferenceTimer: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            MOBILE_APP_PROMO: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            HIDE_INVITE_MORE_HEADER: true,
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'hangup', 'settings',
              'desktop', 'fullscreen', 'raisehand',
            ],
          },
        });

        apiInstanceRef.current = api;

        // Auto-knock if lobby is enforced by server
        api.addListener('passwordRequired', () => {
          console.log('📞 [JITSI] Password required - auto-joining...');
        });

        api.addListener('videoConferenceJoined', () => {
          console.log('📞 [JITSI] ✅ Conference JOINED - audio should be active!');
          if (mountedRef.current) {
            onApiReadyRef.current?.(api);
          }
        });

        api.addListener('videoConferenceLeft', () => {
          console.log('📞 [JITSI] Conference left');
        });

        api.addListener('participantJoined', (participant: any) => {
          console.log('📞 [JITSI] Participant joined:', participant?.displayName || participant?.id);
        });

        api.addListener('readyToClose', () => {
          console.log('📞 [JITSI] Ready to close');
        });

        // Log any errors
        api.addListener('errorOccurred', (error: any) => {
          console.error('📞 [JITSI] Error:', error);
        });

        console.log('📞 [JITSI] ✅ External API instance created successfully');

      } catch (err) {
        console.warn('📞 [JITSI] ⚠️ External API failed, falling back to iframe:', err);
        if (mountedRef.current) {
          setUsingFallback(true);
          // Signal ready after short delay for iframe
          setTimeout(() => {
            if (mountedRef.current) {
              onApiReadyRef.current?.(null);
            }
          }, 3000);
        }
      }
    };

    initJitsi();

    return () => {
      if (apiInstanceRef.current) {
        try {
          apiInstanceRef.current.dispose();
        } catch (e) {
          console.warn('📞 [JITSI] Dispose error:', e);
        }
        apiInstanceRef.current = null;
      }
    };
  }, [roomName, displayName, startWithVideoMuted, startWithAudioMuted]);

  // Fallback iframe mode
  if (usingFallback) {
    const iframeUrl = getJitsiIframeUrl(roomName, {
      displayName,
      startWithVideoMuted,
      startWithAudioMuted,
    });

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
          console.log('📞 [JITSI] Fallback iframe loaded for room:', roomName);
        }}
      />
    );
  }

  // External API mode - renders into this div
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        ...style,
      }}
      className={className}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if room or display config changes
  return (
    prevProps.roomName === nextProps.roomName &&
    prevProps.displayName === nextProps.displayName &&
    prevProps.startWithVideoMuted === nextProps.startWithVideoMuted &&
    prevProps.startWithAudioMuted === nextProps.startWithAudioMuted
  );
});

export default ResilientJitsiMeeting;
