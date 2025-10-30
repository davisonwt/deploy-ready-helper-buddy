import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCallManager } from '@/hooks/useCallManager';
import { useSimpleWebRTC } from '@/hooks/useSimpleWebRTC';

// Mounts hidden audio elements whenever a call is active so audio works on any route
const GlobalAudioCallBridge: React.FC = () => {
  const { user } = useAuth();
  const { currentCall } = useCallManager();

  // Only establish WebRTC for active, answered calls
  const activeCall = currentCall;

  useEffect(() => {
    if (activeCall) {
      console.log('🔈 [GlobalAudioCallBridge] Active call detected, mounting hidden audio');
    }
  }, [activeCall?.id]);

  if (!user || !activeCall) return null;

  const { localAudioRef, remoteAudioRef } = useSimpleWebRTC(activeCall, user);

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
