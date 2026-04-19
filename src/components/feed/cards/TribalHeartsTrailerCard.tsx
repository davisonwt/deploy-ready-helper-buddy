import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Play, Pause, Volume2, VolumeX, UserPlus } from 'lucide-react';

/**
 * Featured trailer card for Tribal Hearts — the safe, agent-powered dating
 * haven inside Sow2Grow. Manual play/pause only with inline audio.
 */
export const TribalHeartsTrailerCard: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;

    try {
      if (v.paused || v.ended) {
        v.currentTime = v.ended ? 0 : v.currentTime;
        await v.play();
        setPlaying(true);
      } else {
        v.pause();
        setPlaying(false);
      }
    } catch (error) {
      console.error('Failed to toggle trailer playback:', error);
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
        <h2 className="text-sm font-bold text-foreground">Tribal Hearts — Safe Tribal Dating</h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-500 font-semibold">NEW</span>
      </div>
      <div className="relative rounded-xl overflow-hidden bg-card border border-border shadow-sm">
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            src="/videos/tribal-hearts-trailer.mp4"
            muted={muted}
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="p-3 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Where love grows naturally inside the tribe — agent-powered, in-house ChatApp, no PII shared.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 transition"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <Link
              to="/tribal-hearts"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-pink-500 text-white text-xs font-semibold hover:bg-pink-600 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
