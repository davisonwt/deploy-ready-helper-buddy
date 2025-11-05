import { FC, useEffect } from 'react';

// Passive global audio bridge: renders hidden audio tags that WebRTC hooks can target
// Does NOT create any WebRTC connections. The hooks (e.g. useSimpleWebRTC) will
// attach MediaStreams to these elements by ID and call play() when available.
const GlobalAudioCallBridge: FC = () => {
  useEffect(() => {
    const onGesture = () => {
      const remote = document.getElementById('global-remote-audio') as HTMLAudioElement | null;
      if (remote) {
        remote.muted = false;
        remote.volume = 1.0;
        remote.play().catch(() => {});
      }
    };

    // Help unlock autoplay on first user interaction
    window.addEventListener('click', onGesture, { once: true });
    window.addEventListener('touchstart', onGesture, { once: true });
    return () => {
      window.removeEventListener('click', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden' }} aria-hidden>
      {/* Local (muted) */}
      <audio
        id="global-local-audio"
        autoPlay
        playsInline
        muted
      />
      {/* Remote (audible) */}
      <audio
        id="global-remote-audio"
        autoPlay
        playsInline
      />
    </div>
  );
};

export default GlobalAudioCallBridge;
