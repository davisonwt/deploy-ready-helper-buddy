import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Play, Pause, UserPlus } from 'lucide-react';

/**
 * Featured trailer card for Tribal Hearts — the safe, agent-powered dating
 * haven inside Sow2Grow. Single play/pause toggle button with native audio.
 */
export const TribalHeartsTrailerCard: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;

    try {
      if (v.paused || v.ended) {
        if (v.ended) v.currentTime = 0;
        v.muted = false;
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
            src="/videos/tribal-hearts-trailer-v7.mp4"
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
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
