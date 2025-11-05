import { useEffect, FC } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCallManager } from '@/hooks/useCallManager';
import { useSimpleWebRTC } from '@/hooks/useSimpleWebRTC';
import { useLocation } from 'react-router-dom';

// Mounts hidden audio elements whenever a call is active so audio works on any route
const GlobalAudioCallBridge: FC = () => {
  const { user } = useAuth();
  const { currentCall } = useCallManager();
  const location = useLocation();

  // On chatapp pages, CallInterface handles WebRTC directly - don't duplicate
  const shouldInitWebRTC = !location.pathname.startsWith('/chatapp') && !!currentCall && !!user;
  
  // CRITICAL: Hooks must be called unconditionally
  const { localAudioRef, remoteAudioRef } = useSimpleWebRTC(
    shouldInitWebRTC ? currentCall : null, 
    user
  );

  useEffect(() => {
    if (shouldInitWebRTC && currentCall) {
      console.log('🔈 [GlobalAudioCallBridge] Active call detected outside chatapp, mounting hidden audio');
    }
  }, [currentCall?.id, shouldInitWebRTC]);

  if (!shouldInitWebRTC) return null;

  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      {/* Keep elements in DOM (not display:none) so some browsers don't block playback */}
      <audio
        ref={localAudioRef}
        muted
        autoPlay
        playsInline
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      />
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        preload="auto"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
        onPlay={() => console.log('🔊 [GlobalAudioCallBridge] Remote audio playing')}
      />
    </div>
  );
};

export default GlobalAudioCallBridge;
