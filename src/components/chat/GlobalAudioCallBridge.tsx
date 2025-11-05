import { FC, useEffect } from 'react';

// Passive global audio bridge: renders hidden audio tags that WebRTC hooks can target
// Does NOT create any WebRTC connections. The hooks (e.g. useSimpleWebRTC) will
// attach MediaStreams to these elements by ID and call play() when available.
const GlobalAudioCallBridge: FC = () => {
  useEffect(() => {
    const unlockAndPlay = () => {
      try {
        // Create/resume a single global AudioContext to satisfy iOS autoplay policy
        const w = window as any;
        if (!w.__unlockedAudioCtx) {
          w.__unlockedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx: AudioContext = w.__unlockedAudioCtx;
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      } catch {}

      const remote = document.getElementById('global-remote-audio') as HTMLAudioElement | null;
      if (remote) {
        remote.muted = false;
        remote.volume = 1.0;
        remote.play().catch(() => {});
      }
    };

    // Help unlock autoplay on first user interaction and common gestures
    window.addEventListener('click', unlockAndPlay, { once: true });
    window.addEventListener('touchstart', unlockAndPlay, { once: true });
    window.addEventListener('keydown', unlockAndPlay, { once: true });

    const onVisibility = () => {
      // If user returns to tab and audio paused, try again
      if (document.visibilityState === 'visible') unlockAndPlay();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('click', unlockAndPlay);
      window.removeEventListener('touchstart', unlockAndPlay);
      window.removeEventListener('keydown', unlockAndPlay);
      document.removeEventListener('visibilitychange', onVisibility);
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
