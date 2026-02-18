/**
 * ResilientJitsiMeeting - Custom wrapper that handles script loading failures
 * with retries and falls back to a direct iframe when the API can't load.
 * Replaces @jitsi/react-sdk's JitsiMeeting which caches failed loads forever.
 */
import { useEffect, useRef, useState, useCallback, memo } from 'react';
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
  configOverwrite = {},
  interfaceConfigOverwrite = {},
  startWithVideoMuted = false,
  startWithAudioMuted = false,
  onApiReady,
  onLoadFailure,
  style,
  className,
}: ResilientJitsiMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [mode, setMode] = useState<'loading' | 'api' | 'iframe' | 'error'>('loading');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let disposed = false;

    const init = async () => {
      const JitsiAPI = await loadJitsiApi();

      if (disposed || !mountedRef.current) return;

      if (JitsiAPI && containerRef.current) {
        try {
          // Clear the container
          containerRef.current.innerHTML = '';

          const api = new JitsiAPI(JITSI_DOMAIN, {
            roomName,
            parentNode: containerRef.current,
            configOverwrite: {
              prejoinPageEnabled: false,
              disableDeepLinking: true,
              enableClosePage: false,
              startWithVideoMuted,
              startWithAudioMuted,
              ...configOverwrite,
            },
            interfaceConfigOverwrite: {
              SHOW_JITSI_WATERMARK: false,
              MOBILE_APP_PROMO: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              ...interfaceConfigOverwrite,
            },
            userInfo: { displayName, email: '' },
          });

          apiRef.current = api;
          setMode('api');
          console.log('✅ [JITSI] Meeting created via API');
          onApiReady?.(api);
        } catch (err) {
          console.error('❌ [JITSI] API instantiation failed:', err);
          setMode('iframe');
          onLoadFailure?.();
        }
      } else {
        // Script couldn't load — fall back to direct iframe
        console.warn('⚠️ [JITSI] Falling back to iframe mode');
        setMode('iframe');
        onLoadFailure?.();
      }
    };

    init();

    return () => {
      disposed = true;
      mountedRef.current = false;
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch {}
        apiRef.current = null;
      }
    };
  }, [roomName]); // Only re-init if room changes

  if (mode === 'iframe') {
    const iframeUrl = getJitsiIframeUrl(roomName, {
      displayName,
      startWithVideoMuted,
      startWithAudioMuted,
    });

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
      />
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }} className={className}>
      {mode === 'loading' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});

export default ResilientJitsiMeeting;
