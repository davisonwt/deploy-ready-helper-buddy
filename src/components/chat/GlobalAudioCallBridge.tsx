import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCallManager } from '@/hooks/useCallManager';
import { useSimpleWebRTC } from '@/hooks/useSimpleWebRTC';
import { useLocation } from 'react-router-dom';

// Mounts hidden audio elements whenever a call is active so audio works on any route
const GlobalAudioCallBridge: React.FC = () => {
  const { user } = useAuth();
  const { currentCall } = useCallManager();
  const location = useLocation();

  // Only establish WebRTC for active, answered calls and when not on native call UIs
  const activeCall = currentCall;
  const onCallUIPages = location.pathname.startsWith('/chatapp');

  // CRITICAL: Hooks must be called unconditionally - call hook first, then check if we should render
  const { localAudioRef, remoteAudioRef } = useSimpleWebRTC(activeCall, user);

  useEffect(() => {
    if (activeCall && !onCallUIPages) {
      console.log('🔈 [GlobalAudioCallBridge] Active call detected outside call UI, mounting hidden audio');
    }
  }, [activeCall?.id, onCallUIPages]);

  if (!user || !activeCall || onCallUIPages) return null;

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
